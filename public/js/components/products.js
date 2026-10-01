/**
 * BizBook Products, Categories, and Inventory Stock Adjustment
 * Full RBAC & Permission Enforcement, View/Edit/Delete Categories & Products
 */

let allProductsList = [];
let allCategoriesList = [];
let activeCategoryFilter = '';

function canUserManageProducts() {
  const biz = State.currentBusiness;
  if (!biz) return false;
  const role = (biz.role || 'staff').toLowerCase();
  const perms = Array.isArray(biz.permissions) ? biz.permissions : [];
  return ['owner', 'admin', 'manager'].includes(role) || perms.includes('all') || perms.includes('manage_products') || perms.includes('products');
}

function canUserManageCategories() {
  const biz = State.currentBusiness;
  if (!biz) return false;
  const role = (biz.role || 'staff').toLowerCase();
  const perms = Array.isArray(biz.permissions) ? biz.permissions : [];
  return ['owner', 'admin', 'manager'].includes(role) || perms.includes('all') || perms.includes('manage_categories') || perms.includes('categories');
}

async function renderProducts() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Products & Inventory';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading products catalog...
    </div>
  `;

  try {
    const [prodData, catData] = await Promise.all([
      API.get('/products?limit=250'),
      API.get('/categories')
    ]);

    allProductsList = prodData.products || [];
    allCategoriesList = catData.categories || [];
    const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
    const canManageProd = canUserManageProducts();
    const canManageCat = canUserManageCategories();

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Products & Inventory Valuation</div>
            <div class="card-subtitle">Weighted Average Costing (WAC) & Real-time Stock Levels</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="showCategoryManagerModal()">
              Categories (${allCategoriesList.length})
            </button>
            ${canManageProd ? `
              <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">+ Add Product</button>
            ` : `
              <span class="badge badge-neutral" style="font-size: 0.72rem; padding: 6px 10px;" title="Operational staff view">
                Catalog (View Only)
              </span>
            `}
          </div>
        </div>

        <!-- Filter bar -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;">
          <div class="search-box" style="flex: 1; min-width: min(100%, 200px);">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="product-search-input" class="form-control search-input" placeholder="Search product name, SKU, or barcode..." oninput="handleProductSearch(this.value)">
          </div>

          <!-- Category filter -->
          <div style="min-width: 140px;">
            <select id="product-category-filter" class="form-control" style="font-size: 0.85rem;" onchange="handleProductCategoryFilter(this.value)">
              <option value="">All Categories (${allCategoriesList.length})</option>
              ${allCategoriesList.map(c => `
                <option value="${c.id}" ${activeCategoryFilter === String(c.id) ? 'selected' : ''}>${c.name}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="filterProductView('all')">All (${allProductsList.length})</button>
            <button class="btn btn-secondary btn-sm" style="color: var(--color-warning);" onclick="filterProductView('low_stock')">Low Stock</button>
            <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="filterProductView('out_of_stock')">Out of Stock</button>
          </div>
        </div>

        ${allProductsList.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-title">No products in inventory</div>
            <div class="empty-state-desc">Add your first product to start tracking inventory, costs, and selling prices.</div>
            ${canManageProd ? `
              <button class="btn btn-primary" onclick="showAddProductModal()">+ Add First Product</button>
            ` : ''}
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table" id="products-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Cost Price (WAC)</th>
                  <th>Selling Price</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Total Valuation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${allProductsList.map(p => {
                  const val = (p.current_stock * p.cost_price);
                  let badge = 'badge-success';
                  if (p.current_stock <= 0) badge = 'badge-danger';
                  else if (p.current_stock <= p.reorder_level) badge = 'badge-warning';

                  return `
                    <tr data-product-id="${p.id}" data-category-id="${p.category_id || ''}" data-stock-level="${p.current_stock <= 0 ? 'out_of_stock' : (p.current_stock <= p.reorder_level ? 'low_stock' : 'normal')}">
                      <td>
                        <div style="font-weight: 750; color: var(--navy-dark); cursor: pointer;" onclick="showViewProductModal(${p.id})">${p.name}</div>
                        ${p.sku ? `<span style="font-size: 0.72rem; color: var(--text-muted);">SKU: ${p.sku}</span>` : ''}
                      </td>
                      <td>${p.category_name || '<span style="color: #94A3B8;">Uncategorized</span>'}</td>
                      <td>${formatCurrency(p.cost_price, cur)}</td>
                      <td style="font-weight: 700; color: var(--blue-primary);">${formatCurrency(p.selling_price, cur)}</td>
                      <td>
                        <span class="badge ${badge}">
                          ${p.current_stock} ${p.unit}
                        </span>
                      </td>
                      <td>${p.reorder_level} ${p.unit}</td>
                      <td style="font-weight: 700;">${formatCurrency(val, cur)}</td>
                      <td>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                          <button class="btn btn-secondary btn-sm" title="View Details" onclick="showViewProductModal(${p.id})">View</button>
                          ${canManageProd ? `
                            <button class="btn btn-secondary btn-sm" title="Adjust Stock" onclick="showStockAdjustModal(${p.id})">Adjust</button>
                            <button class="btn btn-secondary btn-sm" title="Edit" onclick="showEditProductModal(${p.id})">Edit</button>
                            <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" title="Archive" onclick="handleArchiveProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">&times;</button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--color-danger); font-weight: 700;">Failed to load products: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderProducts()">Retry</button>
      </div>
    `;
  }
}

// View Product Details Modal (Accessible to all roles)
async function showViewProductModal(productId) {
  const p = allProductsList.find(item => item.id === productId);
  if (!p) return;
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  const margin = p.selling_price > 0 ? (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(1) : '0.0';

  let movementsHtml = '<div style="font-size: 0.8rem; color: var(--text-muted); padding: 8px 0;">Loading stock movement history...</div>';

  const content = `
    <div id="view-product-details">
      <!-- Product Summary Box -->
      <div style="background: var(--blue-subtle); padding: 16px; border-radius: var(--radius-md); border: 1px solid #D0E2FF; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-dark);">${p.name}</h3>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
              Category: <strong>${p.category_name || 'Uncategorized'}</strong> • Unit: <strong>${p.unit}</strong>
            </div>
          </div>
          <span class="badge ${p.current_stock <= 0 ? 'badge-danger' : (p.current_stock <= p.reorder_level ? 'badge-warning' : 'badge-success')}" style="font-size: 0.8rem;">
            ${p.current_stock} ${p.unit} in stock
          </span>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="padding: 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Cost Price (WAC)</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--navy-dark); margin-top: 2px;">${formatCurrency(p.cost_price, cur)}</div>
        </div>
        <div style="padding: 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Selling Price</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--blue-primary); margin-top: 2px;">${formatCurrency(p.selling_price, cur)}</div>
        </div>
        <div style="padding: 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Gross Margin</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: ${Number(margin) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; margin-top: 2px;">${margin}%</div>
        </div>
        <div style="padding: 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Valuation</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--navy-dark); margin-top: 2px;">${formatCurrency(p.current_stock * p.cost_price, cur)}</div>
        </div>
      </div>

      <!-- Product Codes -->
      <div style="display: flex; gap: 16px; margin-bottom: 20px; font-size: 0.85rem; color: var(--text-secondary); flex-wrap: wrap;">
        <div>SKU: <strong>${p.sku || 'None'}</strong></div>
        <div>Barcode: <strong>${p.barcode || 'None'}</strong></div>
        <div>Reorder Safety Level: <strong>${p.reorder_level} ${p.unit}</strong></div>
      </div>

      <!-- Recent Stock Ledger Movements -->
      <div>
        <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 10px;">Recent Stock Movements</h4>
        <div id="view-movements-container">${movementsHtml}</div>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
    ${canUserManageProducts() ? `
      <button class="btn btn-primary btn-sm" onclick="closeModal(); showEditProductModal(${p.id});">Edit Product</button>
    ` : ''}
  `;

  openModal(`Product: ${p.name}`, content, footer);

  // Fetch movements asynchronously
  try {
    const detailRes = await API.get(`/products/${productId}`);
    const movements = detailRes.movements || [];
    const moveEl = document.getElementById('view-movements-container');
    if (moveEl) {
      if (movements.length === 0) {
        moveEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted);">No stock movements recorded yet.</div>';
      } else {
        moveEl.innerHTML = `
          <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
            <table class="data-table" style="font-size: 0.78rem;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Stock After</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${movements.map(m => `
                  <tr>
                    <td>${formatDate(m.created_at)}</td>
                    <td style="text-transform: capitalize;">${(m.transaction_type || '').replace('_', ' ')}</td>
                    <td style="font-weight: 700; color: ${m.quantity >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                      ${m.quantity >= 0 ? '+' : ''}${m.quantity}
                    </td>
                    <td>${m.new_stock}</td>
                    <td>${m.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  } catch (e) {
    const moveEl = document.getElementById('view-movements-container');
    if (moveEl) moveEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted);">Could not load movement history.</div>';
  }
}

// Add Product Modal
function showAddProductModal() {
  if (!canUserManageProducts()) {
    showToast('Permission restricted: Only owners, admins, and managers can create products.', 'warning');
    return;
  }

  const content = `
    <form id="add-product-form" onsubmit="event.preventDefault(); submitAddProduct();">
      <div class="form-group">
        <label class="form-label">Product Name *</label>
        <input type="text" id="p-name" class="form-control" placeholder="e.g. Peak Milk 400g, Dangote Sugar 50kg..." required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="p-category" class="form-control">
            <option value="">-- None / Select --</option>
            ${allCategoriesList.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Measurement Unit</label>
          <input type="text" id="p-unit" class="form-control" value="unit" placeholder="e.g. bag, carton, pcs, kg">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Cost Price (Purchase Cost) *</label>
          <input type="number" step="0.01" min="0" id="p-cost" class="form-control" placeholder="0.00" required>
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price *</label>
          <input type="number" step="0.01" min="0" id="p-price" class="form-control" placeholder="0.00" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Initial Opening Stock</label>
          <input type="number" step="1" min="0" id="p-opening-stock" class="form-control" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Reorder Alert Level</label>
          <input type="number" step="1" min="0" id="p-reorder" class="form-control" value="10">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">SKU (Optional)</label>
          <input type="text" id="p-sku" class="form-control" placeholder="e.g. PEAK-400G">
        </div>
        <div class="form-group">
          <label class="form-label">Barcode (Optional)</label>
          <input type="text" id="p-barcode" class="form-control" placeholder="Scan or enter barcode">
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" id="btn-save-product" onclick="submitAddProduct()">Save Product</button>
  `;

  openModal('Add New Product', content, footer);
}

async function submitAddProduct() {
  const nameEl = document.getElementById('p-name');
  const catEl = document.getElementById('p-category');
  const unitEl = document.getElementById('p-unit');
  const costEl = document.getElementById('p-cost');
  const priceEl = document.getElementById('p-price');
  const stockEl = document.getElementById('p-opening-stock');
  const reorderEl = document.getElementById('p-reorder');
  const skuEl = document.getElementById('p-sku');
  const barcodeEl = document.getElementById('p-barcode');
  const saveBtn = document.getElementById('btn-save-product');

  const name = nameEl ? nameEl.value.trim() : '';
  const category_id = catEl ? catEl.value : '';
  const unit = unitEl ? unitEl.value.trim() : 'unit';
  const cost_price = costEl ? costEl.value : '';
  const selling_price = priceEl ? priceEl.value : '';
  const opening_stock = stockEl ? stockEl.value : '0';
  const reorder_level = reorderEl ? reorderEl.value : '10';
  const sku = skuEl ? skuEl.value.trim() : '';
  const barcode = barcodeEl ? barcodeEl.value.trim() : '';

  if (!name) {
    showToast('Product name is required.', 'warning');
    return;
  }
  if (cost_price === '' || isNaN(cost_price) || Number(cost_price) < 0) {
    showToast('Cost price must be valid.', 'warning');
    return;
  }
  if (selling_price === '' || isNaN(selling_price) || Number(selling_price) < 0) {
    showToast('Selling price must be valid.', 'warning');
    return;
  }
  if (Number(opening_stock) < 0) {
    showToast('Stock quantity cannot be negative.', 'warning');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    await API.post('/products', {
      name,
      category_id: category_id ? Number(category_id) : null,
      unit: unit || 'unit',
      cost_price: Number(cost_price),
      selling_price: Number(selling_price),
      opening_stock: Number(opening_stock) || 0,
      reorder_level: Number(reorder_level) || 10,
      sku: sku || null,
      barcode: barcode || null
    });

    showToast(`Product "${name}" created successfully.`, 'success');
    closeModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
    }
  }
}

// Stock Adjustment Modal
function showStockAdjustModal(productId) {
  if (!canUserManageProducts()) {
    showToast('Permission restricted: Only owners, admins, and managers can adjust stock.', 'warning');
    return;
  }

  const product = allProductsList.find(p => p.id === productId);
  if (!product) return;

  const content = `
    <div>
      <div style="background: var(--blue-subtle); padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="font-weight: 800; color: var(--navy-dark);">${product.name}</div>
        <div style="font-size: 0.82rem; color: var(--text-secondary);">
          Current System Stock: <strong>${product.current_stock} ${product.unit}</strong>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Actual Physical Counted Stock *</label>
        <input type="number" id="adj-physical-stock" class="form-control" value="${product.current_stock}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Adjustment Reason *</label>
        <select id="adj-reason-select" class="form-control" onchange="document.getElementById('adj-reason-note').value = this.value">
          <option value="Physical stock count audit">Physical stock count audit</option>
          <option value="Damaged or expired inventory write-off">Damaged or expired inventory write-off</option>
          <option value="Internal theft or shrinkage loss">Internal theft or shrinkage loss</option>
          <option value="Unrecorded supplier bonus / surplus">Unrecorded supplier bonus / surplus</option>
          <option value="Other">Other custom reason</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Detailed Audit Note</label>
        <input type="text" id="adj-reason-note" class="form-control" value="Physical stock count audit">
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" id="btn-adj-stock" onclick="submitStockAdjustment(${product.id})">Commit Adjustment</button>
  `;

  openModal('Adjust Physical Stock', content, footer);
}

async function submitStockAdjustment(productId) {
  const physical_stock = document.getElementById('adj-physical-stock').value;
  const reason = document.getElementById('adj-reason-note').value;
  const btn = document.getElementById('btn-adj-stock');

  if (physical_stock === '' || isNaN(physical_stock)) {
    showToast('Valid physical stock count is required.', 'warning');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  try {
    const res = await API.post(`/products/${productId}/adjust-stock`, {
      physical_stock: Number(physical_stock),
      reason
    });

    showToast(res.message, 'success');
    closeModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Commit Adjustment';
    }
  }
}

// Edit Product Modal
function showEditProductModal(productId) {
  if (!canUserManageProducts()) {
    showToast('Permission restricted: Only owners, admins, and managers can edit products.', 'warning');
    return;
  }

  const p = allProductsList.find(item => item.id === productId);
  if (!p) return;

  const content = `
    <form id="edit-product-form" onsubmit="event.preventDefault(); submitEditProduct(${p.id});">
      <div class="form-group">
        <label class="form-label">Product Name *</label>
        <input type="text" id="edit-p-name" class="form-control" value="${p.name}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="edit-p-category" class="form-control">
            <option value="">-- None --</option>
            ${allCategoriesList.map(c => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <input type="text" id="edit-p-unit" class="form-control" value="${p.unit || 'unit'}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Cost Price *</label>
          <input type="number" step="0.01" min="0" id="edit-p-cost" class="form-control" value="${p.cost_price}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price *</label>
          <input type="number" step="0.01" min="0" id="edit-p-price" class="form-control" value="${p.selling_price}" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Reorder Level</label>
          <input type="number" step="1" min="0" id="edit-p-reorder" class="form-control" value="${p.reorder_level}">
        </div>
        <div class="form-group">
          <label class="form-label">SKU</label>
          <input type="text" id="edit-p-sku" class="form-control" value="${p.sku || ''}">
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" id="btn-update-product" onclick="submitEditProduct(${p.id})">Update Product</button>
  `;

  openModal(`Edit ${p.name}`, content, footer);
}

async function submitEditProduct(productId) {
  const name = document.getElementById('edit-p-name').value.trim();
  const category_id = document.getElementById('edit-p-category').value;
  const unit = document.getElementById('edit-p-unit').value.trim();
  const cost_price = document.getElementById('edit-p-cost').value;
  const selling_price = document.getElementById('edit-p-price').value;
  const reorder_level = document.getElementById('edit-p-reorder').value;
  const sku = document.getElementById('edit-p-sku').value.trim();
  const btn = document.getElementById('btn-update-product');

  if (!name) {
    showToast('Product name is required.', 'warning');
    return;
  }
  if (cost_price === '' || isNaN(cost_price) || Number(cost_price) < 0) {
    showToast('Cost price must be valid.', 'warning');
    return;
  }
  if (selling_price === '' || isNaN(selling_price) || Number(selling_price) < 0) {
    showToast('Selling price must be valid.', 'warning');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  }

  const payload = {
    name,
    category_id: category_id ? Number(category_id) : null,
    unit: unit || 'unit',
    cost_price: Number(cost_price),
    selling_price: Number(selling_price),
    reorder_level: Number(reorder_level) || 10,
    sku: sku || null
  };

  try {
    await API.put(`/products/${productId}`, payload);
    showToast('Product updated successfully.', 'success');
    closeModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Update Product';
    }
  }
}

async function handleArchiveProduct(productId, name) {
  if (!confirm(`Are you sure you want to archive "${name}"? It will no longer appear in the active inventory or POS catalog.`)) return;

  try {
    await API.delete(`/products/${productId}`);
    showToast(`Archived "${name}".`, 'info');
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Category Manager Modal with View, Add, Edit, Delete
function showCategoryManagerModal() {
  const canManageCat = canUserManageCategories();

  const content = `
    <div>
      ${canManageCat ? `
        <!-- Add Category Form -->
        <div style="background: var(--blue-subtle); padding: 14px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #D0E2FF;">
          <div style="font-weight: 750; font-size: 0.88rem; color: var(--navy-dark); margin-bottom: 8px;">Create New Category</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <input type="text" id="new-cat-name" class="form-control" placeholder="Category name (e.g. Beverages, Toiletries, Electronics)...">
            <input type="text" id="new-cat-desc" class="form-control" style="font-size: 0.82rem;" placeholder="Optional description...">
            <button class="btn btn-primary btn-sm" id="btn-add-cat" style="align-self: flex-start;" onclick="submitNewCategory()">+ Add Category</button>
          </div>
        </div>
      ` : `
        <div style="padding: 10px 14px; background: #F1F5F9; border-radius: 6px; font-size: 0.82rem; color: #475569; margin-bottom: 14px;">
          You have view-only access to categories. Creating or editing categories requires manager or admin permissions.
        </div>
      `}

      <!-- Category List -->
      <div style="font-weight: 750; font-size: 0.85rem; color: var(--navy-dark); margin-bottom: 8px;">Existing Categories (${allCategoriesList.length})</div>
      <div id="cat-manager-list" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
        ${allCategoriesList.length === 0 ? `
          <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">No categories created yet.</div>
        ` : allCategoriesList.map(c => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 6px; gap: 10px;">
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: 0.88rem; color: var(--navy-dark);">${c.name}</div>
              ${c.description ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${c.description}</div>` : ''}
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${c.product_count || 0} active products</div>
            </div>
            ${canManageCat ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;" onclick="showEditCategoryModal(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${(c.description || '').replace(/'/g, "\\'")}')">Edit</button>
                <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem; color: var(--color-danger);" onclick="handleDeleteCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')">&times;</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  openModal('Manage Product Categories', content, `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Done</button>`);
}

async function submitNewCategory() {
  const nameInput = document.getElementById('new-cat-name');
  const descInput = document.getElementById('new-cat-desc');
  const addBtn = document.getElementById('btn-add-cat');
  if (!nameInput || !nameInput.value.trim()) {
    showToast('Category name is required.', 'warning');
    return;
  }

  const name = nameInput.value.trim();
  const description = descInput ? descInput.value.trim() : null;

  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';
  }

  try {
    await API.post('/categories', { name, description });
    showToast(`Category "${name}" created.`, 'success');
    closeModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = '+ Add Category';
    }
  }
}

function showEditCategoryModal(categoryId, currentName, currentDesc) {
  const content = `
    <div>
      <div class="form-group">
        <label class="form-label">Category Name *</label>
        <input type="text" id="edit-cat-name" class="form-control" value="${currentName}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Description (Optional)</label>
        <input type="text" id="edit-cat-desc" class="form-control" value="${currentDesc || ''}">
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="showCategoryManagerModal()">Back</button>
    <button class="btn btn-primary btn-sm" onclick="submitEditCategory(${categoryId})">Save Changes</button>
  `;

  openModal('Edit Category', content, footer);
}

async function submitEditCategory(categoryId) {
  const nameInput = document.getElementById('edit-cat-name');
  const descInput = document.getElementById('edit-cat-desc');
  if (!nameInput || !nameInput.value.trim()) {
    showToast('Category name is required.', 'warning');
    return;
  }

  try {
    await API.put(`/categories/${categoryId}`, {
      name: nameInput.value.trim(),
      description: descInput ? descInput.value.trim() : null
    });
    showToast('Category updated successfully.', 'success');
    showCategoryManagerModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteCategory(categoryId, categoryName) {
  if (!confirm(`Are you sure you want to delete category "${categoryName}"? Existing products in this category will become uncategorized.`)) return;

  try {
    await API.delete(`/categories/${categoryId}`);
    showToast(`Category "${categoryName}" deleted.`, 'info');
    showCategoryManagerModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleProductSearch(term) {
  applyProductFilters();
}

function handleProductCategoryFilter(catId) {
  activeCategoryFilter = catId;
  applyProductFilters();
}

let activeStockFilter = 'all';
function filterProductView(type) {
  activeStockFilter = type;
  applyProductFilters();
}

function applyProductFilters() {
  const searchInput = document.getElementById('product-search-input');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const rows = document.querySelectorAll('#products-table tbody tr');

  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    const catId = r.getAttribute('data-category-id') || '';
    const level = r.getAttribute('data-stock-level');

    const matchesSearch = !q || text.includes(q);
    const matchesCategory = !activeCategoryFilter || catId === activeCategoryFilter;
    let matchesStock = true;
    if (activeStockFilter === 'low_stock') {
      matchesStock = (level === 'low_stock' || level === 'out_of_stock');
    } else if (activeStockFilter === 'out_of_stock') {
      matchesStock = (level === 'out_of_stock');
    }

    r.style.display = (matchesSearch && matchesCategory && matchesStock) ? '' : 'none';
  });
}
