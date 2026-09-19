const db = require('../config/database');

class AccountingService {
  /**
   * Helper to get account ID by code for a business
   */
  static getAccountId(businessId, code) {
    const acc = db.prepare('SELECT id FROM accounts WHERE business_id = ? AND code = ?').get(businessId, code);
    if (!acc) {
      throw new Error(`Account code ${code} not found for business ID ${businessId}`);
    }
    return acc.id;
  }

  /**
   * Helper to map payment method to appropriate asset account code
   */
  static getPaymentAccountCode(method) {
    switch (method) {
      case 'cash':
        return '1010'; // Cash on Hand
      case 'bank_transfer':
        return '1020'; // Bank Account
      case 'pos':
        return '1030'; // POS Settlement
      default:
        return '1010';
    }
  }

  /**
   * Helper to map expense category to appropriate expense account code
   */
  static getExpenseAccountCode(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('transport') || cat.includes('logistics') || cat.includes('delivery')) return '6010';
    if (cat.includes('electric') || cat.includes('power') || cat.includes('utility')) return '6020';
    if (cat.includes('rent')) return '6030';
    if (cat.includes('salar') || cat.includes('wage') || cat.includes('payroll')) return '6040';
    if (cat.includes('fuel') || cat.includes('diesel') || cat.includes('generator')) return '6050';
    if (cat.includes('internet') || cat.includes('data') || cat.includes('phone') || cat.includes('airtime')) return '6060';
    if (cat.includes('repair') || cat.includes('maint')) return '6070';
    if (cat.includes('advert') || cat.includes('market') || cat.includes('promo')) return '6080';
    if (cat.includes('pack') || cat.includes('material') || cat.includes('supply')) return '6090';
    if (cat.includes('bank') || cat.includes('charge') || cat.includes('fee')) return '6100';
    return '6110'; // Miscellaneous
  }

  /**
   * Generates a unique sequential entry number
   */
  static generateEntryNumber(businessId) {
    const count = db.prepare('SELECT COUNT(*) as count FROM journal_entries WHERE business_id = ?').get(businessId).count;
    const year = new Date().getFullYear();
    return `JE-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Core Double-Entry transaction recorder.
   * STRICT RULE: Total Debits MUST equal Total Credits!
   * Updates account balances accordingly.
   */
  static recordJournalEntry({
    businessId,
    entryNumber,
    entryDate = new Date().toISOString(),
    referenceType,
    referenceId,
    description,
    userId,
    lines // Array of { accountCode or accountId, debit, credit, description }
  }) {
    if (!lines || lines.length === 0) {
      throw new Error('Journal entry must have at least two lines');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const resolvedLines = lines.map(line => {
      const accountId = line.accountId || this.getAccountId(businessId, line.accountCode);
      const debit = Math.round((Number(line.debit) || 0) * 100) / 100;
      const credit = Math.round((Number(line.credit) || 0) * 100) / 100;

      totalDebit += debit;
      totalCredit += credit;

      return {
        accountId,
        debit,
        credit,
        description: line.description || description
      };
    });

    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    // Strict Double-Entry Balance Check
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Double-entry balance violation: Total Debits (${totalDebit}) must equal Total Credits (${totalCredit})`);
    }

    const entryNum = entryNumber || this.generateEntryNumber(businessId);

    const insertEntry = db.prepare(`
      INSERT INTO journal_entries (business_id, entry_number, entry_date, reference_type, reference_id, description, user_id, is_balanced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertLine = db.prepare(`
      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateAccountBalance = db.prepare(`
      UPDATE accounts
      SET balance = balance + ?
      WHERE id = ?
    `);

    let entryId;

    const executeTransaction = () => {
      const result = insertEntry.run(businessId, entryNum, entryDate, referenceType, referenceId, description, userId);
      entryId = result.lastInsertRowid;

      for (const line of resolvedLines) {
        insertLine.run(entryId, line.accountId, line.debit, line.credit, line.description);

        // Update account running balance based on account normal balance
        // Assets & Expenses: normal balance = DEBIT (Debit increases, Credit decreases)
        // Liabilities, Equity & Revenue: normal balance = CREDIT (Credit increases, Debit decreases)
        const account = db.prepare('SELECT type FROM accounts WHERE id = ?').get(line.accountId);
        let netChange = 0;
        if (account.type === 'asset' || account.type === 'expense') {
          netChange = line.debit - line.credit;
        } else {
          netChange = line.credit - line.debit;
        }
        updateAccountBalance.run(netChange, line.accountId);
      }
    };

    // If already in a transaction, simply run, otherwise wrap in transaction
    if (db.inTransaction) {
      executeTransaction();
    } else {
      db.transaction(executeTransaction)();
    }

    return { id: entryId, entryId, entryNumber: entryNum, totalAmount: totalDebit };
  }

  /**
   * Financial statements calculations
   */
  static getProfitAndLoss(businessId, startDate, endDate) {
    let dateFilter = '';
    const params = [businessId];
    if (startDate) {
      dateFilter += ' AND je.entry_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ' AND je.entry_date <= ?';
      params.push(endDate + ' 23:59:59');
    }

    // Revenue: sum of credits - debits on revenue accounts
    const revenueQuery = `
      SELECT a.id, a.code, a.name, a.sub_type,
             COALESCE(SUM(jl.credit - jl.debit), 0) as total
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.type = 'revenue' ${dateFilter}
      GROUP BY a.id, a.code, a.name, a.sub_type
    `;
    const revenueAccounts = db.prepare(revenueQuery).all(...params);
    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.total, 0);

    // COGS: sum of debits - credits on COGS account (code 5010)
    const cogsQuery = `
      SELECT a.id, a.code, a.name,
             COALESCE(SUM(jl.debit - jl.credit), 0) as total
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.code = '5010' ${dateFilter}
      GROUP BY a.id, a.code, a.name
    `;
    const cogsResult = db.prepare(cogsQuery).get(...params) || { total: 0 };
    const totalCOGS = cogsResult.total || 0;

    const grossProfit = totalRevenue - totalCOGS;

    // Operating Expenses: sum of debits - credits on expense accounts (excluding 5010)
    const expensesQuery = `
      SELECT a.id, a.code, a.name, a.sub_type,
             COALESCE(SUM(jl.debit - jl.credit), 0) as total
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.type = 'expense' AND a.code != '5010' ${dateFilter}
      GROUP BY a.id, a.code, a.name, a.sub_type
    `;
    const expenseAccounts = db.prepare(expensesQuery).all(...params);
    const totalOperatingExpenses = expenseAccounts.reduce((sum, a) => sum + a.total, 0);

    const netProfit = grossProfit - totalOperatingExpenses;

    return {
      revenueAccounts,
      totalRevenue,
      totalCOGS,
      grossProfit,
      expenseAccounts,
      totalOperatingExpenses,
      netProfit
    };
  }

  static getBalanceSheet(businessId, asOfDate) {
    let dateFilter = '';
    const params = [businessId];
    if (asOfDate) {
      dateFilter = ' AND je.entry_date <= ?';
      params.push(asOfDate + ' 23:59:59');
    }

    // Assets: balance is debit - credit
    const assetsQuery = `
      SELECT a.id, a.code, a.name, a.sub_type,
             COALESCE(SUM(jl.debit - jl.credit), 0) as balance
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.type = 'asset' ${dateFilter}
      GROUP BY a.id, a.code, a.name, a.sub_type
    `;
    const assets = db.prepare(assetsQuery).all(...params);
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);

    // Liabilities: balance is credit - debit
    const liabilitiesQuery = `
      SELECT a.id, a.code, a.name, a.sub_type,
             COALESCE(SUM(jl.credit - jl.debit), 0) as balance
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.type = 'liability' ${dateFilter}
      GROUP BY a.id, a.code, a.name, a.sub_type
    `;
    const liabilities = db.prepare(liabilitiesQuery).all(...params);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);

    // Equity accounts:
    const equityQuery = `
      SELECT a.id, a.code, a.name, a.sub_type,
             COALESCE(SUM(jl.credit - jl.debit), 0) as balance
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.type = 'equity' ${dateFilter}
      GROUP BY a.id, a.code, a.name, a.sub_type
    `;
    const equityAccounts = db.prepare(equityQuery).all(...params);

    // Retained earnings from P&L up to asOfDate
    const pnl = this.getProfitAndLoss(businessId, null, asOfDate);
    const retainedEarningsFromOperations = pnl.netProfit;

    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0) + retainedEarningsFromOperations;

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equityAccounts,
      retainedEarningsFromOperations,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    };
  }

  static getTrialBalance(businessId) {
    const query = `
      SELECT a.id, a.code, a.name, a.type,
             COALESCE(SUM(jl.debit), 0) as total_debit,
             COALESCE(SUM(jl.credit), 0) as total_credit
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      WHERE a.business_id = ?
      GROUP BY a.id, a.code, a.name, a.type
      ORDER BY a.code ASC
    `;
    const rows = db.prepare(query).all(businessId);
    let sumDebit = 0;
    let sumCredit = 0;

    const accounts = rows.map(r => {
      sumDebit += r.total_debit;
      sumCredit += r.total_credit;
      return r;
    });

    return {
      accounts,
      sumDebit: Math.round(sumDebit * 100) / 100,
      sumCredit: Math.round(sumCredit * 100) / 100,
      totalDebit: Math.round(sumDebit * 100) / 100,
      totalCredit: Math.round(sumCredit * 100) / 100,
      isBalanced: Math.abs(sumDebit - sumCredit) < 0.01
    };
  }

  static getCashFlow(businessId, startDate, endDate) {
    let dateFilter = '';
    const params = [businessId];
    if (startDate) {
      dateFilter += ' AND je.entry_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ' AND je.entry_date <= ?';
      params.push(endDate + ' 23:59:59');
    }

    // Cash and bank accounts are 1010, 1020, 1030
    const cashInQuery = `
      SELECT COALESCE(SUM(jl.debit), 0) as total_in
      FROM journal_lines jl
      JOIN accounts a ON jl.account_id = a.id
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.code IN ('1010', '1020', '1030') ${dateFilter}
    `;
    const cashOutQuery = `
      SELECT COALESCE(SUM(jl.credit), 0) as total_out
      FROM journal_lines jl
      JOIN accounts a ON jl.account_id = a.id
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE a.business_id = ? AND a.code IN ('1010', '1020', '1030') ${dateFilter}
    `;

    const totalCashIn = db.prepare(cashInQuery).get(...params).total_in;
    const totalCashOut = db.prepare(cashOutQuery).get(...params).total_out;
    const netCashFlow = totalCashIn - totalCashOut;

    // Current cash & bank balances
    const currentBalances = db.prepare(`
      SELECT code, name,
             COALESCE(SUM(jl.debit - jl.credit), 0) as balance
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      WHERE a.business_id = ? AND a.code IN ('1010', '1020', '1030')
      GROUP BY a.id, code, name
    `).all(businessId);

    return {
      totalCashIn,
      totalCashOut,
      netCashFlow,
      currentBalances
    };
  }
}

module.exports = AccountingService;
