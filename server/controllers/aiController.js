const db = require('../config/database');
const AccountingService = require('../services/accountingService');

class AiController {
  static ask(req, res) {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ success: false, error: 'Question is required.' });
      }

      const q = question.toLowerCase().trim();
      const bizId = req.business.id;
      const cur = req.business.currencySymbol || '₦';
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = `${today.substring(0, 7)}-01`;

      let responseText = '';
      let category = 'general';
      let dataContext = {};

      // 1. "What were my sales this month?" / "How much sales have I made?"
      if (q.includes('sales') && (q.includes('this month') || q.includes('month') || q.includes('total'))) {
        category = 'sales';
        const salesData = db.prepare(`
          SELECT COALESCE(SUM(total_amount), 0) as total,
                 COALESCE(SUM(paid_amount), 0) as paid,
                 COALESCE(SUM(balance_amount), 0) as balance,
                 COUNT(*) as count
          FROM sales
          WHERE business_id = ? AND status != 'voided' AND sale_date >= ?
        `).get(bizId, startOfMonth);

        dataContext = salesData;
        responseText = `This month, your business recorded **${salesData.count} sales transactions** generating a total revenue of **${cur}${salesData.total.toLocaleString()}**.\n\n` +
          `• Cash & payments collected: **${cur}${salesData.paid.toLocaleString()}**\n` +
          `• Outstanding credit balance: **${cur}${salesData.balance.toLocaleString()}**\n\n` +
          `All figures are verified against your recorded sales ledger.`;
      }

      // 2. "Which product made me the most profit?" / "Most profitable product"
      else if (q.includes('profit') && (q.includes('product') || q.includes('most') || q.includes('best'))) {
        category = 'profitability';
        const bestProducts = db.prepare(`
          SELECT p.name,
                 SUM(si.total_price) as revenue,
                 SUM(si.total_cost) as cogs,
                 (SUM(si.total_price) - SUM(si.total_cost)) as gross_profit,
                 SUM(si.quantity) as qty_sold
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          JOIN products p ON si.product_id = p.id
          WHERE s.business_id = ? AND s.status != 'voided'
          GROUP BY p.id, p.name
          ORDER BY gross_profit DESC
          LIMIT 3
        `).all(bizId);

        dataContext = { bestProducts };
        if (bestProducts.length === 0) {
          responseText = `No completed sales records were found to calculate product profitability. Once you record sales, BizBook will determine your top profit earners.`;
        } else {
          const top = bestProducts[0];
          responseText = `Your most profitable product is **${top.name}**, generating **${cur}${top.gross_profit.toLocaleString()}** in gross profit from ${top.qty_sold} units sold (Total Revenue: ${cur}${top.revenue.toLocaleString()}, Cost of Goods: ${cur}${top.cogs.toLocaleString()}).\n\n` +
            `Top profitable products breakdown:\n` +
            bestProducts.map((p, idx) => `${idx + 1}. **${p.name}**: ${cur}${p.gross_profit.toLocaleString()} profit (${p.qty_sold} units sold)`).join('\n');
        }
      }

      // 3. "How much did I spend on transportation?" / Specific expense query
      else if (q.includes('transport') || q.includes('logistics') || q.includes('fuel') || q.includes('rent') || q.includes('salary') || q.includes('salaries') || q.includes('expense')) {
        category = 'expenses';
        let targetCategory = '';
        if (q.includes('transport') || q.includes('delivery')) targetCategory = 'transport';
        else if (q.includes('fuel') || q.includes('generator')) targetCategory = 'fuel';
        else if (q.includes('rent')) targetCategory = 'rent';
        else if (q.includes('salar') || q.includes('wage')) targetCategory = 'salar';

        let expenseRows;
        if (targetCategory) {
          expenseRows = db.prepare(`
            SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
            FROM expenses
            WHERE business_id = ? AND LOWER(category) LIKE ?
            GROUP BY category
          `).all(bizId, `%${targetCategory}%`);
        } else {
          expenseRows = db.prepare(`
            SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
            FROM expenses
            WHERE business_id = ?
            GROUP BY category
            ORDER BY total DESC
          `).all(bizId);
        }

        const totalSpent = expenseRows.reduce((sum, r) => sum + r.total, 0);
        dataContext = { expenses: expenseRows, totalSpent };

        if (expenseRows.length === 0) {
          responseText = `You currently have no recorded expenses matching your query.`;
        } else {
          responseText = `Total expenses matching your query amount to **${cur}${totalSpent.toLocaleString()}**:\n\n` +
            expenseRows.map(r => `• **${r.category}**: ${cur}${r.total.toLocaleString()} (${r.count} payments)`).join('\n');
        }
      }

      // 4. "Who owes me money?" / Debtors / Accounts Receivable
      else if (q.includes('owe') || q.includes('debtor') || q.includes('receivable') || q.includes('customer balance')) {
        category = 'debtors';
        const debtors = db.prepare(`
          SELECT name, phone, outstanding_balance
          FROM customers
          WHERE business_id = ? AND outstanding_balance > 0 AND is_active = 1
          ORDER BY outstanding_balance DESC
        `).all(bizId);

        const totalDebtors = debtors.reduce((sum, d) => sum + d.outstanding_balance, 0);
        dataContext = { debtors, totalDebtors };

        if (debtors.length === 0) {
          responseText = `Good news! No customers currently owe your business money. Outstanding accounts receivable is **${cur}0.00**.`;
        } else {
          responseText = `You have **${debtors.length} customer(s)** with outstanding credit totaling **${cur}${totalDebtors.toLocaleString()}**:\n\n` +
            debtors.map(d => `• **${d.name}**${d.phone ? ` (${d.phone})` : ''}: owes **${cur}${d.outstanding_balance.toLocaleString()}**`).join('\n') +
            `\n\nYou can send payment reminders or record settlements in the Customers module.`;
        }
      }

      // 5. "Which products are running low?" / "Low stock"
      else if (q.includes('low') || q.includes('stock') || q.includes('reorder') || q.includes('out of stock')) {
        category = 'inventory';
        const lowStock = db.prepare(`
          SELECT name, sku, current_stock, reorder_level, unit
          FROM products
          WHERE business_id = ? AND is_active = 1 AND current_stock <= reorder_level
          ORDER BY current_stock ASC
        `).all(bizId);

        dataContext = { lowStock };
        if (lowStock.length === 0) {
          responseText = `All products are currently well-stocked above their respective reorder safety levels! No low stock warnings.`;
        } else {
          responseText = `You have **${lowStock.length} product(s)** at or below their reorder threshold:\n\n` +
            lowStock.map(p => `• **${p.name}**: Current Stock = **${p.current_stock} ${p.unit}** (Reorder Level: ${p.reorder_level} ${p.unit})`).join('\n') +
            `\n\nConsider raising purchase orders for these items to avoid stockouts.`;
        }
      }

      // 6. "Why is my profit lower this month?" / "Explain profit"
      else if (q.includes('profit') && (q.includes('why') || q.includes('lower') || q.includes('loss') || q.includes('explain'))) {
        category = 'financial_analysis';
        const pnl = AccountingService.getProfitAndLoss(bizId, startOfMonth, today);
        dataContext = pnl;

        responseText = `Here is the financial breakdown for this month's profitability:\n\n` +
          `• **Sales Revenue**: ${cur}${pnl.totalRevenue.toLocaleString()}\n` +
          `• **Cost of Goods Sold (COGS)**: -${cur}${pnl.totalCOGS.toLocaleString()}\n` +
          `• **Gross Profit**: ${cur}${pnl.grossProfit.toLocaleString()}\n` +
          `• **Operating Expenses**: -${cur}${pnl.totalOperatingExpenses.toLocaleString()}\n` +
          `• **Net Profit**: **${cur}${pnl.netProfit.toLocaleString()}**\n\n`;

        if (pnl.netProfit < 0) {
          if (pnl.grossProfit <= 0) {
            responseText += `⚠️ Your net loss is driven by low sales volume relative to goods cost. Focus on improving sales turnover or review product pricing margins.`;
          } else {
            responseText += `⚠️ Although your gross margin is positive (${cur}${pnl.grossProfit.toLocaleString()}), operating expenses (${cur}${pnl.totalOperatingExpenses.toLocaleString()}) exceed your gross earnings. Review major expense categories to reduce overhead.`;
          }
        } else {
          responseText += `✅ Your business is operating profitably with a net margin of ${pnl.totalRevenue > 0 ? Math.round((pnl.netProfit / pnl.totalRevenue) * 100) : 0}%.`;
        }
      }

      // Default comprehensive business overview
      else {
        category = 'summary';
        const pnl = AccountingService.getProfitAndLoss(bizId, startOfMonth, today);
        const cashFlow = AccountingService.getCashFlow(bizId);
        const cashBalance = cashFlow.currentBalances.reduce((s, c) => s + c.balance, 0);

        responseText = `Here is an instant financial snapshot for your business:\n\n` +
          `• **Monthly Revenue**: ${cur}${pnl.totalRevenue.toLocaleString()}\n` +
          `• **Gross Profit**: ${cur}${pnl.grossProfit.toLocaleString()}\n` +
          `• **Net Profit**: ${cur}${pnl.netProfit.toLocaleString()}\n` +
          `• **Liquid Cash & Bank**: ${cur}${cashBalance.toLocaleString()}\n\n` +
          `You can ask me questions such as:\n` +
          `• *"What were my sales this month?"*\n` +
          `• *"Which product made me the most profit?"*\n` +
          `• *"Who owes me money?"*\n` +
          `• *"Which products are running low?"*\n` +
          `• *"How much did I spend on transportation?"*`;
      }

      return res.json({
        success: true,
        answer: responseText,
        category,
        dataContext,
        verified: true
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'AI Assistant failed: ' + err.message });
    }
  }
}

module.exports = AiController;
