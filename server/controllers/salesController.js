const db = require('../config/database');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');
const AuditService = require('../services/auditService');

class SalesController {
  static generateInvoiceNumber(businessId) {
    const count = db.prepare('SELECT COUNT(*) as count FROM sales WHERE business_id = ?').get(businessId).count;
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  static getSales(req, res) {
    try {
      const { search, customer_id, payment_status, start_date, end_date, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as cashier_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.business_id = ?
      `;
      const params = [req.business.id];

      if (search) {
        sql += ` AND (s.invoice_number LIKE ? OR c.name LIKE ?)`;
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      if (customer_id) {
        sql += ` AND s.customer_id = ?`;
        params.push(customer_id);
      }

      if (payment_status) {
        sql += ` AND s.payment_status = ?`;
        params.push(payment_status);
      }

      if (start_date) {
        sql += ` AND s.sale_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND s.sale_date <= ?`;
        params.push(end_date + ' 23:59:59');
      }

      sql += ` ORDER BY s.sale_date DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const sales = db.prepare(sql).all(...params);

      return res.json({ success: true, sales });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch sales: ' + err.message });
    }
  }

  static getSaleById(req, res) {
    try {
      const { id } = req.params;
      const sale = db.prepare(`
        SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
               c.address as customer_address, u.full_name as cashier_name,
               b.name as business_name, b.phone as business_phone, b.email as business_email,
               b.address as business_address, b.currency, b.currency_symbol, b.logo_url
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        JOIN businesses b ON s.business_id = b.id
        WHERE s.id = ? AND s.business_id = ?
      `).get(id, req.business.id);

      if (!sale) {
        return res.status(404).json({ success: false, error: 'Sale record not found.' });
      }

      const items = db.prepare(`
        SELECT si.*, p.name as product_name, p.sku, p.unit
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(id);

      const payments = db.prepare(`
        SELECT * FROM payments
        WHERE reference_type = 'sale' AND reference_id = ? AND business_id = ?
        ORDER BY payment_date ASC
      `).all(id, req.business.id);

      return res.json({ success: true, sale, items, payments });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch sale details: ' + err.message });
    }
  }

  static createSale(req, res) {
    try {
      const {
        customer_id,
        items, // Array of { product_id, quantity, unit_price }
        discount = 0,
        tax = 0,
        paid_amount = 0,
        payment_method = 'cash',
        notes
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one sale item is required.' });
      }

      // Resolve customer (default to Walk-in customer if not specified)
      let resolvedCustomerId = customer_id;
      if (!resolvedCustomerId) {
        const defaultCust = db.prepare('SELECT id FROM customers WHERE business_id = ? AND is_default = 1').get(req.business.id);
        if (defaultCust) {
          resolvedCustomerId = defaultCust.id;
        }
      }

      // Validate items and compute totals
      let subtotal = 0;
      let totalCostOfGoods = 0;
      const validatedItems = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(item.product_id, req.business.id);
        if (!product || !product.is_active) {
          return res.status(400).json({ success: false, error: `Product ID ${item.product_id} is invalid or inactive.` });
        }

        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({ success: false, error: `Invalid quantity for product ${product.name}.` });
        }

        // Check stock
        if (product.current_stock < qty && !req.business.allowNegativeStock) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for "${product.name}". Available: ${product.current_stock}, requested: ${qty}`
          });
        }

        const unitPrice = item.unit_price !== undefined ? Number(item.unit_price) : Number(product.selling_price);
        const unitCost = Number(product.cost_price) || 0;
        const lineTotal = Math.round(qty * unitPrice * 100) / 100;
        const lineCost = Math.round(qty * unitCost * 100) / 100;

        subtotal += lineTotal;
        totalCostOfGoods += lineCost;

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice,
          unitCost,
          totalPrice: lineTotal,
          totalCost: lineCost
        });
      }

      subtotal = Math.round(subtotal * 100) / 100;
      const discountNum = Math.min(subtotal, Math.max(0, Number(discount) || 0));
      const taxNum = Math.max(0, Number(tax) || 0);
      const totalAmount = Math.round((subtotal - discountNum + taxNum) * 100) / 100;

      let paidNum = Math.max(0, Number(paid_amount) || 0);
      if (paidNum > totalAmount) {
        paidNum = totalAmount; // Cannot overpay on invoice
      }
      const balanceAmount = Math.round((totalAmount - paidNum) * 100) / 100;

      let paymentStatus = 'paid';
      if (balanceAmount > 0 && paidNum > 0) {
        paymentStatus = 'partial';
      } else if (balanceAmount === totalAmount) {
        paymentStatus = 'unpaid';
      }

      const invoiceNumber = SalesController.generateInvoiceNumber(req.business.id);

      let saleId;

      db.transaction(() => {
        // 1. Insert sale record
        const insertSale = db.prepare(`
          INSERT INTO sales (
            business_id, invoice_number, customer_id, user_id, subtotal,
            discount, tax, total_amount, paid_amount, balance_amount,
            payment_status, payment_method, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const resSale = insertSale.run(
          req.business.id,
          invoiceNumber,
          resolvedCustomerId,
          req.user.id,
          subtotal,
          discountNum,
          taxNum,
          totalAmount,
          paidNum,
          balanceAmount,
          paymentStatus,
          payment_method,
          notes || null
        );

        saleId = resSale.lastInsertRowid;

        // 2. Insert items and deduct stock
        const insertItem = db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_cost, total_price, total_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const itm of validatedItems) {
          insertItem.run(saleId, itm.productId, itm.quantity, itm.unitPrice, itm.unitCost, itm.totalPrice, itm.totalCost);

          // Deduct stock via inventory service
          InventoryService.recordMovement({
            businessId: req.business.id,
            productId: itm.productId,
            transactionType: 'sale',
            quantity: -itm.quantity,
            unitCost: itm.unitCost,
            referenceType: 'sale',
            referenceId: saleId,
            notes: `Sale ${invoiceNumber}`,
            userId: req.user.id
          });
        }

        // 3. Update customer outstanding balance if credit/partial
        if (balanceAmount > 0 && resolvedCustomerId) {
          db.prepare(`
            UPDATE customers
            SET outstanding_balance = outstanding_balance + ?
            WHERE id = ? AND business_id = ?
          `).run(balanceAmount, resolvedCustomerId, req.business.id);
        }

        // 4. Record payment if paid_amount > 0
        if (paidNum > 0) {
          const paymentAccount = AccountingService.getPaymentAccountCode(payment_method);
          db.prepare(`
            INSERT INTO payments (
              business_id, user_id, payment_type, entity_type, entity_id,
              reference_type, reference_id, amount, payment_method, payment_account_code, notes
            ) VALUES (?, ?, 'customer_sale', 'customer', ?, 'sale', ?, ?, ?, ?, ?)
          `).run(
            req.business.id,
            req.user.id,
            resolvedCustomerId,
            saleId,
            paidNum,
            payment_method,
            paymentAccount,
            `Payment for invoice ${invoiceNumber}`
          );
        }

        // 5. Double-entry accounting journal entry
        // Entry 1: Revenue and Cash/Receivable
        const journalLines = [];
        if (paidNum > 0) {
          const cashAccount = AccountingService.getPaymentAccountCode(payment_method);
          journalLines.push({ accountCode: cashAccount, debit: paidNum, credit: 0, description: `Cash received for ${invoiceNumber}` });
        }
        if (balanceAmount > 0) {
          journalLines.push({ accountCode: '1100', debit: balanceAmount, credit: 0, description: `Receivable for ${invoiceNumber}` });
        }
        journalLines.push({ accountCode: '4010', debit: 0, credit: totalAmount, description: `Sales revenue for ${invoiceNumber}` });

        // Entry 2: COGS and Inventory Asset
        if (totalCostOfGoods > 0) {
          journalLines.push({ accountCode: '5010', debit: totalCostOfGoods, credit: 0, description: `COGS for ${invoiceNumber}` });
          journalLines.push({ accountCode: '1200', debit: 0, credit: totalCostOfGoods, description: `Inventory reduction for ${invoiceNumber}` });
        }

        AccountingService.recordJournalEntry({
          businessId: req.business.id,
          referenceType: 'sale',
          referenceId: saleId,
          description: `Sale ${invoiceNumber}`,
          userId: req.user.id,
          lines: journalLines
        });

        // 6. Audit log
        AuditService.log({
          businessId: req.business.id,
          userId: req.user.id,
          action: 'CREATE_SALE',
          entity: 'SALE',
          entityId: saleId,
          newValues: { invoiceNumber, totalAmount, paidAmount: paidNum, itemsCount: validatedItems.length },
          ipAddress: req.ip
        });
      })();

      const completeSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      return res.status(201).json({
        success: true,
        message: 'Sale recorded successfully.',
        sale: completeSale,
        invoiceNumber
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to record sale: ' + err.message });
    }
  }

  static voidSale(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!sale) {
        return res.status(404).json({ success: false, error: 'Sale record not found.' });
      }

      if (sale.status === 'voided') {
        return res.status(400).json({ success: false, error: 'Sale has already been voided.' });
      }

      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);

      db.transaction(() => {
        // 1. Return stock to inventory
        for (const itm of items) {
          InventoryService.recordMovement({
            businessId: req.business.id,
            productId: itm.product_id,
            transactionType: 'sale_return',
            quantity: itm.quantity, // positive to return
            unitCost: itm.unit_cost,
            referenceType: 'sale_void',
            referenceId: id,
            notes: `Void of ${sale.invoice_number}: ${reason || 'Customer cancellation'}`,
            userId: req.user.id
          });
        }

        // 2. Reverse customer balance if credit sale
        if (sale.balance_amount > 0 && sale.customer_id) {
          db.prepare(`
            UPDATE customers
            SET outstanding_balance = MAX(0, outstanding_balance - ?)
            WHERE id = ? AND business_id = ?
          `).run(sale.balance_amount, sale.customer_id, req.business.id);
        }

        // 3. Mark sale voided
        db.prepare(`
          UPDATE sales
          SET status = 'voided', void_reason = ?
          WHERE id = ?
        `).run(reason || 'Voided by authorized user', id);

        // 4. Reverse double-entry journal entry
        const cashAccount = AccountingService.getPaymentAccountCode(sale.payment_method);
        const reversingLines = [];

        // Reverse Revenue & Cash/Receivable
        reversingLines.push({ accountCode: '4010', debit: sale.total_amount, credit: 0, description: `Reverse sales revenue: Void ${sale.invoice_number}` });
        if (sale.paid_amount > 0) {
          reversingLines.push({ accountCode: cashAccount, debit: 0, credit: sale.paid_amount, description: `Refund/Reversal: Void ${sale.invoice_number}` });
        }
        if (sale.balance_amount > 0) {
          reversingLines.push({ accountCode: '1100', debit: 0, credit: sale.balance_amount, description: `Reverse receivable: Void ${sale.invoice_number}` });
        }

        // Reverse COGS & Inventory
        const totalCost = items.reduce((s, itm) => s + itm.total_cost, 0);
        if (totalCost > 0) {
          reversingLines.push({ accountCode: '1200', debit: totalCost, credit: 0, description: `Restock inventory: Void ${sale.invoice_number}` });
          reversingLines.push({ accountCode: '5010', debit: 0, credit: totalCost, description: `Reverse COGS: Void ${sale.invoice_number}` });
        }

        AccountingService.recordJournalEntry({
          businessId: req.business.id,
          referenceType: 'sale_void',
          referenceId: id,
          description: `Void sale ${sale.invoice_number}`,
          userId: req.user.id,
          lines: reversingLines
        });

        // 5. Audit log
        AuditService.log({
          businessId: req.business.id,
          userId: req.user.id,
          action: 'VOID_SALE',
          entity: 'SALE',
          entityId: id,
          newValues: { invoice_number: sale.invoice_number, reason },
          ipAddress: req.ip
        });
      })();

      return res.json({ success: true, message: `Sale ${sale.invoice_number} voided and reversed successfully.` });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to void sale: ' + err.message });
    }
  }
}

module.exports = SalesController;
