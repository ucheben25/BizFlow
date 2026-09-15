const db = require('../config/database');
const AccountingService = require('../services/accountingService');
const InventoryService = require('../services/inventoryService');

class ReportController {
  static getDashboardSummary(req, res) {
    try {
      const bizId = req.business.id;
      const todayStr = new Date().toISOString().split('T')[0];
      const startOfMonthStr = `${todayStr.substring(0, 7)}-01`;

      // 1. Today's Metrics
      const todaySales = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total,
               COALESCE(SUM(paid_amount), 0) as collected,
               COUNT(*) as count
        FROM sales
        WHERE business_id = ? AND status != 'voided' AND sale_date >= ?
      `).get(bizId, todayStr);

      const todayCOGS = db.prepare(`
        SELECT COALESCE(SUM(si.total_cost), 0) as total
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.business_id = ? AND s.status != 'voided' AND s.sale_date >= ?
      `).get(bizId, todayStr).total;

      const todayExpenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM expenses
        WHERE business_id = ? AND expense_date >= ?
      `).get(bizId, todayStr);

      const todayGrossProfit = todaySales.total - todayCOGS;
      const todayNetProfit = todayGrossProfit - todayExpenses.total;

      // 2. Monthly Metrics
      const monthSales = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total,
               COALESCE(SUM(paid_amount), 0) as collected,
               COUNT(*) as count
        FROM sales
        WHERE business_id = ? AND status != 'voided' AND sale_date >= ?
      `).get(bizId, startOfMonthStr);

      const monthCOGS = db.prepare(`
        SELECT COALESCE(SUM(si.total_cost), 0) as total
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.business_id = ? AND s.status != 'voided' AND s.sale_date >= ?
      `).get(bizId, startOfMonthStr).total;

      const monthExpenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM expenses
        WHERE business_id = ? AND expense_date >= ?
      `).get(bizId, startOfMonthStr);

      const monthGrossProfit = monthSales.total - monthCOGS;
      const monthNetProfit = monthGrossProfit - monthExpenses.total;

      // 3. Inventory Valuation & Health
      const inventory = InventoryService.getInventoryValuation(bizId);

      // 4. Receivables (Customer Debt) & Payables (Supplier Debt)
      const receivables = db.prepare(`
        SELECT COALESCE(SUM(outstanding_balance), 0) as total,
               COUNT(CASE WHEN outstanding_balance > 0 THEN 1 END) as count
        FROM customers
        WHERE business_id = ? AND is_active = 1
      `).get(bizId);

      const payables = db.prepare(`
        SELECT COALESCE(SUM(outstanding_balance), 0) as total,
               COUNT(CASE WHEN outstanding_balance > 0 THEN 1 END) as count
        FROM suppliers
        WHERE business_id = ? AND is_active = 1
      `).get(bizId);

      // 5. Cash & Bank Balances
      const cashFlow = AccountingService.getCashFlow(bizId);
      const totalCashAvailable = cashFlow.currentBalances.reduce((acc, c) => acc + c.balance, 0);

      // 6. Recent Sales (Latest 5)
      const recentSales = db.prepare(`
        SELECT s.id, s.invoice_number, s.total_amount, s.payment_status, s.payment_method, s.sale_date,
               c.name as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.business_id = ? AND s.status != 'voided'
        ORDER BY s.sale_date DESC
        LIMIT 6
      `).all(bizId);

      // 7. Low Stock Alerts (Up to 5)
      const lowStockProducts = db.prepare(`
        SELECT id, name, sku, current_stock, reorder_level, unit
        FROM products
        WHERE business_id = ? AND is_active = 1 AND current_stock <= reorder_level
        ORDER BY current_stock ASC
        LIMIT 5
      `).all(bizId);

      // 8. 7-day Sales Trend for Chart
      const salesTrend = db.prepare(`
        SELECT date(sale_date) as date,
               COALESCE(SUM(total_amount), 0) as revenue,
               COUNT(*) as transactions
        FROM sales
        WHERE business_id = ? AND status != 'voided' AND sale_date >= date('now', '-6 days')
        GROUP BY date(sale_date)
        ORDER BY date ASC
      `).all(bizId);

      return res.json({
        success: true,
        summary: {
          today: {
            sales: todaySales.total,
            collected: todaySales.collected,
            salesCount: todaySales.count,
            cogs: todayCOGS,
            grossProfit: todayGrossProfit,
            expenses: todayExpenses.total,
            expensesCount: todayExpenses.count,
            netProfit: todayNetProfit
          },
          month: {
            sales: monthSales.total,
            collected: monthSales.collected,
            salesCount: monthSales.count,
            cogs: monthCOGS,
            grossProfit: monthGrossProfit,
            expenses: monthExpenses.total,
            expensesCount: monthExpenses.count,
            netProfit: monthNetProfit
          },
          inventory: {
            valuation: inventory.totalValuation,
            totalUnits: inventory.totalStockUnits,
            lowStockCount: inventory.lowStockCount,
            outOfStockCount: inventory.outOfStockCount
          },
          receivables: receivables.total,
          payables: payables.total,
          cashAvailable: totalCashAvailable,
          cashBreakdown: cashFlow.currentBalances
        },
        recentSales,
        lowStockProducts,
        salesTrend
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to load dashboard summary: ' + err.message });
    }
  }

  static getProfitAndLoss(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const report = AccountingService.getProfitAndLoss(req.business.id, start_date, end_date);
      return res.json({ success: true, report });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to generate P&L: ' + err.message });
    }
  }

  static getBalanceSheet(req, res) {
    try {
      const { as_of_date } = req.query;
      const report = AccountingService.getBalanceSheet(req.business.id, as_of_date);
      return res.json({ success: true, report });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to generate Balance Sheet: ' + err.message });
    }
  }

  static getCashFlow(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const report = AccountingService.getCashFlow(req.business.id, start_date, end_date);
      return res.json({ success: true, report });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to generate Cash Flow: ' + err.message });
    }
  }

  static getTrialBalance(req, res) {
    try {
      const report = AccountingService.getTrialBalance(req.business.id);
      return res.json({ success: true, report });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to generate Trial Balance: ' + err.message });
    }
  }

  static getSalesReport(req, res) {
    try {
      const { start_date, end_date, group_by = 'daily' } = req.query;
      const bizId = req.business.id;

      let dateFilter = '';
      const params = [bizId];
      if (start_date) {
        dateFilter += ' AND s.sale_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        dateFilter += ' AND s.sale_date <= ?';
        params.push(end_date + ' 23:59:59');
      }

      // Top selling products
      const topProducts = db.prepare(`
        SELECT p.name as product_name, p.sku,
               SUM(si.quantity) as total_quantity_sold,
               SUM(si.total_price) as total_sales_amount,
               SUM(si.total_cost) as total_cogs,
               (SUM(si.total_price) - SUM(si.total_cost)) as gross_profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE s.business_id = ? AND s.status != 'voided' ${dateFilter}
        GROUP BY p.id, p.name, p.sku
        ORDER BY total_sales_amount DESC
        LIMIT 20
      `).all(...params);

      // Sales by payment method
      const byPaymentMethod = db.prepare(`
        SELECT payment_method,
               COUNT(*) as count,
               SUM(total_amount) as total_amount,
               SUM(paid_amount) as paid_amount
        FROM sales s
        WHERE s.business_id = ? AND s.status != 'voided' ${dateFilter}
        GROUP BY payment_method
      `).all(...params);

      // Summary totals
      const overall = db.prepare(`
        SELECT COUNT(*) as count,
               COALESCE(SUM(total_amount), 0) as total_revenue,
               COALESCE(SUM(paid_amount), 0) as total_collected,
               COALESCE(SUM(balance_amount), 0) as total_receivable,
               COALESCE(SUM(discount), 0) as total_discounts
        FROM sales s
        WHERE s.business_id = ? AND s.status != 'voided' ${dateFilter}
      `).get(...params);

      return res.json({ success: true, topProducts, byPaymentMethod, overall });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to generate Sales Report: ' + err.message });
    }
  }

  static getInventoryReport(req, res) {
    try {
      const valuation = InventoryService.getInventoryValuation(req.business.id);
      return res.json({ success: true, ...valuation });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to generate Inventory Report: ' + err.message });
    }
  }
}

module.exports = ReportController;
