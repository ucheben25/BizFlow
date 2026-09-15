const db = require('../config/database');
const AccountingService = require('../services/accountingService');
const AuditService = require('../services/auditService');

class ExpenseController {
  static getExpenses(req, res) {
    try {
      const { category, payment_method, start_date, end_date, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT e.*, u.full_name as recorded_by
        FROM expenses e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.business_id = ?
      `;
      const params = [req.business.id];

      if (category) {
        sql += ` AND e.category = ?`;
        params.push(category);
      }

      if (payment_method) {
        sql += ` AND e.payment_method = ?`;
        params.push(payment_method);
      }

      if (start_date) {
        sql += ` AND e.expense_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND e.expense_date <= ?`;
        params.push(end_date + ' 23:59:59');
      }

      sql += ` ORDER BY e.expense_date DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const expenses = db.prepare(sql).all(...params);

      // Summary totals by category for the period
      let catSummarySql = `
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM expenses
        WHERE business_id = ?
      `;
      const catParams = [req.business.id];
      if (start_date) {
        catSummarySql += ` AND expense_date >= ?`;
        catParams.push(start_date);
      }
      if (end_date) {
        catSummarySql += ` AND expense_date <= ?`;
        catParams.push(end_date + ' 23:59:59');
      }
      catSummarySql += ` GROUP BY category ORDER BY total DESC`;
      const categorySummary = db.prepare(catSummarySql).all(...catParams);

      const totalExpenses = categorySummary.reduce((acc, c) => acc + c.total, 0);

      return res.json({ success: true, expenses, categorySummary, totalExpenses });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch expenses: ' + err.message });
    }
  }

  static createExpense(req, res) {
    try {
      const { category, amount, payment_method = 'cash', reference, description, expense_date } = req.body;

      if (!category) {
        return res.status(400).json({ success: false, error: 'Expense category is required.' });
      }

      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ success: false, error: 'Valid positive expense amount is required.' });
      }

      const expDate = expense_date || new Date().toISOString();
      const expenseAccountCode = AccountingService.getExpenseAccountCode(category);
      const cashAccountCode = AccountingService.getPaymentAccountCode(payment_method);

      let expenseId;

      db.transaction(() => {
        // 1. Insert into expenses table
        const resExp = db.prepare(`
          INSERT INTO expenses (
            business_id, user_id, category, amount, payment_method,
            reference, description, expense_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.business.id,
          req.user.id,
          category.trim(),
          amountNum,
          payment_method,
          reference ? reference.trim() : null,
          description ? description.trim() : null,
          expDate
        );

        expenseId = resExp.lastInsertRowid;

        // 2. Insert into payments table
        db.prepare(`
          INSERT INTO payments (
            business_id, user_id, payment_type, entity_type, entity_id,
            reference_type, reference_id, amount, payment_method, payment_account_code, notes, payment_date
          ) VALUES (?, ?, 'expense', 'expense', ?, 'expense', ?, ?, ?, ?, ?, ?)
        `).run(
          req.business.id,
          req.user.id,
          expenseId,
          expenseId,
          amountNum,
          payment_method,
          cashAccountCode,
          `Expense: ${category} - ${description || 'Operating expense'}`,
          expDate
        );

        // 3. Double-entry journal entry:
        // Dr Expense Account (amountNum)
        // Cr Cash/Bank/POS (amountNum)
        AccountingService.recordJournalEntry({
          businessId: req.business.id,
          entryDate: expDate,
          referenceType: 'expense',
          referenceId: expenseId,
          description: `Expense: ${category} (${description || 'Paid'})`,
          userId: req.user.id,
          lines: [
            { accountCode: expenseAccountCode, debit: amountNum, credit: 0, description: `${category} expense` },
            { accountCode: cashAccountCode, debit: 0, credit: amountNum, description: `Cash/bank paid for ${category}` }
          ]
        });

        // 4. Audit log
        AuditService.log({
          businessId: req.business.id,
          userId: req.user.id,
          action: 'CREATE_EXPENSE',
          entity: 'EXPENSE',
          entityId: expenseId,
          newValues: { category, amount: amountNum, payment_method, description },
          ipAddress: req.ip
        });
      })();

      const createdExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
      return res.status(201).json({
        success: true,
        message: 'Expense recorded successfully.',
        expense: createdExpense
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to record expense: ' + err.message });
    }
  }
}

module.exports = ExpenseController;
