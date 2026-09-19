/**
 * BizBook Dashboard Component
 * "How is my business doing?"
 */

async function renderDashboard() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Dashboard';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading real-time financial metrics...
    </div>
  `;

  try {
    const data = await API.get('/reports/dashboard');
    const { summary, recentSales, lowStockProducts, salesTrend } = data;
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

    const hasFinancialAccess = summary.hasFinancialAccess !== false;

    if (!hasFinancialAccess) {
      // OPERATIONAL DASHBOARD (For cashiers and ordinary staff - Zero profit/financial figures)
      container.innerHTML = `
        <!-- Staff Operational Banner -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; background: #FFFFFF; padding: 16px 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <div>
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark);">Counter Operations & Orders</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted);">Front-desk order processing and stock lookup workspace</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="State.setView('pos')">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              Open POS Register
            </button>
            <button class="btn btn-secondary btn-sm" onclick="State.setView('sales')">View Invoices</button>
            <button class="btn btn-secondary btn-sm" onclick="State.setView('products')">Product Lookup</button>
          </div>
        </div>

        <!-- Operational KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Today's Transactions</span>
              <div class="kpi-icon blue">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path></svg>
              </div>
            </div>
            <div class="kpi-value">${summary.today.salesCount}</div>
            <div class="kpi-meta"><span>Completed counter checkouts today</span></div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Monthly Orders</span>
              <div class="kpi-icon green">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
              </div>
            </div>
            <div class="kpi-value">${summary.month.salesCount}</div>
            <div class="kpi-meta"><span>Total customer orders this month</span></div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Stock Units on Shelf</span>
              <div class="kpi-icon blue">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              </div>
            </div>
            <div class="kpi-value">${summary.inventory.totalUnits}</div>
            <div class="kpi-meta"><span>Units across catalog products</span></div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Low Stock Alerts</span>
              <div class="kpi-icon ${summary.inventory.lowStockCount > 0 ? 'red' : 'green'}">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
            </div>
            <div class="kpi-value" style="color: ${summary.inventory.lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
              ${summary.inventory.lowStockCount}
            </div>
            <div class="kpi-meta"><span>Items below safety reorder level</span></div>
          </div>
        </div>

        <!-- Two-Column: Low Stock List & Recent Sales -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px;">
          ${lowStockProducts.length > 0 ? `
            <div class="card" style="margin-bottom: 0;">
              <div class="card-header">
                <div>
                  <div class="card-title">Stock Attention Required</div>
                  <div class="card-subtitle">${summary.inventory.lowStockCount} items need replenishment</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="State.setView('products')">View Catalog</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${lowStockProducts.map(p => `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--color-warning-bg); border-radius: var(--radius-md); border: 1px solid #FDE68A;">
                    <div>
                      <div style="font-weight: 750; font-size: 0.9rem; color: #92400E;">${p.name}</div>
                      <div style="font-size: 0.78rem; color: #B45309;">Remaining: ${p.current_stock} ${p.unit} (Alert set at ${p.reorder_level})</div>
                    </div>
                    <span class="badge badge-warning">Low Stock</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Recent Transactions -->
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Recent Transactions</div>
                <div class="card-subtitle">Latest counter sales & orders</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="State.setView('sales')">View All Sales</button>
            </div>

            ${recentSales.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-title">No transactions recorded yet</div>
                <div class="empty-state-desc">Start processing sales at the Point of Sale register.</div>
                <button class="btn btn-primary" onclick="State.setView('pos')">Open POS</button>
              </div>
            ` : `
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Total Amount</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentSales.map(s => `
                      <tr>
                        <td style="font-weight: 750; color: var(--blue-primary);">${s.invoice_number}</td>
                        <td>${s.customer_name || 'Walk-in Customer'}</td>
                        <td style="font-weight: 750;">${formatCurrency(s.total_amount, cur)}</td>
                        <td style="text-transform: capitalize;">${s.payment_method.replace('_', ' ')}</td>
                        <td>
                          <span class="badge ${s.payment_status === 'paid' ? 'badge-success' : (s.payment_status === 'partial' ? 'badge-warning' : 'badge-danger')}">
                            ${s.payment_status}
                          </span>
                        </td>
                        <td>${formatDate(s.sale_date)}</td>
                        <td>
                          <button class="btn btn-secondary btn-sm" onclick="showReceiptModal(${s.id})">Receipt</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      `;
      return;
    }

    // FULL EXECUTIVE FINANCIAL DASHBOARD (For Owner and Admin)
    container.innerHTML = `
      <!-- Quick Action Banner -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; background: #FFFFFF; padding: 16px 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark);">Financial Health & Performance</h2>
          <p style="font-size: 0.82rem; color: var(--text-muted);">Verified double-entry bookkeeping ledger snapshot</p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" onclick="State.setView('pos')">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Record Sale
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showAddProductModal()">+ Product</button>
          <button class="btn btn-secondary btn-sm" onclick="showAddExpenseModal()">+ Expense</button>
          <button class="btn btn-secondary btn-sm" onclick="State.setView('purchases')">+ Restock</button>
        </div>
      </div>

      <!-- KPI Grid: Today vs This Month -->
      <div class="kpi-grid">
        <!-- Today's Sales -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Today's Sales</span>
            <div class="kpi-icon blue">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="kpi-value">${formatCurrency(summary.today.sales, cur)}</div>
          <div class="kpi-meta">
            <span>${summary.today.salesCount} orders</span> •
            <span style="color: var(--color-success); font-weight: 600;">Gross Profit: ${formatCurrency(summary.today.grossProfit, cur)}</span>
          </div>
        </div>

        <!-- Today's Net Profit -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Today's Net Profit</span>
            <div class="kpi-icon ${summary.today.netProfit >= 0 ? 'green' : 'red'}">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: ${summary.today.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
            ${formatCurrency(summary.today.netProfit, cur)}
          </div>
          <div class="kpi-meta">
            <span>Expenses: ${formatCurrency(summary.today.expenses, cur)}</span>
          </div>
        </div>

        <!-- Month Sales & Net Profit -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Monthly Revenue</span>
            <div class="kpi-icon blue">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
          </div>
          <div class="kpi-value">${formatCurrency(summary.month.sales, cur)}</div>
          <div class="kpi-meta">
            <span>Net Profit: </span>
            <strong style="color: ${summary.month.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
              ${formatCurrency(summary.month.netProfit, cur)}
            </strong>
          </div>
        </div>

        <!-- Liquid Cash & Bank -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Cash & Bank Balances</span>
            <div class="kpi-icon green">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            </div>
          </div>
          <div class="kpi-value">${formatCurrency(summary.cashAvailable, cur)}</div>
          <div class="kpi-meta">
            <span>Available operating funds</span>
          </div>
        </div>
      </div>

      <!-- Secondary Metrics Row: Inventory, Debtors, Creditors -->
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="kpi-card" style="padding: 16px;">
          <div class="kpi-label" style="font-size: 0.75rem;">Inventory Valuation</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: var(--navy-dark); margin: 4px 0;">
            ${formatCurrency(summary.inventory.valuation, cur)}
          </div>
          <div class="kpi-meta">${summary.inventory.totalUnits} stock units • ${summary.inventory.lowStockCount} low stock</div>
        </div>

        <div class="kpi-card" style="padding: 16px;">
          <div class="kpi-label" style="font-size: 0.75rem;">Customer Receivables (Debtors)</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: ${summary.receivables > 0 ? 'var(--color-warning)' : 'var(--navy-dark)'}; margin: 4px 0;">
            ${formatCurrency(summary.receivables, cur)}
          </div>
          <div class="kpi-meta"><a href="javascript:void(0)" onclick="State.setView('customers')">View debtor ledger &rarr;</a></div>
        </div>

        <div class="kpi-card" style="padding: 16px;">
          <div class="kpi-label" style="font-size: 0.75rem;">Supplier Payables (Creditors)</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: ${summary.payables > 0 ? 'var(--color-danger)' : 'var(--navy-dark)'}; margin: 4px 0;">
            ${formatCurrency(summary.payables, cur)}
          </div>
          <div class="kpi-meta"><a href="javascript:void(0)" onclick="State.setView('suppliers')">View creditor ledger &rarr;</a></div>
        </div>
      </div>

      <!-- Two-Column Section: Sales Trend & Low Stock Alerts -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Sales Trend Chart -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <div class="card-title">7-Day Sales Trend</div>
              <div class="card-subtitle">Verified transaction volume</div>
            </div>
          </div>
          ${renderSalesTrendChartSvg(salesTrend, cur)}
        </div>

        <!-- Stock Health & Alerts -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <div class="card-title">Low Stock Warnings</div>
              <div class="card-subtitle">${summary.inventory.lowStockCount} items need restock</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="State.setView('products')">Catalog</button>
          </div>
          <div>
            ${lowStockProducts.length === 0 ? `
              <div style="text-align: center; padding: 24px 0; color: var(--color-success); font-weight: 600; font-size: 0.9rem;">
                ✓ All products are currently well-stocked!
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${lowStockProducts.map(p => `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--color-warning-bg); border-radius: var(--radius-md); border: 1px solid #FDE68A;">
                    <div>
                      <div style="font-weight: 700; font-size: 0.85rem; color: #92400E;">${p.name}</div>
                      <div style="font-size: 0.75rem; color: #B45309;">Stock: ${p.current_stock} ${p.unit} (Alert at ${p.reorder_level})</div>
                    </div>
                    <button class="btn btn-primary btn-sm" style="padding: 4px 8px; font-size: 0.72rem;" onclick="State.setView('purchases')">Restock</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Recent Sales Section -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Transactions</div>
            <div class="card-subtitle">Latest recorded sales and customer orders</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="State.setView('sales')">View All Sales</button>
        </div>

        ${recentSales.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-title">No sales recorded yet</div>
            <div class="empty-state-desc">Start by ringing up your first sale in the Point of Sale module.</div>
            <button class="btn btn-primary" onclick="State.setView('pos')">Create First Sale</button>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentSales.map(s => `
                  <tr>
                    <td style="font-weight: 750; color: var(--blue-primary);">${s.invoice_number}</td>
                    <td>${s.customer_name || 'Walk-in Customer'}</td>
                    <td style="font-weight: 750;">${formatCurrency(s.total_amount, cur)}</td>
                    <td style="text-transform: capitalize;">${s.payment_method.replace('_', ' ')}</td>
                    <td>
                      <span class="badge ${s.payment_status === 'paid' ? 'badge-success' : (s.payment_status === 'partial' ? 'badge-warning' : 'badge-danger')}">
                        ${s.payment_status}
                      </span>
                    </td>
                    <td>${formatDate(s.sale_date)}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="showReceiptModal(${s.id})">Receipt</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--color-danger); font-weight: 700; margin-bottom: 12px;">Failed to load dashboard metrics: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderDashboard()">Retry</button>
      </div>
    `;
  }
}

// Clean SVG Bar Chart for 7-day Sales Trend
function renderSalesTrendChartSvg(salesTrend, cur) {
  if (!salesTrend || salesTrend.length === 0) {
    return `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No sales data recorded over the past 7 days.</div>`;
  }

  const maxVal = Math.max(...salesTrend.map(d => d.revenue), 1000);
  const chartHeight = 160;
  const chartWidth = 500;
  const barWidth = 32;
  const spacing = (chartWidth - (salesTrend.length * barWidth)) / (salesTrend.length + 1);

  let barsSvg = '';
  salesTrend.forEach((item, index) => {
    const x = spacing + (index * (barWidth + spacing));
    const barHeight = Math.max(4, Math.round((item.revenue / maxVal) * chartHeight));
    const y = chartHeight - barHeight;
    const shortDate = item.date.substring(5);

    barsSvg += `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="#0A58CA" fill-opacity="0.85">
          <title>${item.date}: ${formatCurrency(item.revenue, cur)} (${item.transactions} sales)</title>
        </rect>
        <text x="${x + (barWidth / 2)}" y="${chartHeight + 16}" font-size="10" font-family="sans-serif" font-weight="600" fill="#64748B" text-anchor="middle">
          ${shortDate}
        </text>
      </g>
    `;
  });

  return `
    <div style="width: 100%; overflow-x: auto; padding: 10px 0;">
      <svg viewBox="0 0 ${chartWidth} ${chartHeight + 24}" style="width: 100%; max-height: 200px; display: block;">
        <!-- Grid lines -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="#E2E8F0" stroke-width="1"/>
        <line x1="0" y1="${chartHeight / 2}" x2="${chartWidth}" y2="${chartHeight / 2}" stroke="#F1F5F9" stroke-width="1" stroke-dasharray="4"/>
        ${barsSvg}
      </svg>
    </div>
  `;
}
