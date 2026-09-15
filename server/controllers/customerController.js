const db = require('../config/database');
const AccountingService = require('../services/accountingService');
const AuditService = require('../services/auditService');

class CustomerController {
  static getCustomers(req, res) {
    try {
      const { search, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT c.*,
               COUNT(DISTINCT s.id) as total_orders,
               COALESCE(SUM(s.total_amount), 0) as lifetime_sales
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'voided'
        WHERE c.business_id = ? AND c.is_active = 1
      `;
      const params = [req.business.id];

      if (search) {
        sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      sql += ` GROUP BY c.id ORDER BY c.name ASC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const customers = db.prepare(sql).all(...params);
      return res.json({ success: true, customers });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch customers: ' + err.message });
    }
  }

  static getCustomerById(req, res) {
    try {
      const { id } = req.params;
      const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found.' });
      }

      const sales = db.prepare(`
        SELECT id, invoice_number, total_amount, paid_amount, balance_amount, payment_status, sale_date
        FROM sales
        WHERE customer_id = ? AND business_id = ?
        ORDER BY sale_date DESC
        LIMIT 25
      `).all(id, req.business.id);

      const payments = db.prepare(`
        SELECT * FROM payments
        WHERE entity_type = 'customer' AND entity_id = ? AND business_id = ?
        ORDER BY payment_date DESC
        LIMIT 25
      `).all(id, req.business.id);

      return res.json({ success: true, customer, sales, payments });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch customer details: ' + err.message });
    }
  }

  static createCustomer(req, res) {
    try {
      const { name, phone, email, address } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Customer name is required.' });
      }

      const result = db.prepare(`
        INSERT INTO customers (business_id, name, phone, email, address)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.business.id, name.trim(), phone ? phone.trim() : null, email ? email.trim() : null, address ? address.trim() : null);

      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'CREATE_CUSTOMER',
        entity: 'CUSTOMER',
        entityId: customer.id,
        newValues: req.body,
        ipAddress: req.ip
      });

      return res.status(201).json({ success: true, message: 'Customer created.', customer });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to create customer: ' + err.message });
    }
  }

  static updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const { name, phone, email, address } = req.body;

      const current = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!current) {
        return res.status(404).json({ success: false, error: 'Customer not found.' });
      }

      db.prepare(`
        UPDATE customers
        SET name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            address = COALESCE(?, address)
        WHERE id = ? AND business_id = ?
      `).run(name ? name.trim() : null, phone, email, address, id, req.business.id);

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'UPDATE_CUSTOMER',
        entity: 'CUSTOMER',
        entityId: id,
        oldValues: current,
        newValues: req.body,
        ipAddress: req.ip
      });

      const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      return res.json({ success: true, message: 'Customer updated.', customer: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update customer: ' + err.message });
    }
  }

  static recordPayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, payment_method = 'cash', reference, notes } = req.body;

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid payment amount is required.' });
      }

      const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found.' });
      }

      const cashAccount = AccountingService.getPaymentAccountCode(payment_method);

      db.transaction(() => {
        // 1. Reduce customer outstanding balance
        db.prepare(`
          UPDATE customers
          SET outstanding_balance = MAX(0, outstanding_balance - ?)
          WHERE id = ? AND business_id = ?
        `).run(paymentAmount, id, req.business.id);

        // 2. Also settle unpaid or partial sales FIFO
        let remainingToApply = paymentAmount;
        const unpaidSales = db.prepare(`
          SELECT id, balance_amount, paid_amount, total_amount
          FROM sales
          WHERE customer_id = ? AND business_id = ? AND payment_status != 'paid' AND status != 'voided'
          ORDER BY sale_date ASC
        `).all(id, req.business.id);

        for (const sale of unpaidSales) {
          if (remainingToApply <= 0) break;
          const apply = Math.min(sale.balance_amount, remainingToApply);
          const newBal = sale.balance_amount - apply;
          const newPaid = sale.paid_amount + apply;
          const newStatus = newBal <= 0 ? 'paid' : 'partial';

          db.prepare(`
            UPDATE sales
            SET balance_amount = ?, paid_amount = ?, payment_status = ?
            WHERE id = ?
          `).run(newBal, newPaid, newStatus, sale.id);

          remainingToApply -= apply;
        }

        // 3. Record in payments table
        const resPay = db.prepare(`
          INSERT INTO payments (
            business_id, user_id, payment_type, entity_type, entity_id,
            reference_type, amount, payment_method, payment_account_code, notes
          ) VALUES (?, ?, 'customer_debt', 'customer', ?, 'none', ?, ?, ?, ?)
        `).run(
          req.business.id,
          req.user.id,
          id,
          paymentAmount,
          payment_method,
          cashAccount,
          notes ? `Debt payment: ${notes}` : `Debt settlement by ${customer.name}`
        );

        // 4. Double-entry accounting entry:
        // Dr Cash/Bank/POS (paymentAmount)
        // Cr Accounts Receivable 1100 (paymentAmount)
        AccountingService.recordJournalEntry({
          businessId: req.business.id,
          referenceType: 'customer_payment',
          referenceId: resPay.lastInsertRowid,
          description: `Customer payment received from ${customer.name}`,
          userId: req.user.id,
          lines: [
            { accountCode: cashAccount, debit: paymentAmount, credit: 0, description: `Cash received from ${customer.name}` },
            { accountCode: '1100', debit: 0, credit: paymentAmount, description: `Accounts receivable settled for ${customer.name}` }
          ]
        });

        // 5. Audit log
        AuditService.log({
          businessId: req.business.id,
          userId: req.user.id,
          action: 'CUSTOMER_PAYMENT',
          entity: 'CUSTOMER',
          entityId: id,
          newValues: { customerName: customer.name, amount: paymentAmount, payment_method },
          ipAddress: req.ip
        });
      })();

      const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      return res.json({
        success: true,
        message: `Recorded payment of ${req.business.currencySymbol}${paymentAmount.toLocaleString()} for ${customer.name}.`,
        customer: updatedCustomer
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to record customer payment: ' + err.message });
    }
  }
}

module.exports = CustomerController;
