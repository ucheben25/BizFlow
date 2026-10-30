/**
 * BizBook Point of Sale (POS) & Checkout Engine
 */

let posProducts = [];
let posCategories = [];
let posCustomers = [];
let posSelectedCategory = null;
let posMobileTab = 'catalog'; // 'catalog' or 'cart'

async function renderPOS() {
  document.body.classList.add('pos-mode-active');
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

function setPOSMobileTab(tab) {
  posMobileTab = tab;
  const layout = document.querySelector('.pos-layout');
  if (layout) {
    if (tab === 'catalog') {
      layout.classList.add('view-catalog');
      layout.classList.remove('view-cart');
    } else {
      layout.classList.add('view-cart');
      layout.classList.remove('view-catalog');
    }
  }

  // Update tab buttons
  document.querySelectorAll('.pos-mobile-tab-btn').forEach((btn, idx) => {
    if ((idx === 0 && tab === 'catalog') || (idx === 1 && tab === 'cart')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update floating bar visibility
  const floatingBar = document.getElementById('pos-mobile-floating-bar');
  const cartItemCount = State.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  if (floatingBar) {
    floatingBar.style.display = (cartItemCount > 0 && tab === 'catalog') ? 'flex' : 'none';
  }
}

function renderPOSLayout() {
  const container = document.getElementById('app-view');
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  const cartItemCount = State.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = getCartTotal();

  container.innerHTML = `
    <!-- Mobile Segmented Navigation (visible on mobile / <= 768px) -->
    <div class="pos-mobile-nav">
      <button type="button" class="pos-mobile-tab-btn ${posMobileTab === 'catalog' ? 'active' : ''}" onclick="setPOSMobileTab('catalog')">
        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        <span>Products (${posProducts.length})</span>
      </button>
      <button type="button" class="pos-mobile-tab-btn ${posMobileTab === 'cart' ? 'active' : ''}" onclick="setPOSMobileTab('cart')">
        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        <span>Order (<strong id="pos-mobile-order-badge">${cartItemCount}</strong>)</span>
        <span class="pos-mobile-cart-badge" id="pos-mobile-order-total">${formatCurrency(cartTotal, cur)}</span>
      </button>
    </div>

    <div class="pos-layout ${posMobileTab === 'catalog' ? 'view-catalog' : 'view-cart'}">
      <!-- Left Column: Catalog & Products -->
      <div class="pos-catalog-section">
        <!-- Search & Filter Controls -->
        <div class="pos-catalog-header">
          <div class="search-box" style="flex: 1;">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="pos-search-input" class="form-control search-input" placeholder="Search product name, SKU, or barcode..." oninput="handlePOSSearch(this.value)">
          </div>
          <button class="btn btn-secondary" style="white-space: nowrap;" onclick="showAddProductModal()">+ Add Product</button>
        </div>

        <!-- Category Pills -->
        <div class="category-pill-row">
          <div class="cat-pill ${posSelectedCategory === null ? 'active' : ''}" data-cat-id="all" onclick="filterPOSCategory(null)">
            All Products (${posProducts.length})
          </div>
          ${posCategories.map(c => `
            <div class="cat-pill ${posSelectedCategory === c.id ? 'active' : ''}" data-cat-id="${c.id}" onclick="filterPOSCategory(${c.id})">
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
        <div class="pos-cart-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-secondary btn-sm pos-back-btn" onclick="setPOSMobileTab('catalog')" title="Back to Products Catalog">
              &larr; Products
            </button>
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark); margin: 0;">Current Order</h2>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="clearCart()">Clear Cart</button>
        </div>

        <!-- Customer Selector -->
        <div class="pos-cart-customer">
          <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">Customer</label>
          <div style="display: flex; gap: 8px;">
            <select class="form-control" style="font-size: 0.85rem; flex: 1;" onchange="State.cart.customerId = this.value">
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
          <div style="margin: 10px 0;">
            <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">Payment Method</label>
            <div class="payment-method-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <button type="button" class="btn btn-sm ${State.cart.paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('cash')">Cash</button>
              <button type="button" class="btn btn-sm ${State.cart.paymentMethod === 'pos' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('pos')">POS Terminal</button>
              <button type="button" class="btn btn-sm ${State.cart.paymentMethod === 'bank_transfer' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('bank_transfer')">Bank Transfer</button>
              <button type="button" class="btn btn-sm ${State.cart.paymentMethod === 'credit' ? 'btn-primary' : 'btn-secondary'}" onclick="setPaymentMethod('credit')">Credit / Unpaid</button>
            </div>
          </div>

          <div class="pos-paid-wrapper" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label class="form-label" style="font-size: 0.78rem; margin: 0;">Amount Paid Now</label>
              <a href="javascript:void(0)" style="font-size: 0.75rem; font-weight: 700; color: var(--blue-primary);" onclick="setFullPayment()">Pay Full</a>
            </div>
            <input type="number" id="pos-paid-input" class="form-control" value="${State.cart.paidAmount !== undefined ? State.cart.paidAmount : getCartTotal()}" onchange="State.cart.paidAmount = Number(this.value)">
          </div>

          <button class="btn btn-primary btn-block pos-checkout-btn" style="padding: 12px; font-size: 1rem; font-weight: 800;" onclick="processCheckout()">
            Complete Sale & Print Receipt
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Floating Order Bar (visible on mobile catalog tab when items present) -->
    <div id="pos-mobile-floating-bar" class="pos-mobile-floating-bar" style="display: ${(cartItemCount > 0 && posMobileTab === 'catalog') ? 'flex' : 'none'};" onclick="setPOSMobileTab('cart')">
      <div class="pos-floating-left">
        <span class="pos-floating-badge" id="pos-float-count">${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}</span>
        <span class="pos-floating-total" id="pos-float-total">${formatCurrency(cartTotal, cur)}</span>
      </div>
      <div class="pos-floating-right">
        <span>Review Order & Pay</span>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
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

  const cartTotal = getCartTotal();
  const cartItemCount = State.cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (cartList) cartList.innerHTML = renderCartItems(cur);
  if (subtotalEl) subtotalEl.textContent = formatCurrency(getCartSubtotal(), cur);
  if (totalEl) totalEl.textContent = formatCurrency(cartTotal, cur);

  // Default paid amount to total if previously matched or credit not chosen
  if (State.cart.paymentMethod !== 'credit' && paidInput) {
    State.cart.paidAmount = cartTotal;
    paidInput.value = State.cart.paidAmount;
  }

  // Update mobile tab indicators
  const mobileOrderBadge = document.getElementById('pos-mobile-order-badge');
  if (mobileOrderBadge) mobileOrderBadge.textContent = cartItemCount;

  const mobileOrderTotal = document.getElementById('pos-mobile-order-total');
  if (mobileOrderTotal) mobileOrderTotal.textContent = formatCurrency(cartTotal, cur);

  // Update mobile floating bar
  const floatingBar = document.getElementById('pos-mobile-floating-bar');
  if (floatingBar) {
    floatingBar.style.display = (cartItemCount > 0 && posMobileTab === 'catalog') ? 'flex' : 'none';
    const floatCount = document.getElementById('pos-float-count');
    if (floatCount) floatCount.textContent = `${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}`;
    const floatTotal = document.getElementById('pos-float-total');
    if (floatTotal) floatTotal.textContent = formatCurrency(cartTotal, cur);
  }
}

function filterPOSCategory(catId) {
  posSelectedCategory = catId;
  const filtered = catId === null ? posProducts : posProducts.filter(p => p.category_id === catId);
  const grid = document.getElementById('pos-product-grid');
  if (grid) grid.innerHTML = renderPOSProductCards(filtered);

  // Update pills active class using data-cat-id
  document.querySelectorAll('.cat-pill').forEach(el => {
    const id = el.getAttribute('data-cat-id');
    if ((catId === null && id === 'all') || String(id) === String(catId)) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
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

    // Reset mobile view to catalog tab
    if (posMobileTab !== 'catalog') {
      setPOSMobileTab('catalog');
    }

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
