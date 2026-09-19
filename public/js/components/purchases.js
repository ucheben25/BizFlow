/**
 * BizBook Purchases & Supplier Restocking
 */

let purchaseOrdersList = [];
let purchaseSuppliersList = [];
let purchaseProductsList = [];

async function renderPurchases() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Purchases & Restock';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading purchase history & supplier orders...
    </div>
  `;

  try {
    const [poData, supData, prodData] = await Promise.all([
      API.get('/purchases?limit=100'),
      API.get('/suppliers'),
      API.get('/products?limit=250')
    ]);

    purchaseOrdersList = poData.purchases || [];
    purchaseSuppliersList = supData.suppliers || [];
    purchaseProductsList = prodData.products || [];
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Inventory Purchases & Restock Orders</div>
            <div class="card-subtitle">Automated Weighted Average Cost updates & Creditor Accounts Payable</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="showRecordPurchaseModal()">+ Record New Purchase</button>
        </div>

        ${purchaseOrdersList.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-title">No purchases recorded yet</div>
            <div class="empty-state-desc">Record purchases when receiving goods from suppliers to automatically increment inventory and update costs.</div>
            <button class="btn btn-primary" onclick="showRecordPurchaseModal()">+ Record First Purchase</button>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Total Cost</th>
                  <th>Amount Paid</th>
                  <th>Balance Due</th>
                  <th>Payment Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${purchaseOrdersList.map(po => `
                  <tr>
                    <td style="font-weight: 750; color: var(--blue-primary);">${po.purchase_number}</td>
                    <td>${po.supplier_name || '<span style="color: var(--text-muted);">Generic Supplier</span>'}</td>
                    <td style="font-weight: 750;">${formatCurrency(po.total_amount, cur)}</td>
                    <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(po.paid_amount, cur)}</td>
                    <td style="color: ${po.balance_amount > 0 ? 'var(--color-danger)' : 'inherit'}; font-weight: 600;">
                      ${formatCurrency(po.balance_amount, cur)}
                    </td>
                    <td>
                      <span class="badge ${po.payment_status === 'paid' ? 'badge-success' : (po.payment_status === 'partial' ? 'badge-warning' : 'badge-danger')}">
                        ${po.payment_status}
                      </span>
                    </td>
                    <td>${formatDate(po.purchase_date)}</td>
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
        <p style="color: var(--color-danger); font-weight: 700;">Failed to load purchases: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderPurchases()">Retry</button>
      </div>
    `;
  }
}

// Record Purchase Modal
let newPurchaseItems = [];

function showRecordPurchaseModal() {
  newPurchaseItems = [{ product_id: '', quantity: 1, unit_cost: 0 }];

  renderPurchaseModalContent();
}

function renderPurchaseModalContent() {
  const content = `
    <form id="purchase-form" onsubmit="event.preventDefault(); submitRecordPurchase();">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Supplier</label>
          <div style="display: flex; gap: 6px;">
            <select id="po-supplier-select" class="form-control">
              <option value="">-- No specific supplier / Spot buy --</option>
              ${purchaseSuppliersList.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-secondary btn-sm" onclick="showAddSupplierModal()">+ New</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select id="po-method-select" class="form-control">
            <option value="cash">Cash on Hand</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="pos">POS Settlement</option>
            <option value="credit">Credit (Pay Later)</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 0.85rem; font-weight: 800; color: var(--navy-dark);">Items Restocked</span>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addPurchaseItemRow()">+ Add Line Item</button>
      </div>

      <div id="po-items-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
        ${newPurchaseItems.map((item, idx) => `
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 30px; gap: 8px; align-items: center; background: #F8FAFC; padding: 8px; border-radius: 6px;">
            <select class="form-control" style="font-size: 0.82rem;" onchange="updatePurchaseItem(${idx}, 'product_id', this.value)">
              <option value="">-- Select Product --</option>
              ${purchaseProductsList.map(p => `
                <option value="${p.id}" ${item.product_id == p.id ? 'selected' : ''}>
                  ${p.name} (Current Cost: ${p.cost_price})
                </option>
              `).join('')}
            </select>

            <input type="number" min="1" class="form-control" placeholder="Qty" value="${item.quantity}"
                   onchange="updatePurchaseItem(${idx}, 'quantity', this.value)">

            <input type="number" step="0.01" min="0" class="form-control" placeholder="Unit Cost" value="${item.unit_cost}"
                   onchange="updatePurchaseItem(${idx}, 'unit_cost', this.value)">

            <button type="button" style="background: none; border: none; color: #EF4444; cursor: pointer; font-weight: bold;"
                    onclick="removePurchaseItemRow(${idx})">&times;</button>
          </div>
        `).join('')}
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Total Purchase Cost</label>
          <div id="po-total-display" style="font-size: 1.25rem; font-weight: 800; color: var(--navy-dark); padding: 8px 0;">
            ${formatCurrency(calcPurchaseTotal())}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Amount Paid Right Now</label>
          <input type="number" step="0.01" min="0" id="po-paid-input" class="form-control" value="${calcPurchaseTotal()}">
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitRecordPurchase()">Commit Purchase & Restock</button>
  `;

  openModal('Record Inward Restock Purchase', content, footer);
}

function addPurchaseItemRow() {
  newPurchaseItems.push({ product_id: '', quantity: 1, unit_cost: 0 });
  renderPurchaseModalContent();
}

function removePurchaseItemRow(idx) {
  newPurchaseItems.splice(idx, 1);
  if (newPurchaseItems.length === 0) newPurchaseItems.push({ product_id: '', quantity: 1, unit_cost: 0 });
  renderPurchaseModalContent();
}

function updatePurchaseItem(idx, field, value) {
  newPurchaseItems[idx][field] = value;
  if (field === 'product_id') {
    const prod = purchaseProductsList.find(p => p.id == value);
    if (prod) {
      newPurchaseItems[idx].unit_cost = prod.cost_price;
    }
  }
  const display = document.getElementById('po-total-display');
  const paidInput = document.getElementById('po-paid-input');
  if (display) display.textContent = formatCurrency(calcPurchaseTotal());
  if (paidInput) paidInput.value = calcPurchaseTotal();
}

function calcPurchaseTotal() {
  return newPurchaseItems.reduce((sum, itm) => {
    const q = Number(itm.quantity) || 0;
    const c = Number(itm.unit_cost) || 0;
    return sum + (q * c);
  }, 0);
}

async function submitRecordPurchase() {
  const supplierId = document.getElementById('po-supplier-select').value;
  const paymentMethod = document.getElementById('po-method-select').value;
  const paidAmount = document.getElementById('po-paid-input').value;

  const validItems = newPurchaseItems.filter(i => i.product_id && Number(i.quantity) > 0);
  if (validItems.length === 0) {
    showToast('Please select at least one product with quantity > 0.', 'warning');
    return;
  }

  try {
    await API.post('/purchases', {
      supplier_id: supplierId ? Number(supplierId) : null,
      payment_method: paymentMethod,
      paid_amount: Number(paidAmount),
      items: validItems.map(i => ({
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost)
      }))
    });

    showToast('Purchase recorded & stock successfully updated!', 'success');
    closeModal();
    renderPurchases();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
