/**
 * BizFlow Products, Categories, and Inventory Stock Adjustment
 */

let allProductsList = [];
let allCategoriesList = [];

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

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Products & Inventory Valuation</div>
            <div class="card-subtitle">Weighted Average Costing (WAC) & Real-time Stock Levels</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="showCategoryManagerModal()">Categories</button>
            <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">+ Add Product</button>
          </div>
        </div>

        <!-- Filter bar -->
        <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
          <div class="search-box" style="flex: 1; min-width: 220px;">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="form-control search-input" placeholder="Search product name, SKU, or barcode..." oninput="handleProductSearch(this.value)">
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="filterProductView('all')">All (${allProductsList.length})</button>
            <button class="btn btn-secondary btn-sm" style="color: var(--color-warning);" onclick="filterProductView('low_stock')">Low Stock</button>
            <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="filterProductView('out_of_stock')">Out of Stock</button>
          </div>
        </div>

        ${allProductsList.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-title">No products in inventory</div>
            <div class="empty-state-desc">Add your first product to start tracking inventory, costs, and selling prices.</div>
            <button class="btn btn-primary" onclick="showAddProductModal()">+ Add First Product</button>
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
                    <tr data-stock-level="${p.current_stock <= 0 ? 'out_of_stock' : (p.current_stock <= p.reorder_level ? 'low_stock' : 'normal')}">
                      <td>
                        <div style="font-weight: 750; color: var(--navy-dark);">${p.name}</div>
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
                        <div style="display: flex; gap: 6px;">
                          <button class="btn btn-secondary btn-sm" title="Adjust Stock" onclick="showStockAdjustModal(${p.id})">Adjust</button>
                          <button class="btn btn-secondary btn-sm" title="Edit" onclick="showEditProductModal(${p.id})">Edit</button>
                          <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" title="Archive" onclick="handleArchiveProduct(${p.id}, '${p.name}')">&times;</button>
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

// Add Product Modal
function showAddProductModal() {
  const content = `
    <form id="add-product-form" onsubmit="event.preventDefault(); submitAddProduct();">
      <div class="form-group">
        <label class="form-label">Product Name *</label>
        <input type="text" id="p-name" class="form-control" placeholder="e.g. Cement 50kg, Milo 1kg..." required>
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
          <input type="text" id="p-sku" class="form-control" placeholder="e.g. CEM-50KG">
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
    <button class="btn btn-primary btn-sm" onclick="submitAddProduct()">Save Product</button>
  `;

  openModal('Add New Product', content, footer);
}

async function submitAddProduct() {
  const name = document.getElementById('p-name').value;
  const category_id = document.getElementById('p-category').value;
  const unit = document.getElementById('p-unit').value;
  const cost_price = document.getElementById('p-cost').value;
  const selling_price = document.getElementById('p-price').value;
  const opening_stock = document.getElementById('p-opening-stock').value;
  const reorder_level = document.getElementById('p-reorder').value;
  const sku = document.getElementById('p-sku').value;
  const barcode = document.getElementById('p-barcode').value;

  if (!name || cost_price === '' || selling_price === '') {
    showToast('Product name, cost price, and selling price are required.', 'warning');
    return;
  }

  try {
    await API.post('/products', {
      name,
      category_id: category_id ? Number(category_id) : null,
      unit,
      cost_price: Number(cost_price),
      selling_price: Number(selling_price),
      opening_stock: Number(opening_stock),
      reorder_level: Number(reorder_level),
      sku,
      barcode
    });

    showToast(`Product "${name}" created successfully.`, 'success');
    closeModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Stock Adjustment Modal
function showStockAdjustModal(productId) {
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
    <button class="btn btn-primary btn-sm" onclick="submitStockAdjustment(${product.id})">Commit Adjustment</button>
  `;

  openModal('Adjust Physical Stock', content, footer);
}

async function submitStockAdjustment(productId) {
  const physical_stock = document.getElementById('adj-physical-stock').value;
  const reason = document.getElementById('adj-reason-note').value;

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
  }
}

// Edit Product Modal
function showEditProductModal(productId) {
  const p = allProductsList.find(item => item.id === productId);
  if (!p) return;

  const content = `
    <form id="edit-product-form" onsubmit="event.preventDefault(); submitEditProduct(${p.id});">
      <div class="form-group">
        <label class="form-label">Product Name</label>
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
          <input type="text" id="edit-p-unit" class="form-control" value="${p.unit}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Cost Price</label>
          <input type="number" step="0.01" min="0" id="edit-p-cost" class="form-control" value="${p.cost_price}">
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price</label>
          <input type="number" step="0.01" min="0" id="edit-p-price" class="form-control" value="${p.selling_price}">
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
    <button class="btn btn-primary btn-sm" onclick="submitEditProduct(${p.id})">Update Product</button>
  `;

  openModal(`Edit ${p.name}`, content, footer);
}

async function submitEditProduct(productId) {
  const payload = {
    name: document.getElementById('edit-p-name').value,
    category_id: document.getElementById('edit-p-category').value ? Number(document.getElementById('edit-p-category').value) : null,
    unit: document.getElementById('edit-p-unit').value,
    cost_price: Number(document.getElementById('edit-p-cost').value),
    selling_price: Number(document.getElementById('edit-p-price').value),
    reorder_level: Number(document.getElementById('edit-p-reorder').value),
    sku: document.getElementById('edit-p-sku').value
  };

  try {
    await API.put(`/products/${productId}`, payload);
    showToast('Product updated successfully.', 'success');
    closeModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleArchiveProduct(productId, name) {
  if (!confirm(`Are you sure you want to archive "${name}"? It will no longer appear in the POS catalog.`)) return;

  try {
    await API.delete(`/products/${productId}`);
    showToast(`Archived "${name}".`, 'info');
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Category Manager Modal
function showCategoryManagerModal() {
  const content = `
    <div>
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <input type="text" id="new-cat-name" class="form-control" placeholder="New category name (e.g. Toiletries, Beverages)...">
        <button class="btn btn-primary btn-sm" onclick="submitNewCategory()">Add</button>
      </div>
      <div style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
        ${allCategoriesList.map(c => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 6px;">
            <span style="font-weight: 600; font-size: 0.88rem;">${c.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${c.product_count || 0} products</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  openModal('Manage Product Categories', content, `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Done</button>`);
}

async function submitNewCategory() {
  const input = document.getElementById('new-cat-name');
  if (!input || !input.value.trim()) return;

  try {
    await API.post('/categories', { name: input.value.trim() });
    showToast('Category created.', 'success');
    closeModal();
    renderProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleProductSearch(term) {
  const q = term.toLowerCase().trim();
  const rows = document.querySelectorAll('#products-table tbody tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(q) ? '' : 'none';
  });
}

function filterProductView(type) {
  const rows = document.querySelectorAll('#products-table tbody tr');
  rows.forEach(r => {
    const level = r.getAttribute('data-stock-level');
    if (type === 'all') r.style.display = '';
    else if (type === 'low_stock') r.style.display = (level === 'low_stock' || level === 'out_of_stock') ? '' : 'none';
    else if (type === 'out_of_stock') r.style.display = level === 'out_of_stock' ? '' : 'none';
  });
}
