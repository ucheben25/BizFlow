const db = require('../config/database');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');
const AuditService = require('../services/auditService');

class PurchaseController {
  static generatePurchaseNumber(businessId) {
    const count = db.prepare('SELECT COUNT(*) as count FROM purchases WHERE business_id = ?').get(businessId).count;
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  static getPurchases(req, res) {
    try {
      const { search, supplier_id, payment_status, start_date, end_date, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT p.*, s.name as supplier_name, s.contact_person, u.full_name as user_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.business_id = ?
      `;
      const params = [req.business.id];

      if (search) {
        sql += ` AND (p.purchase_number LIKE ? OR s.name LIKE ?)`;
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      if (supplier_id) {
        sql += ` AND p.supplier_id = ?`;
        params.push(supplier_id);
      }

      if (payment_status) {
        sql += ` AND p.payment_status = ?`;
        params.push(payment_status);
      }

      if (start_date) {
        sql += ` AND p.purchase_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND p.purchase_date <= ?`;
        params.push(end_date + ' 23:59:59');
      }

      sql += ` ORDER BY p.purchase_date DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const purchases = db.prepare(sql).all(...params);

      return res.json({ success: true, purchases });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch purchases: ' + err.message });
    }
  }

  static getPurchaseById(req, res) {
    try {
      const { id } = req.params;
      const purchase = db.prepare(`
        SELECT p.*, s.name as supplier_name, s.contact_person, s.phone as supplier_phone, s.email as supplier_email,
               u.full_name as user_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = ? AND p.business_id = ?
      `).get(id, req.business.id);

      if (!purchase) {
        return res.status(404).json({ success: false, error: 'Purchase record not found.' });
      }

      const items = db.prepare(`
        SELECT pi.*, pr.name as product_name, pr.sku, pr.unit
        FROM purchase_items pi
        JOIN products pr ON pi.product_id = pr.id
        WHERE pi.purchase_id = ?
      `).all(id);

      const payments = db.prepare(`
        SELECT * FROM payments
        WHERE reference_type = 'purchase' AND reference_id = ? AND business_id = ?
        ORDER BY payment_date ASC
      `).all(id, req.business.id);

      return res.json({ success: true, purchase, items, payments });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch purchase details: ' + err.message });
    }
  }

  static createPurchase(req, res) {
    try {
      const {
        supplier_id,
        items, // Array of { product_id, quantity, unit_cost }
        paid_amount = 0,
        payment_method = 'cash',
        notes
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one purchase item is required.' });
      }

      let totalAmount = 0;
      const validatedItems = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(item.product_id, req.business.id);
        if (!product || !product.is_active) {
          return res.status(400).json({ success: false, error: `Product ID ${item.product_id} is invalid or inactive.` });
        }

        const qty = Number(item.quantity);
        const unitCost = Number(item.unit_cost);

        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({ success: false, error: `Invalid quantity for product ${product.name}.` });
        }

        if (isNaN(unitCost) || unitCost < 0) {
          return res.status(400).json({ success: false, error: `Invalid unit cost for product ${product.name}.` });
        }

        const totalCost = Math.round(qty * unitCost * 100) / 100;
        totalAmount += totalCost;

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitCost,
          totalCost
        });
      }

      totalAmount = Math.round(totalAmount * 100) / 100;
      let paidNum = Math.max(0, Number(paid_amount) || 0);
      if (paidNum > totalAmount) paidNum = totalAmount;
      const balanceAmount = Math.round((totalAmount - paidNum) * 100) / 100;

      let paymentStatus = 'paid';
      if (balanceAmount > 0 && paidNum > 0) {
        paymentStatus = 'partial';
      } else if (balanceAmount === totalAmount) {
        paymentStatus = 'unpaid';
      }

      const purchaseNumber = PurchaseController.generatePurchaseNumber(req.business.id);

      let purchaseId;

      db.transaction(() => {
        // 1. Insert purchase
        const resPurchase = db.prepare(`
          INSERT INTO purchases (
            business_id, purchase_number, supplier_id, user_id, total_amount,
            paid_amount, balance_amount, payment_status, payment_method, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.business.id,
          purchaseNumber,
          supplier_id ? Number(supplier_id) : null,
          req.user.id,
          totalAmount,
          paidNum,
          balanceAmount,
          paymentStatus,
          payment_method,
          notes || null
        );

        purchaseId = resPurchase.lastInsertRowid;

        // 2. Insert items and increment inventory (updates WAC)
        const insertItem = db.prepare(`
          INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total_cost)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const itm of validatedItems) {
          insertItem.run(purchaseId, itm.productId, itm.quantity, itm.unitCost, itm.totalCost);

          InventoryService.recordMovement({
            businessId: req.business.id,
            productId: itm.productId,
            transactionType: 'purchase',
            quantity: itm.quantity,
            unitCost: itm.unitCost,
            referenceType: 'purchase',
            referenceId: purchaseId,
            notes: `Purchase ${purchaseNumber}`,
            userId: req.user.id
          });
        }

        // 3. Update supplier balance if balance_amount > 0
        if (balanceAmount > 0 && supplier_id) {
          db.prepare(`
            UPDATE suppliers
            SET outstanding_balance = outstanding_balance + ?
            WHERE id = ? AND business_id = ?
          `).run(balanceAmount, supplier_id, req.business.id);
        }

        // 4. Record payment if paid_amount > 0
        if (paidNum > 0) {
          const paymentAccount = AccountingService.getPaymentAccountCode(payment_method);
          db.prepare(`
            INSERT INTO payments (
              business_id, user_id, payment_type, entity_type, entity_id,
              reference_type, reference_id, amount, payment_method, payment_account_code, notes
            ) VALUES (?, ?, 'supplier_purchase', 'supplier', ?, 'purchase', ?, ?, ?, ?, ?)
          `).run(
            req.business.id,
            req.user.id,
            supplier_id || null,
            purchaseId,
            paidNum,
            payment_method,
            paymentAccount,
            `Payment for purchase ${purchaseNumber}`
          );
        }

        // 5. Double-entry accounting entry
        // Dr 1200 Inventory (totalAmount)
        // If paid_amount > 0: Cr Cash/Bank/POS (paid_amount)
        // If balance_amount > 0: Cr 2010 Accounts Payable (balance_amount)
        const journalLines = [
          { accountCode: '1200', debit: totalAmount, credit: 0, description: `Inventory purchase: ${purchaseNumber}` }
        ];

        if (paidNum > 0) {
          const cashAccount = AccountingService.getPaymentAccountCode(payment_method);
          journalLines.push({ accountCode: cashAccount, debit: 0, credit: paidNum, description: `Paid cash for ${purchaseNumber}` });
        }

        if (balanceAmount > 0) {
          journalLines.push({ accountCode: '2010', debit: 0, credit: balanceAmount, description: `Payable to supplier for ${purchaseNumber}` });
        }

        AccountingService.recordJournalEntry({
          businessId: req.business.id,
          referenceType: 'purchase',
          referenceId: purchaseId,
          description: `Purchase ${purchaseNumber}`,
          userId: req.user.id,
          lines: journalLines
        });

        // 6. Audit log
        AuditService.log({
          businessId: req.business.id,
          userId: req.user.id,
          action: 'CREATE_PURCHASE',
          entity: 'PURCHASE',
          entityId: purchaseId,
          newValues: { purchaseNumber, totalAmount, paidAmount: paidNum },
          ipAddress: req.ip
        });
      })();

      const createdPurchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
      return res.status(201).json({
        success: true,
        message: 'Purchase recorded and inventory updated successfully.',
        purchase: createdPurchase
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to record purchase: ' + err.message });
    }
  }
}

module.exports = PurchaseController;
