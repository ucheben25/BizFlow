const db = require('../config/database');

class PaymentController {
  static getPayments(req, res) {
    try {
      const { payment_type, payment_method, start_date, end_date, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT p.*, u.full_name as recorded_by
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.business_id = ?
      `;
      const params = [req.business.id];

      if (payment_type) {
        sql += ` AND p.payment_type = ?`;
        params.push(payment_type);
      }

      if (payment_method) {
        sql += ` AND p.payment_method = ?`;
        params.push(payment_method);
      }

      if (start_date) {
        sql += ` AND p.payment_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND p.payment_date <= ?`;
        params.push(end_date + ' 23:59:59');
      }

      sql += ` ORDER BY p.payment_date DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const payments = db.prepare(sql).all(...params);
      return res.json({ success: true, payments });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch payments: ' + err.message });
    }
  }

  static getBusinessAccounts(req, res) {
    try {
      // Fetch liquid asset accounts (Cash, Bank, POS) and other accounts
      const accounts = db.prepare(`
        SELECT a.id, a.code, a.name, a.type, a.sub_type, a.balance,
               COALESCE(SUM(jl.debit), 0) as total_inflows,
               COALESCE(SUM(jl.credit), 0) as total_outflows
        FROM accounts a
        LEFT JOIN journal_lines jl ON a.id = jl.account_id
        WHERE a.business_id = ?
        GROUP BY a.id
        ORDER BY a.code ASC
      `).all(req.business.id);

      const cashBankAccounts = accounts.filter(a => ['1010', '1020', '1030'].includes(a.code));
      const totalLiquidBalance = cashBankAccounts.reduce((acc, a) => acc + (a.total_inflows - a.total_outflows), 0);

      return res.json({
        success: true,
        accounts,
        cashBankAccounts: cashBankAccounts.map(a => ({
          ...a,
          current_balance: a.total_inflows - a.total_outflows
        })),
        totalLiquidBalance
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch business accounts: ' + err.message });
    }
  }
}

module.exports = PaymentController;
