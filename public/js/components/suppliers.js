/**
 * BizBook Supplier & Creditor Management
 */

async function renderSuppliers() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Suppliers (Creditors)';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading supplier records...
    </div>
  `;

  try {
    const data = await API.get('/suppliers?limit=100');
    const suppliers = data.suppliers || [];
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

    const totalCreditors = suppliers.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0);

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Supplier Creditors & Accounts Payable</div>
            <div class="card-subtitle">
              Total What Business Owes: <strong style="color: ${totalCreditors > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${formatCurrency(totalCreditors, cur)}</strong>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="showAddSupplierModal()">+ Add Supplier</button>
        </div>

        ${suppliers.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-title">No suppliers added yet</div>
            <div class="empty-state-desc">Maintain records of your vendors, distributors, and manufacturers.</div>
            <button class="btn btn-primary" onclick="showAddSupplierModal()">Add Supplier</button>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone / Email</th>
                  <th>Purchases Count</th>
                  <th>Lifetime Paid</th>
                  <th>Current Balance Owed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${suppliers.map(s => `
                  <tr>
                    <td style="font-weight: 750; color: var(--navy-dark);">${s.name}</td>
                    <td>${s.contact_person || '<span style="color: var(--text-muted);">-</span>'}</td>
                    <td>
                      <div>${s.phone || '-'}</div>
                      ${s.email ? `<div style="font-size: 0.72rem; color: var(--text-muted);">${s.email}</div>` : ''}
                    </td>
                    <td>${s.total_purchases || 0}</td>
                    <td style="font-weight: 600;">${formatCurrency(s.lifetime_spent, cur)}</td>
                    <td style="font-weight: 800; color: ${s.outstanding_balance > 0 ? 'var(--color-danger)' : 'var(--navy-dark)'};">
                      ${formatCurrency(s.outstanding_balance, cur)}
                    </td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        ${s.outstanding_balance > 0 ? `
                          <button class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 0.78rem;"
                                  onclick="showSupplierPaymentModal(${s.id}, '${s.name}', ${s.outstanding_balance})">
                            Pay Supplier
                          </button>
                        ` : ''}
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
        <p style="color: var(--color-danger); font-weight: 700;">Failed to load suppliers: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderSuppliers()">Retry</button>
      </div>
    `;
  }
}

function showAddSupplierModal() {
  const content = `
    <form id="add-sup-form" onsubmit="event.preventDefault(); submitAddSupplier();">
      <div class="form-group">
        <label class="form-label">Company / Supplier Name *</label>
        <input type="text" id="sup-name" class="form-control" placeholder="e.g. Flour Mills of Nigeria, Dangote Sugar" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Contact Person</label>
          <input type="text" id="sup-contact" class="form-control" placeholder="e.g. Sales Rep / Account Manager">
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" id="sup-phone" class="form-control" placeholder="e.g. 08023456789">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="sup-email" class="form-control" placeholder="e.g. orders@supplier.com">
      </div>
      <div class="form-group">
        <label class="form-label">Factory / Warehouse Address</label>
        <input type="text" id="sup-address" class="form-control" placeholder="e.g. Plot 4 Commercial Layout">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitAddSupplier()">Save Supplier</button>
  `;

  openModal('Add Supplier', content, footer);
}

async function submitAddSupplier() {
  const name = document.getElementById('sup-name').value;
  const contact_person = document.getElementById('sup-contact').value;
  const phone = document.getElementById('sup-phone').value;
  const email = document.getElementById('sup-email').value;
  const address = document.getElementById('sup-address').value;

  if (!name.trim()) return;

  try {
    await API.post('/suppliers', { name, contact_person, phone, email, address });
    showToast(`Supplier "${name}" added.`, 'success');
    closeModal();
    if (State.currentView === 'suppliers') renderSuppliers();
    if (State.currentView === 'purchases') renderPurchases();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showSupplierPaymentModal(supplierId, supplierName, outstandingBalance) {
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

  const content = `
    <div>
      <div style="background: var(--color-danger-bg); padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #FECACA;">
        <div style="font-weight: 800; color: #991B1B;">${supplierName}</div>
        <div style="font-size: 0.85rem; color: #B91C1C;">
          Current Accounts Payable: <strong>${formatCurrency(outstandingBalance, cur)}</strong>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Amount Paid *</label>
        <input type="number" step="0.01" min="1" id="sup-pay-amount" class="form-control" value="${outstandingBalance}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Disbursement Channel</label>
        <select id="sup-pay-method" class="form-control">
          <option value="bank_transfer">Bank Transfer (Corporate Account)</option>
          <option value="cash">Cash on Hand</option>
          <option value="pos">POS Terminal</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Reference / Receipt Number</label>
        <input type="text" id="sup-pay-notes" class="form-control" placeholder="e.g. Bank NIP transfer session ID">
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitSupplierPayment(${supplierId})">Post Disbursement to Ledger</button>
  `;

  openModal(`Pay Supplier ${supplierName}`, content, footer);
}

async function submitSupplierPayment(supplierId) {
  const amount = document.getElementById('sup-pay-amount').value;
  const payment_method = document.getElementById('sup-pay-method').value;
  const notes = document.getElementById('sup-pay-notes').value;

  try {
    const res = await API.post(`/suppliers/${supplierId}/payments`, {
      amount: Number(amount),
      payment_method,
      notes
    });

    showToast(res.message, 'success');
    closeModal();
    renderSuppliers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
