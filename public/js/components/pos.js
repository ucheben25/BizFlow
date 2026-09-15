/**
 * BizFlow Point of Sale (POS) & Checkout Engine
 */

let posProducts = [];
let posCategories = [];
let posCustomers = [];
let posSelectedCategory = null;

async function renderPOS() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Point of Sale (POS)';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      Loading POS register & product catalog...
    </div>
  `;

  try {
    const [prodData, catData, custData] = await Promise.all([
      API.get('/products?limit=200'),
      API.get('/categories'),
      API.get('/customers?limit=100')
    ]);

    posProducts = prodData.products || [];
    posCategories = catData.categories || [];
    posCustomers = custData.customers || [];

    // Ensure walk-in customer is default if no customer selected
    if (!State.cart.customerId && posCustomers.length > 0) {
      const defaultCust = posCustomers.find(c => c.is_default) || posCustomers[0];
      State.cart.customerId = defaultCust.id;
    }

    renderPOSLayout();
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--color-danger); font-weight: 700; margin-bottom: 12px;">Failed to initialize POS: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderPOS()">Retry</button>
      </div>
    `;
  }
}

function renderPOSLayout() {
  const container = document.getElementById('app-view');
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';

  container.innerHTML = `
    <div class="pos-layout">
      <!-- Left Column: Catalog & Products -->
      <div class="pos-catalog-section">
        <!-- Search & Filter Controls -->
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <div class="search-box" style="flex: 1;">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="pos-search-input" class="form-control search-input" placeholder="Search product name, SKU, or barcode..." oninput="handlePOSSearch(this.value)">
          </div>
          <button class="btn btn-secondary" onclick="showAddProductModal()">+ Add Product</button>
        </div>

        <!-- Category Pills -->
        <div class="category-pill-row">
          <div class="cat-pill ${posSelectedCategory === null ? 'active' : ''}" onclick="filterPOSCategory(null)">
            All Products (${posProducts.length})
          </div>
          ${posCategories.map(c => `
            <div class="cat-pill ${posSelectedCategory === c.id ? 'active' : ''}" onclick="filterPOSCategory(${c.id})">
              ${c.name}
            </div>
          `).join('')}
        </div>

        <!-- Product Grid -->
        <div class="pos-product-grid" id="pos-product-grid">
          ${renderPOSProductCards(posProducts)}
        </div>
      </div>

      <!-- Right Column: Cart & Checkout Drawer -->
      <div class="pos-cart-panel">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark);">Current Order</h2>
          <button class="btn btn-secondary btn-sm" onclick="clearCart()">Clear Cart</button>
        </div>

        <!-- Customer Selector -->
        <div style="margin-top: 14px;">
          <label class="form-label" style="font-size: 0.78rem;">Customer</label>
          <div style="display: flex; gap: 8px;">
            <select class="form-control" style="font-size: 0.85rem;" onchange="State.cart.customerId = this.value">
              ${posCustomers.map(c => `
                <option value="${c.id}" ${State.cart.customerId == c.id ? 'selected' : ''}>
                  ${c.name} ${c.outstanding_balance > 0 ? `(Owes ${formatCurrency(c.outstanding_balance, cur)})` : ''}
                </option>
              `).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" onclick="showAddCustomerModal()">+ New</button>
          </div>
        </div>

        <!-- Cart Items List -->
        <div class="cart-items-list" id="pos-cart-items">
          ${renderCartItems(cur)}
        </div>

        <!-- Cart Totals & Checkout -->
        <div class="cart-summary">
          <div class="cart-summary-row">
            <span>Subtotal</span>
            <span id="pos-subtotal">${formatCurrency(getCartSubtotal(), cur)}</span>
          </div>
          <div class="cart-summary-row">
            <span>Discount</span>
            <input type="number" min="0" value="${State.cart.discount || 0}" style="width: 80px; text-align: right; padding: 4px; border: 1px solid var(--border-color); border-radius: 4px;" onchange="updateCartDiscount(this.value)">
          </div>
          <div class="cart-summary-row total">
            <span>Total to Pay</span>
            <span id="pos-total">${formatCurrency(getCartTotal(), cur)}</span>
          </div>

          <!-- Payment Options -->
          <div style="margin: 14px 0;">
            <label class="form-label" style="font-size: 0.78rem;">Payment Method</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn btn-sm ${State.cart.paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('cash')">Cash</button>
              <button class="btn btn-sm ${State.cart.paymentMethod === 'pos' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('pos')">POS Terminal</button>
              <button class="btn btn-sm ${State.cart.paymentMethod === 'bank_transfer' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('bank_transfer')">Bank Transfer</button>
              <button class="btn btn-sm ${State.cart.paymentMethod === 'credit' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('credit')">Credit / Unpaid</button>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label class="form-label" style="font-size: 0.78rem; margin: 0;">Amount Paid Now</label>
              <a href="javascript:void(0)" style="font-size: 0.75rem; font-weight: 700;" onclick="setFullPayment()">Pay Full</a>
            </div>
            <input type="number" id="pos-paid-input" class="form-control" value="${State.cart.paidAmount !== undefined ? State.cart.paidAmount : getCartTotal()}" onchange="State.cart.paidAmount = Number(this.value)">
          </div>

          <button class="btn btn-primary btn-block" style="padding: 12px; font-size: 1rem;" onclick="processCheckout()">
            Complete Sale & Print Receipt
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPOSProductCards(products) {
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  if (products.length === 0) {
    return `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <p style="color: var(--text-muted); margin-bottom: 12px;">No products match your search or filter.</p>
        <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">+ Add New Product</button>
      </div>
    `;
  }

  return products.map(p => `
    <div class="pos-product-card" onclick="addToCart(${p.id})">
      <div>
        <div class="pos-product-name">${p.name}</div>
        <div class="pos-product-stock">
          Stock: <strong style="color: ${p.current_stock <= p.reorder_level ? 'var(--color-warning)' : 'inherit'}">${p.current_stock} ${p.unit}</strong>
        </div>
      </div>
      <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span class="pos-product-price">${formatCurrency(p.selling_price, cur)}</span>
        <button class="btn btn-primary btn-sm" style="padding: 4px 8px;" onclick="event.stopPropagation(); addToCart(${p.id})">+</button>
      </div>
    </div>
  `).join('');
}

function renderCartItems(cur) {
  if (State.cart.items.length === 0) {
    return `<div style="text-align: center; padding: 40px 10px; color: var(--text-muted); font-size: 0.88rem;">Cart is empty. Tap any product to add to order.</div>`;
  }

  return State.cart.items.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.productName}</div>
        <div class="cart-item-sub">${formatCurrency(item.unitPrice, cur)} each</div>
      </div>
      <div class="cart-qty-ctrl">
        <button class="cart-qty-btn" onclick="updateItemQty(${item.productId}, -1)">-</button>
        <span style="font-size: 0.85rem; font-weight: 700; width: 22px; text-align: center;">${item.quantity}</span>
        <button class="cart-qty-btn" onclick="updateItemQty(${item.productId}, 1)">+</button>
      </div>
      <div class="cart-item-total">${formatCurrency(item.quantity * item.unitPrice, cur)}</div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const product = posProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = State.cart.items.find(i => i.productId === productId);
  if (existing) {
    if (existing.quantity + 1 > product.current_stock && !State.currentBusiness.allowNegativeStock) {
      showToast(`Cannot exceed available stock (${product.current_stock} ${product.unit})`, 'warning');
      return;
    }
    existing.quantity++;
  } else {
    if (product.current_stock <= 0 && !State.currentBusiness.allowNegativeStock) {
      showToast(`"${product.name}" is currently out of stock!`, 'warning');
      return;
    }
    State.cart.items.push({
      productId: product.id,
      productName: product.name,
      unitPrice: product.selling_price,
      quantity: 1
    });
  }

  updateCartView();
}

function updateItemQty(productId, change) {
  const item = State.cart.items.find(i => i.productId === productId);
  if (!item) return;

  const product = posProducts.find(p => p.id === productId);
  const newQty = item.quantity + change;

  if (newQty <= 0) {
    State.cart.items = State.cart.items.filter(i => i.productId !== productId);
  } else {
    if (product && newQty > product.current_stock && !State.currentBusiness.allowNegativeStock) {
      showToast(`Cannot exceed available stock (${product.current_stock} ${product.unit})`, 'warning');
      return;
    }
    item.quantity = newQty;
  }

  updateCartView();
}

function clearCart() {
  State.cart.items = [];
  State.cart.discount = 0;
  State.cart.paidAmount = 0;
  updateCartView();
}

function getCartSubtotal() {
  return State.cart.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
}

function getCartTotal() {
  const sub = getCartSubtotal();
  const disc = Number(State.cart.discount) || 0;
  return Math.max(0, sub - disc);
}

function updateCartDiscount(val) {
  State.cart.discount = Math.max(0, Number(val) || 0);
  updateCartView();
}

function setPaymentMethod(method) {
  State.cart.paymentMethod = method;
  if (method === 'credit') {
    State.cart.paidAmount = 0;
  } else {
    State.cart.paidAmount = getCartTotal();
  }
  renderPOSLayout();
}

function setFullPayment() {
  State.cart.paidAmount = getCartTotal();
  const input = document.getElementById('pos-paid-input');
  if (input) input.value = State.cart.paidAmount;
}

function updateCartView() {
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  const cartList = document.getElementById('pos-cart-items');
  const subtotalEl = document.getElementById('pos-subtotal');
  const totalEl = document.getElementById('pos-total');
  const paidInput = document.getElementById('pos-paid-input');

  if (cartList) cartList.innerHTML = renderCartItems(cur);
  if (subtotalEl) subtotalEl.textContent = formatCurrency(getCartSubtotal(), cur);
  if (totalEl) totalEl.textContent = formatCurrency(getCartTotal(), cur);

  // Default paid amount to total if previously matched or credit not chosen
  if (State.cart.paymentMethod !== 'credit' && paidInput) {
    State.cart.paidAmount = getCartTotal();
    paidInput.value = State.cart.paidAmount;
  }
}

function filterPOSCategory(catId) {
  posSelectedCategory = catId;
  const filtered = catId === null ? posProducts : posProducts.filter(p => p.category_id === catId);
  const grid = document.getElementById('pos-product-grid');
  if (grid) grid.innerHTML = renderPOSProductCards(filtered);

  // Update pills active class
  document.querySelectorAll('.cat-pill').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
}

function handlePOSSearch(term) {
  const q = term.toLowerCase().trim();
  const filtered = posProducts.filter(p =>
    (p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.barcode && p.barcode.toLowerCase().includes(q))) &&
    (posSelectedCategory === null || p.category_id === posSelectedCategory)
  );
  const grid = document.getElementById('pos-product-grid');
  if (grid) grid.innerHTML = renderPOSProductCards(filtered);
}

async function processCheckout() {
  if (State.cart.items.length === 0) {
    showToast('Please add at least one product to the order.', 'warning');
    return;
  }

  const payload = {
    customer_id: State.cart.customerId,
    items: State.cart.items.map(i => ({
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice
    })),
    discount: State.cart.discount,
    paid_amount: State.cart.paidAmount !== undefined ? State.cart.paidAmount : getCartTotal(),
    payment_method: State.cart.paymentMethod
  };

  try {
    const res = await API.post('/sales', payload);
    showToast(`Sale recorded successfully! Invoice ${res.invoiceNumber}`, 'success');

    // Clear cart
    clearCart();

    // Show Printable Receipt Modal immediately
    showReceiptModal(res.sale.id);

    // Refresh products stock in background
    const prodData = await API.get('/products?limit=200');
    posProducts = prodData.products || [];
    renderPOSLayout();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
