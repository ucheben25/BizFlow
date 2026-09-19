/**
 * BizBook Financial & Operational Reports
 * Profit & Loss, Balance Sheet, Cash Flow, and CSV Exports
 */

let activeReportTab = 'pnl';

async function renderReports() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Financial Reports';

  container.innerHTML = `
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <!-- Report Tabs -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn ${activeReportTab === 'pnl' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchReportTab('pnl')">Profit & Loss</button>
        <button class="btn ${activeReportTab === 'balance_sheet' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchReportTab('balance_sheet')">Balance Sheet</button>
        <button class="btn ${activeReportTab === 'cash_flow' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchReportTab('cash_flow')">Cash Flow</button>
        <button class="btn ${activeReportTab === 'trial_balance' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchReportTab('trial_balance')">Trial Balance</button>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="window.print()">
          <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print Report
        </button>
      </div>
    </div>

    <div id="report-content-body">
      <!-- Report table rendered here -->
    </div>
  `;

  loadActiveReportContent();
}

function switchReportTab(tab) {
  activeReportTab = tab;
  renderReports();
}

async function loadActiveReportContent() {
  const container = document.getElementById('report-content-body');
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

  container.innerHTML = `<div style="text-align: center; padding: 40px; color: #0A58CA;">Generating verified accounting statement...</div>`;

  try {
    if (activeReportTab === 'pnl') {
      const data = await API.get('/reports/pnl');
      const pnl = data.report;

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Profit & Loss Statement (Income Statement)</div>
              <div class="card-subtitle">Verified Double-Entry Ledger Calculation</div>
            </div>
          </div>

          <div style="max-width: 800px; margin: 0 auto;">
            <!-- Revenue Section -->
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--navy-dark); text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 10px;">
                1. Operating Revenue
              </h4>
              ${pnl.revenueAccounts.map(r => `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.88rem;">
                  <span>${r.name} (${r.code})</span>
                  <strong>${formatCurrency(r.total, cur)}</strong>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--border-color); font-weight: 800;">
                <span>Total Revenue</span>
                <span>${formatCurrency(pnl.totalRevenue, cur)}</span>
              </div>
            </div>

            <!-- Cost of Goods Sold Section -->
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--navy-dark); text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 10px;">
                2. Cost of Goods Sold (COGS)
              </h4>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.88rem;">
                <span>Direct Product Inventory Cost</span>
                <span style="color: var(--color-danger); font-weight: 700;">-${formatCurrency(pnl.totalCOGS, cur)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: var(--blue-subtle); border-radius: 6px; font-weight: 800; font-size: 1rem; color: var(--navy-dark); margin-top: 8px;">
                <span>GROSS PROFIT (Revenue minus COGS)</span>
                <span style="color: ${pnl.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${formatCurrency(pnl.grossProfit, cur)}</span>
              </div>
            </div>

            <!-- Operating Expenses Section -->
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--navy-dark); text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 10px;">
                3. Operating Expenses
              </h4>
              ${pnl.expenseAccounts.map(e => `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.88rem;">
                  <span>${e.name}</span>
                  <span style="color: var(--color-danger);">${formatCurrency(e.total, cur)}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--border-color); font-weight: 800;">
                <span>Total Operating Expenses</span>
                <span style="color: var(--color-danger);">-${formatCurrency(pnl.totalOperatingExpenses, cur)}</span>
              </div>
            </div>

            <!-- Net Profit Final Line -->
            <div style="display: flex; justify-content: space-between; padding: 16px 20px; background: ${pnl.netProfit >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}; border-radius: 8px; border: 1px solid ${pnl.netProfit >= 0 ? '#A7F3D0' : '#FECACA'}; font-size: 1.2rem; font-weight: 800;">
              <span>NET PROFIT / (LOSS)</span>
              <span style="color: ${pnl.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${formatCurrency(pnl.netProfit, cur)}</span>
            </div>
          </div>
        </div>
      `;
    } else if (activeReportTab === 'balance_sheet') {
      const data = await API.get('/reports/balance-sheet');
      const bs = data.report;

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Balance Sheet Statement</div>
              <div class="card-subtitle">Assets = Liabilities + Equity (Balanced: ${bs.isBalanced ? 'YES ✓' : 'NO ✗'})</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 900px; margin: 0 auto;">
            <!-- Assets Side -->
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--navy-dark); text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 12px;">
                Assets
              </h4>
              ${bs.assets.map(a => `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.88rem;">
                  <span>${a.name} (${a.code})</span>
                  <strong>${formatCurrency(a.balance, cur)}</strong>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid var(--navy-dark); font-weight: 800; font-size: 1.05rem;">
                <span>TOTAL ASSETS</span>
                <span>${formatCurrency(bs.totalAssets, cur)}</span>
              </div>
            </div>

            <!-- Liabilities & Equity Side -->
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--navy-dark); text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 12px;">
                Liabilities & Equity
              </h4>
              <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px;">LIABILITIES:</div>
              ${bs.liabilities.map(l => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.88rem;">
                  <span>${l.name} (${l.code})</span>
                  <strong>${formatCurrency(l.balance, cur)}</strong>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-weight: 700; border-top: 1px solid var(--border-color); margin-bottom: 14px;">
                <span>Total Liabilities</span>
                <span>${formatCurrency(bs.totalLiabilities, cur)}</span>
              </div>

              <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px;">EQUITY:</div>
              ${bs.equityAccounts.map(eq => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.88rem;">
                  <span>${eq.name}</span>
                  <strong>${formatCurrency(eq.balance, cur)}</strong>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.88rem;">
                <span>Retained Earnings from Operations</span>
                <strong>${formatCurrency(bs.retainedEarningsFromOperations, cur)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-weight: 700; border-top: 1px solid var(--border-color); margin-bottom: 14px;">
                <span>Total Equity</span>
                <span>${formatCurrency(bs.totalEquity, cur)}</span>
              </div>

              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid var(--navy-dark); font-weight: 800; font-size: 1.05rem;">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>${formatCurrency(bs.totalLiabilities + bs.totalEquity, cur)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeReportTab === 'cash_flow') {
      const data = await API.get('/reports/cash-flow');
      const cf = data.report;

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Cash Flow Statement</div>
              <div class="card-subtitle">Inflows and Outflows through Liquid Accounts</div>
            </div>
          </div>

          <div style="max-width: 650px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--color-success-bg); border-radius: 8px; font-weight: 700;">
              <span>Total Cash & Bank Inflows</span>
              <span style="color: var(--color-success); font-size: 1.1rem;">+${formatCurrency(cf.totalCashIn, cur)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--color-danger-bg); border-radius: 8px; font-weight: 700;">
              <span>Total Cash & Bank Outflows</span>
              <span style="color: var(--color-danger); font-size: 1.1rem;">-${formatCurrency(cf.totalCashOut, cur)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 16px; background: #FFFFFF; border: 2px solid var(--border-color); border-radius: 8px; font-weight: 800; font-size: 1.15rem;">
              <span>Net Cash Flow</span>
              <span style="color: ${cf.netCashFlow >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${formatCurrency(cf.netCashFlow, cur)}</span>
            </div>

            <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--navy-dark); margin-top: 10px;">Liquid Account Breakdown:</h4>
            ${cf.currentBalances.map(b => `
              <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #F8FAFC; border-radius: 6px; font-size: 0.88rem;">
                <span style="font-weight: 600;">${b.name} (${b.code})</span>
                <strong>${formatCurrency(b.balance, cur)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (activeReportTab === 'trial_balance') {
      const data = await API.get('/reports/trial-balance');
      const trial = data.report;

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Trial Balance (Double-Entry Verification)</div>
              <div class="card-subtitle">
                Total Debits: <strong>${formatCurrency(trial.sumDebit, cur)}</strong> |
                Total Credits: <strong>${formatCurrency(trial.sumCredit, cur)}</strong> |
                Balanced: <span class="badge ${trial.isBalanced ? 'badge-success' : 'badge-danger'}">${trial.isBalanced ? 'BALANCED' : 'IMBALANCED'}</span>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Name</th>
                  <th>Classification</th>
                  <th style="text-align: right;">Debit (${cur})</th>
                  <th style="text-align: right;">Credit (${cur})</th>
                </tr>
              </thead>
              <tbody>
                ${trial.accounts.map(a => `
                  <tr>
                    <td style="font-weight: 750; color: var(--blue-primary);">${a.code}</td>
                    <td style="font-weight: 600;">${a.name}</td>
                    <td style="text-transform: capitalize;">${a.type}</td>
                    <td style="text-align: right; font-family: monospace;">${a.total_debit > 0 ? formatCurrency(a.total_debit, '') : '-'}</td>
                    <td style="text-align: right; font-family: monospace;">${a.total_credit > 0 ? formatCurrency(a.total_credit, '') : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="font-weight: 800; background: #F1F5F9;">
                  <td colspan="3">TOTAL DEBITS & CREDITS</td>
                  <td style="text-align: right; font-family: monospace;">${formatCurrency(trial.sumDebit, cur)}</td>
                  <td style="text-align: right; font-family: monospace;">${formatCurrency(trial.sumCredit, cur)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--color-danger); font-weight: 700;">Failed to generate report: ${err.message}</p>
      </div>
    `;
  }
}
