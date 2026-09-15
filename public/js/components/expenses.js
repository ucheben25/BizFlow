/**
 * BizFlow Expense Management & Breakdown
 */

const STANDARD_EXPENSE_CATEGORIES = [
  'Transportation & Delivery',
  'Electricity & Utilities',
  'Rent',
  'Salaries & Wages',
  'Fuel & Generator',
  'Internet & Phone',
  'Repairs & Maintenance',
  'Advertising & Marketing',
  'Packaging & Supplies',
  'Bank Charges & POS Fees',
  'Miscellaneous Expenses'
];

async function renderExpenses() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Expense Tracking';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading expense reports...
    </div>
  `;

  try {
    const data = await API.get('/expenses?limit=100');
    const { expenses, categorySummary, totalExpenses } = data;
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Left: Expense Records -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <div class="card-title">Recorded Business Expenses</div>
              <div class="card-subtitle">
                Total Operating Outflow: <strong>${formatCurrency(totalExpenses, cur)}</strong>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="showAddExpenseModal()">+ Add Expense</button>
          </div>

          ${expenses.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-title">No expenses recorded</div>
              <div class="empty-state-desc">Record transportation, fuel, rent, and utility costs to accurately calculate your net profit.</div>
              <button class="btn btn-primary" onclick="showAddExpenseModal()">+ Add First Expense</button>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Paid Via</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenses.map(e => `
                    <tr>
                      <td style="font-weight: 750; color: var(--navy-dark);">${e.category}</td>
                      <td>${e.description || '<span style="color: var(--text-muted);">-</span>'}</td>
                      <td style="font-weight: 800; color: var(--color-danger);">${formatCurrency(e.amount, cur)}</td>
                      <td style="text-transform: capitalize;">${e.payment_method.replace('_', ' ')}</td>
                      <td>${formatDate(e.expense_date)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Right: Category Breakdown -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <div class="card-title">Spending by Category</div>
              <div class="card-subtitle">Where business money goes</div>
            </div>
          </div>

          ${categorySummary.length === 0 ? `
            <p style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding: 20px;">No expense breakdown data yet.</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${categorySummary.map(c => {
                const pct = totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0;
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                      <span style="font-weight: 700; color: var(--navy-dark);">${c.category}</span>
                      <span><strong>${formatCurrency(c.total, cur)}</strong> (${pct}%)</span>
                    </div>
                    <div style="background: #F1F5F9; height: 8px; border-radius: 4px; overflow: hidden;">
                      <div style="background: var(--blue-primary); width: ${pct}%; height: 100%;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--color-danger); font-weight: 700;">Failed to load expenses: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderExpenses()">Retry</button>
      </div>
    `;
  }
}

function showAddExpenseModal() {
  const content = `
    <form id="add-exp-form" onsubmit="event.preventDefault(); submitAddExpense();">
      <div class="form-group">
        <label class="form-label">Expense Category *</label>
        <select id="exp-category" class="form-control" required>
          ${STANDARD_EXPENSE_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Amount Spent *</label>
          <input type="number" step="0.01" min="1" id="exp-amount" class="form-control" placeholder="0.00" required>
        </div>
        <div class="form-group">
          <label class="form-label">Paid Via</label>
          <select id="exp-method" class="form-control">
            <option value="cash">Cash on Hand</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="pos">POS Terminal</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Description / Note</label>
        <input type="text" id="exp-desc" class="form-control" placeholder="e.g. EKEDC Prepaid electricity token, Diesel for shop generator">
      </div>

      <div class="form-group">
        <label class="form-label">Receipt / Transaction Reference (Optional)</label>
        <input type="text" id="exp-ref" class="form-control" placeholder="e.g. Receipt #9842">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitAddExpense()">Post Expense</button>
  `;

  openModal('Record Operating Expense', content, footer);
}

async function submitAddExpense() {
  const category = document.getElementById('exp-category').value;
  const amount = document.getElementById('exp-amount').value;
  const payment_method = document.getElementById('exp-method').value;
  const description = document.getElementById('exp-desc').value;
  const reference = document.getElementById('exp-ref').value;

  if (!category || !amount || Number(amount) <= 0) {
    showToast('Valid category and amount are required.', 'warning');
    return;
  }

  try {
    await API.post('/expenses', {
      category,
      amount: Number(amount),
      payment_method,
      description,
      reference
    });

    showToast(`Recorded expense of ${category}.`, 'success');
    closeModal();
    if (State.currentView === 'expenses') renderExpenses();
    if (State.currentView === 'dashboard') renderDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
