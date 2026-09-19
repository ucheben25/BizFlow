/**
 * BizBook Sales History, Invoices & Receipt Generation
 */

async function renderSales() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Sales & Invoices';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading sales history...
    </div>
  `;

  try {
    const data = await API.get('/sales?limit=100');
    const sales = data.sales || [];
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Completed Sales & Invoices</div>
            <div class="card-subtitle">Permanent audit-backed transaction ledger</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="State.setView('pos')">+ New Sale</button>
        </div>

        <!-- Filter bar -->
        <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
          <div class="search-box" style="flex: 1; min-width: 220px;">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="form-control search-input" placeholder="Search invoice number or customer..." oninput="handleSalesFilter(this.value)">
          </div>
        </div>

        ${sales.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-title">No sales recorded yet</div>
            <div class="empty-state-desc">When you create a sale, invoices and receipts will appear here.</div>
            <button class="btn btn-primary" onclick="State.setView('pos')">Create First Sale</button>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table" id="sales-data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${sales.map(s => `
                  <tr style="${s.status === 'voided' ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
                    <td style="font-weight: 750; color: var(--blue-primary);">${s.invoice_number}</td>
                    <td>${s.customer_name || 'Walk-in Customer'}</td>
                    <td style="font-weight: 750;">${formatCurrency(s.total_amount, cur)}</td>
                    <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(s.paid_amount, cur)}</td>
                    <td style="color: ${s.balance_amount > 0 ? 'var(--color-danger)' : 'inherit'}; font-weight: 600;">
                      ${formatCurrency(s.balance_amount, cur)}
                    </td>
                    <td style="text-transform: capitalize;">${s.payment_method.replace('_', ' ')}</td>
                    <td>
                      ${s.status === 'voided' ? `
                        <span class="badge badge-danger">Voided</span>
                      ` : `
                        <span class="badge ${s.payment_status === 'paid' ? 'badge-success' : (s.payment_status === 'partial' ? 'badge-warning' : 'badge-danger')}">
                          ${s.payment_status}
                        </span>
                      `}
                    </td>
                    <td>${formatDate(s.sale_date)}</td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary btn-sm" onclick="showReceiptModal(${s.id})">Receipt</button>
                        ${s.status !== 'voided' ? `
                          <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="showVoidSaleModal(${s.id}, '${s.invoice_number}')">Void</button>
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
        <p style="color: var(--color-danger); font-weight: 700;">Failed to load sales: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderSales()">Retry</button>
      </div>
    `;
  }
}

// Receipt & Invoice Modal (Prints cleanly or shares via WhatsApp)
async function showReceiptModal(saleId) {
  try {
    const data = await API.get(`/sales/${saleId}`);
    const { sale, items, payments } = data;
    const cur = sale.currency_symbol || '₦';

    // Build WhatsApp text representation
    const waText = encodeURIComponent(
      `*Receipt from ${sale.business_name}*\n` +
      `Invoice: ${sale.invoice_number}\n` +
      `Date: ${formatDate(sale.sale_date)}\n` +
      `Customer: ${sale.customer_name || 'Walk-in'}\n\n` +
      `*Items:*\n` +
      items.map(i => `• ${i.product_name} x${i.quantity} @ ${cur}${i.unit_price.toLocaleString()} = ${cur}${i.total_price.toLocaleString()}`).join('\n') +
      `\n\n*Total Amount:* ${cur}${sale.total_amount.toLocaleString()}\n` +
      `*Amount Paid:* ${cur}${sale.paid_amount.toLocaleString()}\n` +
      (sale.balance_amount > 0 ? `*Balance Due:* ${cur}${sale.balance_amount.toLocaleString()}\n` : '') +
      `\nThank you for your business!`
    );

    const content = `
      <div class="receipt-paper" id="printable-receipt">
        <div class="receipt-header">
          <div class="receipt-business-name">${sale.business_name}</div>
          <div class="receipt-business-sub">
            ${sale.business_address || ''}<br>
            ${sale.business_phone ? `Tel: ${sale.business_phone}<br>` : ''}
            ${sale.business_email ? `Email: ${sale.business_email}` : ''}
          </div>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-line">
          <span>INVOICE:</span>
          <strong>${sale.invoice_number}</strong>
        </div>
        <div class="receipt-line">
          <span>DATE:</span>
          <span>${formatDate(sale.sale_date)}</span>
        </div>
        <div class="receipt-line">
          <span>CUSTOMER:</span>
          <span>${sale.customer_name || 'Walk-in Customer'}</span>
        </div>
        <div class="receipt-line">
          <span>CASHIER:</span>
          <span>${sale.cashier_name || 'Staff'}</span>
        </div>

        <div class="receipt-divider"></div>

        <div style="margin-bottom: 8px;">
          ${items.map(i => `
            <div style="margin-bottom: 6px;">
              <div style="font-weight: bold; font-size: 0.85rem;">${i.product_name}</div>
              <div class="receipt-line">
                <span>${i.quantity} ${i.unit || 'units'} @ ${formatCurrency(i.unit_price, cur)}</span>
                <strong>${formatCurrency(i.total_price, cur)}</strong>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-line">
          <span>Subtotal:</span>
          <span>${formatCurrency(sale.subtotal, cur)}</span>
        </div>
        ${sale.discount > 0 ? `
          <div class="receipt-line">
            <span>Discount:</span>
            <span>-${formatCurrency(sale.discount, cur)}</span>
          </div>
        ` : ''}
        <div class="receipt-line receipt-total">
          <span>TOTAL:</span>
          <span>${formatCurrency(sale.total_amount, cur)}</span>
        </div>
        <div class="receipt-line">
          <span>Amount Paid:</span>
          <strong>${formatCurrency(sale.paid_amount, cur)}</strong>
        </div>
        ${sale.balance_amount > 0 ? `
          <div class="receipt-line" style="color: #B91C1C; font-weight: bold;">
            <span>Balance Due:</span>
            <span>${formatCurrency(sale.balance_amount, cur)}</span>
          </div>
        ` : ''}
        <div class="receipt-line">
          <span>Payment Mode:</span>
          <span style="text-transform: capitalize;">${sale.payment_method.replace('_', ' ')}</span>
        </div>

        <div class="receipt-divider"></div>

        <div style="text-align: center; font-size: 0.75rem; margin-top: 10px;">
          Thank you for choosing ${sale.business_name}!<br>
          <em>Powered by BizBook</em>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      <a class="btn btn-secondary btn-sm" style="color: #059669; font-weight: 700;" href="https://wa.me/?text=${waText}" target="_blank">
        Share on WhatsApp
      </a>
      <button class="btn btn-primary btn-sm" onclick="window.print()">
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print Receipt
      </button>
    `;

    openModal('Receipt / Invoice', content, footer);
  } catch (err) {
    showToast('Failed to load receipt: ' + err.message, 'error');
  }
}

function showVoidSaleModal(saleId, invoiceNumber) {
  const content = `
    <div>
      <p style="font-size: 0.9rem; color: #475569; margin-bottom: 14px;">
        Are you sure you want to void sale <strong>${invoiceNumber}</strong>?
      </p>
      <div style="background: var(--color-warning-bg); border-left: 3px solid var(--color-warning); padding: 10px 14px; font-size: 0.8rem; color: #92400E; margin-bottom: 14px;">
        Voiding will return sold products back to inventory, reverse revenue and COGS, and reverse customer receivable debt.
      </div>
      <div class="form-group">
        <label class="form-label">Reason for Voiding</label>
        <textarea id="void-reason-input" class="form-control" rows="2" placeholder="e.g. Customer returned items, Cashier input error..."></textarea>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger btn-sm" onclick="submitVoidSale(${saleId})">Confirm Void</button>
  `;

  openModal(`Void Sale ${invoiceNumber}`, content, footer);
}

async function submitVoidSale(saleId) {
  const reason = document.getElementById('void-reason-input').value;
  try {
    await API.post(`/sales/${saleId}/void`, { reason });
    showToast('Sale voided and reversed successfully.', 'success');
    closeModal();
    renderSales();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleSalesFilter(term) {
  const q = term.toLowerCase().trim();
  const rows = document.querySelectorAll('#sales-data-table tbody tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(q) ? '' : 'none';
  });
}
