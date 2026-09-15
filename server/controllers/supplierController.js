const db = require('../config/database');
const AccountingService = require('../services/accountingService');
const AuditService = require('../services/auditService');

class SupplierController {
  static getSuppliers(req, res) {
    try {
      const { search, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT s.*,
               COUNT(DISTINCT p.id) as total_purchases,
               COALESCE(SUM(p.total_amount), 0) as lifetime_spent
        FROM suppliers s
        LEFT JOIN purchases p ON s.id = p.supplier_id AND p.status != 'voided'
        WHERE s.business_id = ? AND s.is_active = 1
      `;
      const params = [req.business.id];

      if (search) {
        sql += ` AND (s.name LIKE ? OR s.contact_person LIKE ? OR s.phone LIKE ?)`;
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      sql += ` GROUP BY s.id ORDER BY s.name ASC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const suppliers = db.prepare(sql).all(...params);
      return res.json({ success: true, suppliers });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch suppliers: ' + err.message });
    }
  }

  static getSupplierById(req, res) {
    try {
      const { id } = req.params;
      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found.' });
      }

      const purchases = db.prepare(`
        SELECT id, purchase_number, total_amount, paid_amount, balance_amount, payment_status, purchase_date
        FROM purchases
        WHERE supplier_id = ? AND business_id = ?
        ORDER BY purchase_date DESC
        LIMIT 25
      `).all(id, req.business.id);

      const payments = db.prepare(`
        SELECT * FROM payments
        WHERE entity_type = 'supplier' AND entity_id = ? AND business_id = ?
        ORDER BY payment_date DESC
        LIMIT 25
      `).all(id, req.business.id);

      return res.json({ success: true, supplier, purchases, payments });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch supplier details: ' + err.message });
    }
  }

  static createSupplier(req, res) {
    try {
      const { name, contact_person, phone, email, address } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Supplier name is required.' });
      }

      const result = db.prepare(`
        INSERT INTO suppliers (business_id, name, contact_person, phone, email, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        req.business.id,
        name.trim(),
        contact_person ? contact_person.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        address ? address.trim() : null
      );

      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'CREATE_SUPPLIER',
        entity: 'SUPPLIER',
        entityId: supplier.id,
        newValues: req.body,
        ipAddress: req.ip
      });

      return res.status(201).json({ success: true, message: 'Supplier created.', supplier });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to create supplier: ' + err.message });
    }
  }

  static updateSupplier(req, res) {
    try {
      const { id } = req.params;
      const { name, contact_person, phone, email, address } = req.body;

      const current = db.prepare('SELECT * FROM suppliers WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!current) {
        return res.status(404).json({ success: false, error: 'Supplier not found.' });
      }

      db.prepare(`
        UPDATE suppliers
        SET name = COALESCE(?, name),
            contact_person = COALESCE(?, contact_person),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            address = COALESCE(?, address)
        WHERE id = ? AND business_id = ?
      `).run(name ? name.trim() : null, contact_person, phone, email, address, id, req.business.id);

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'UPDATE_SUPPLIER',
        entity: 'SUPPLIER',
        entityId: id,
        oldValues: current,
        newValues: req.body,
        ipAddress: req.ip
      });

      const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
      return res.json({ success: true, message: 'Supplier updated.', supplier: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update supplier: ' + err.message });
    }
  }

  static recordPayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, payment_method = 'bank_transfer', reference, notes } = req.body;

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid payment amount is required.' });
      }

      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found.' });
      }

      const cashAccount = AccountingService.getPaymentAccountCode(payment_method);

      db.transaction(() => {
        // 1. Reduce supplier outstanding balance
        db.prepare(`
          UPDATE suppliers
          SET outstanding_balance = MAX(0, outstanding_balance - ?)
          WHERE id = ? AND business_id = ?
        `).run(paymentAmount, id, req.business.id);

        // 2. Also settle unpaid purchases FIFO
        let remainingToApply = paymentAmount;
        const unpaidPurchases = db.prepare(`
          SELECT id, balance_amount, paid_amount, total_amount
          FROM purchases
          WHERE supplier_id = ? AND business_id = ? AND payment_status != 'paid' AND status != 'voided'
          ORDER BY purchase_date ASC
        `).all(id, req.business.id);

        for (const p of unpaidPurchases) {
          if (remainingToApply <= 0) break;
          const apply = Math.min(p.balance_amount, remainingToApply);
          const newBal = p.balance_amount - apply;
          const newPaid = p.paid_amount + apply;
          const newStatus = newBal <= 0 ? 'paid' : 'partial';

          db.prepare(`
            UPDATE purchases
            SET balance_amount = ?, paid_amount = ?, payment_status = ?
            WHERE id = ?
          `).run(newBal, newPaid, newStatus, p.id);

          remainingToApply -= apply;
        }

        // 3. Record in payments table
        const resPay = db.prepare(`
          INSERT INTO payments (
            business_id, user_id, payment_type, entity_type, entity_id,
            reference_type, amount, payment_method, payment_account_code, notes
          ) VALUES (?, ?, 'supplier_debt', 'supplier', ?, 'none', ?, ?, ?, ?)
        `).run(
          req.business.id,
          req.user.id,
          id,
          paymentAmount,
          payment_method,
          cashAccount,
          notes ? `Supplier debt payment: ${notes}` : `Payment to supplier ${supplier.name}`
        );

        // 4. Double-entry accounting entry:
        // Dr Accounts Payable 2010 (paymentAmount)
        // Cr Cash/Bank/POS (paymentAmount)
        AccountingService.recordJournalEntry({
          businessId: req.business.id,
          referenceType: 'supplier_payment',
          referenceId: resPay.lastInsertRowid,
          description: `Supplier payment to ${supplier.name}`,
          userId: req.user.id,
          lines: [
            { accountCode: '2010', debit: paymentAmount, credit: 0, description: `Accounts payable settled to ${supplier.name}` },
            { accountCode: cashAccount, debit: 0, credit: paymentAmount, description: `Cash paid to ${supplier.name}` }
          ]
        });

        // 5. Audit log
        AuditService.log({
          businessId: req.business.id,
          userId: req.user.id,
          action: 'SUPPLIER_PAYMENT',
          entity: 'SUPPLIER',
          entityId: id,
          newValues: { supplierName: supplier.name, amount: paymentAmount, payment_method },
          ipAddress: req.ip
        });
      })();

      const updatedSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
      return res.json({
        success: true,
        message: `Recorded payment of ${req.business.currencySymbol}${paymentAmount.toLocaleString()} to ${supplier.name}.`,
        supplier: updatedSupplier
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to record supplier payment: ' + err.message });
    }
  }
}

module.exports = SupplierController;
