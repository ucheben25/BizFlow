/**
 * BizFlow Customer & Debtor Management
 */

async function renderCustomers() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Customers (Debtors)';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading customer records...
    </div>
  `;

  try {
    const data = await API.get('/customers?limit=100');
    const customers = data.customers || [];
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

    const totalDebtors = customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Customer Ledger & Receivables</div>
            <div class="card-subtitle">
              Total Outstanding Receivables: <strong style="color: ${totalDebtors > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">${formatCurrency(totalDebtors, cur)}</strong>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="showAddCustomerModal()">+ Add Customer</button>
        </div>

        ${customers.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-title">No customer profiles yet</div>
            <div class="empty-state-desc">Track customer phone numbers, addresses, sales volume, and outstanding balances.</div>
            <button class="btn btn-primary" onclick="showAddCustomerModal()">Add Customer</button>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Total Orders</th>
                  <th>Lifetime Sales</th>
                  <th>Current Debt Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${customers.map(c => `
                  <tr>
                    <td>
                      <div style="font-weight: 750; color: var(--navy-dark);">${c.name}</div>
                      ${c.is_default ? '<span class="badge badge-info" style="font-size: 0.65rem;">Default Walk-in</span>' : ''}
                    </td>
                    <td>${c.phone || '<span style="color: var(--text-muted);">-</span>'}</td>
                    <td>${c.total_orders || 0}</td>
                    <td style="font-weight: 600;">${formatCurrency(c.lifetime_sales, cur)}</td>
                    <td style="font-weight: 800; color: ${c.outstanding_balance > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
                      ${formatCurrency(c.outstanding_balance, cur)}
                    </td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        ${c.outstanding_balance > 0 ? `
                          <button class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 0.78rem;"
                                  onclick="showCustomerPaymentModal(${c.id}, '${c.name}', ${c.outstanding_balance})">
                            Record Payment
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm" onclick="showCustomerDetailModal(${c.id})">Details</button>
                      </div>
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
        <p style="color: var(--color-danger); font-weight: 700;">Failed to load customers: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderCustomers()">Retry</button>
      </div>
    `;
  }
}

function showAddCustomerModal() {
  const content = `
    <form id="add-cust-form" onsubmit="event.preventDefault(); submitAddCustomer();">
      <div class="form-group">
        <label class="form-label">Customer / Company Name *</label>
        <input type="text" id="cust-name" class="form-control" placeholder="e.g. Alhaji Sani, Apex Bakery" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" id="cust-phone" class="form-control" placeholder="e.g. 08031234567">
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="cust-email" class="form-control" placeholder="e.g. client@gmail.com">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Address / Location</label>
        <input type="text" id="cust-address" class="form-control" placeholder="e.g. 15 Commercial Avenue">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitAddCustomer()">Save Customer</button>
  `;

  openModal('Add Customer Profile', content, footer);
}

async function submitAddCustomer() {
  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const email = document.getElementById('cust-email').value;
  const address = document.getElementById('cust-address').value;

  if (!name.trim()) return;

  try {
    const res = await API.post('/customers', { name, phone, email, address });
    showToast(`Customer "${name}" added.`, 'success');
    closeModal();
    if (State.currentView === 'customers') renderCustomers();
    if (State.currentView === 'pos') renderPOS();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showCustomerPaymentModal(customerId, customerName, outstandingBalance) {
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

  const content = `
    <div>
      <div style="background: var(--color-warning-bg); padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #FDE68A;">
        <div style="font-weight: 800; color: #92400E;">${customerName}</div>
        <div style="font-size: 0.85rem; color: #B45309;">
          Current Total Debt: <strong>${formatCurrency(outstandingBalance, cur)}</strong>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Amount Paid *</label>
        <input type="number" step="0.01" min="1" id="cust-pay-amount" class="form-control" value="${outstandingBalance}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Channel</label>
        <select id="cust-pay-method" class="form-control">
          <option value="cash">Cash on Hand</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="pos">POS Terminal</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Notes / Reference</label>
        <input type="text" id="cust-pay-notes" class="form-control" placeholder="e.g. Bank transfer ref, cash receipt">
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitCustomerPayment(${customerId})">Post Payment to Ledger</button>
  `;

  openModal(`Record Payment from ${customerName}`, content, footer);
}

async function submitCustomerPayment(customerId) {
  const amount = document.getElementById('cust-pay-amount').value;
  const payment_method = document.getElementById('cust-pay-method').value;
  const notes = document.getElementById('cust-pay-notes').value;

  try {
    const res = await API.post(`/customers/${customerId}/payments`, {
      amount: Number(amount),
      payment_method,
      notes
    });

    showToast(res.message, 'success');
    closeModal();
    renderCustomers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showCustomerDetailModal(customerId) {
  try {
    const data = await API.get(`/customers/${customerId}`);
    const { customer, sales, payments } = data;
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

    const content = `
      <div>
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark);">${customer.name}</h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary);">
            Phone: ${customer.phone || 'N/A'} • Address: ${customer.address || 'N/A'}
          </p>
          <div style="margin-top: 8px; font-weight: 700; font-size: 0.95rem;">
            Outstanding Balance: <span style="color: ${customer.outstanding_balance > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${formatCurrency(customer.outstanding_balance, cur)}</span>
          </div>
        </div>

        <h4 style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Order History (${sales.length})</h4>
        <div style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 16px;">
          <table class="data-table" style="font-size: 0.8rem;">
            <thead>
              <tr><th>Invoice</th><th>Amount</th><th>Paid</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              ${sales.map(s => `
                <tr>
                  <td style="font-weight: 700; color: var(--blue-primary);">${s.invoice_number}</td>
                  <td>${formatCurrency(s.total_amount, cur)}</td>
                  <td>${formatCurrency(s.paid_amount, cur)}</td>
                  <td><span class="badge ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">${s.payment_status}</span></td>
                  <td>${formatDate(s.sale_date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    openModal(`Customer Account: ${customer.name}`, content, `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Done</button>`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
