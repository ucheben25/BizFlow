/**
 * BizBook Authentication & Business Onboarding Wizard
 */

let authMode = 'login'; // 'login' or 'register'

function renderAuthScreen() {
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #F0F6FF 0%, #FFFFFF 100%); padding: 24px;">
      <div style="max-width: 440px; width: 100%; background: #FFFFFF; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); padding: 36px;">
        <!-- Logo & Branding Header -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; margin-bottom: 12px;">
            ${LOGO_SVG}
          </div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: var(--navy-dark); letter-spacing: -0.5px;">BizBook</h1>
          <p style="font-size: 0.82rem; font-weight: 700; color: var(--blue-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
            Run your business. Know your numbers.
          </p>
        </div>

        <!-- Auth Form Container -->
        <div id="auth-form-container">
          ${authMode === 'login' ? renderLoginFormHtml() : renderRegisterFormHtml()}
        </div>

        <!-- Demo Account Quick Login Banner -->
        <div style="margin-top: 24px; padding: 12px; background: #F8FAFC; border: 1px dashed var(--border-color); border-radius: 8px; text-align: center;">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--navy-dark); margin-bottom: 4px;">Quick Demo Evaluation:</div>
          <button type="button" class="btn btn-secondary btn-sm" style="width: 100%; font-size: 0.78rem;" onclick="fillDemoCredentials()">
            Quick Demo: Login as Admin (demo@bizbook.app)
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderLoginFormHtml() {
  return `
    <form onsubmit="event.preventDefault(); submitLogin();">
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="auth-email" class="form-control" placeholder="name@business.com" required>
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="margin: 0;">Password</label>
        </div>
        <input type="password" id="auth-password" class="form-control" placeholder="••••••••" required>
      </div>

      <button type="submit" class="btn btn-primary btn-block" id="auth-submit-btn" style="padding: 12px; font-size: 0.95rem;">
        Sign In to BizBook
      </button>

      <div style="text-align: center; margin-top: 20px; font-size: 0.85rem; color: var(--text-secondary);">
        Don't have an account?
        <a href="javascript:void(0)" style="font-weight: 700;" onclick="switchAuthMode('register')">Register here</a>
      </div>
    </form>
  `;
}

function renderRegisterFormHtml() {
  return `
    <form onsubmit="event.preventDefault(); submitRegister();">
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input type="text" id="reg-name" class="form-control" placeholder="e.g. Adebayo Ogunlesi" required>
      </div>

      <div class="form-group">
        <label class="form-label">Email Address *</label>
        <input type="email" id="reg-email" class="form-control" placeholder="adebayo@gmail.com" required>
      </div>

      <div class="form-group">
        <label class="form-label">Phone Number</label>
        <input type="tel" id="reg-phone" class="form-control" placeholder="e.g. 08031234567">
      </div>

      <div class="form-group">
        <label class="form-label">Password * (at least 6 characters)</label>
        <input type="password" id="reg-password" class="form-control" placeholder="••••••••" minlength="6" required>
      </div>

      <button type="submit" class="btn btn-primary btn-block" id="auth-submit-btn" style="padding: 12px; font-size: 0.95rem;">
        Create BizBook Account
      </button>

      <div style="text-align: center; margin-top: 20px; font-size: 0.85rem; color: var(--text-secondary);">
        Already have an account?
        <a href="javascript:void(0)" style="font-weight: 700;" onclick="switchAuthMode('login')">Sign in</a>
      </div>
    </form>
  `;
}

function switchAuthMode(mode) {
  authMode = mode;
  const container = document.getElementById('auth-form-container');
  if (container) {
    container.innerHTML = mode === 'login' ? renderLoginFormHtml() : renderRegisterFormHtml();
  }
}

function fillDemoCredentials() {
  switchAuthMode('login');
  setTimeout(() => {
    const emailEl = document.getElementById('auth-email');
    const pwEl = document.getElementById('auth-password');
    if (emailEl && pwEl) {
      emailEl.value = 'demo@bizbook.app';
      pwEl.value = 'BizBookDemo@2026';
      submitLogin();
    }
  }, 50);
}

async function submitLogin() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const btn = document.getElementById('auth-submit-btn');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Verifying credentials...';
  }

  try {
    const res = await API.post('/auth/login', { email, password });
    API.setToken(res.token);
    State.user = res.user;
    State.businesses = res.businesses || [];

    if (State.businesses.length > 0) {
      State.setCurrentBusiness(State.businesses[0].id);
      showToast(`Welcome back, ${res.user.full_name}!`, 'success');
      renderAppShell();
      State.setView('dashboard');
    } else {
      // User has no business yet: start onboarding wizard!
      startOnboardingWizard();
    }
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign In to BizBook';
    }
  }
}

async function submitRegister() {
  const full_name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('auth-submit-btn');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating account...';
  }

  try {
    const res = await API.post('/auth/register', { full_name, email, phone, password });
    API.setToken(res.token);
    State.user = res.user;
    State.businesses = [];

    showToast('Account registered successfully!', 'success');
    startOnboardingWizard();
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create BizBook Account';
    }
  }
}

// 4-Step Comprehensive Onboarding Wizard (Business Profile, Categories, Products, Plan Selection)
let onboardingStep = 1;
let onboardingData = {
  businessName: '',
  businessType: 'Retail & Supermarket',
  currency: 'NGN',
  selectedPlan: 'business',
  categories: [],
  products: []
};

async function startOnboardingWizard() {
  onboardingStep = 1;
  if (State.currentBusiness) {
    onboardingData.businessName = State.currentBusiness.name;
    onboardingData.businessType = State.currentBusiness.business_type || 'Retail & Supermarket';
    onboardingData.currency = State.currentBusiness.currency || 'NGN';
    try {
      const [catsRes, prodsRes] = await Promise.all([
        API.get('/categories'),
        API.get('/products')
      ]);
      onboardingData.categories = catsRes.categories || [];
      onboardingData.products = prodsRes.products || [];
    } catch (e) {
      console.warn('Could not prefetch onboarding records:', e.message);
    }
  }
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const root = document.getElementById('app-root');
  const stepTitles = [
    'Business Details',
    'Product Categories',
    'Initial Products',
    'Subscription Plan'
  ];

  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F8FAFC; padding: 20px;">
      <div style="max-width: 600px; width: 100%; background: #FFFFFF; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); padding: 32px;">
        <!-- Wizard Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${LOGO_SVG}
            <div>
              <div style="font-weight: 800; color: var(--navy-dark); font-size: 1.1rem;">BizBook Onboarding</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Step ${onboardingStep} of 4 • ${stepTitles[onboardingStep - 1]}</div>
            </div>
          </div>
          <div style="font-weight: 700; color: var(--blue-primary); font-size: 0.85rem;">${Math.round((onboardingStep / 4) * 100)}%</div>
        </div>

        <div id="onboarding-step-body">
          ${renderOnboardingStepContent()}
        </div>
      </div>
    </div>
  `;
}

function renderOnboardingStepContent() {
  if (onboardingStep === 1) {
    return `
      <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
        Name your business
      </h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
        Enter the trading name of your business or retail enterprise.
      </p>

      <form onsubmit="event.preventDefault(); handleOnboardingStep1Next();">
        <div class="form-group">
          <label class="form-label">Business Name *</label>
          <input type="text" id="ob-biz-name" class="form-control" placeholder="e.g. Star Provisions & Stores" value="${onboardingData.businessName}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Business Type / Category *</label>
          <select id="ob-biz-type" class="form-control">
            <option value="Retail & Supermarket" ${onboardingData.businessType === 'Retail & Supermarket' ? 'selected' : ''}>Retail & Supermarket</option>
            <option value="Building Materials & Hardware" ${onboardingData.businessType === 'Building Materials & Hardware' ? 'selected' : ''}>Building Materials & Hardware</option>
            <option value="Electronics & Gadgets" ${onboardingData.businessType === 'Electronics & Gadgets' ? 'selected' : ''}>Electronics & Gadgets</option>
            <option value="Fashion & Clothing Boutique" ${onboardingData.businessType === 'Fashion & Clothing Boutique' ? 'selected' : ''}>Fashion & Clothing Boutique</option>
            <option value="Restaurant & Food Services" ${onboardingData.businessType === 'Restaurant & Food Services' ? 'selected' : ''}>Restaurant & Food Services</option>
            <option value="Pharmacy & Health" ${onboardingData.businessType === 'Pharmacy & Health' ? 'selected' : ''}>Pharmacy & Health</option>
            <option value="Wholesale Distributor" ${onboardingData.businessType === 'Wholesale Distributor' ? 'selected' : ''}>Wholesale Distributor</option>
            <option value="General Trading" ${onboardingData.businessType === 'General Trading' ? 'selected' : ''}>General Trading</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Base Currency</label>
          <select id="ob-biz-curr" class="form-control">
            <option value="NGN" ${onboardingData.currency === 'NGN' ? 'selected' : ''}>NGN - Nigerian Naira (₦)</option>
            <option value="USD" ${onboardingData.currency === 'USD' ? 'selected' : ''}>USD - US Dollar ($)</option>
            <option value="GBP" ${onboardingData.currency === 'GBP' ? 'selected' : ''}>GBP - British Pound (£)</option>
            <option value="GHS" ${onboardingData.currency === 'GHS' ? 'selected' : ''}>GHS - Ghanaian Cedi (₵)</option>
          </select>
        </div>

        <button type="submit" id="ob-step1-submit" class="btn btn-primary btn-block" style="padding: 12px; margin-top: 10px;">
          Next: Set Up Categories &rarr;
        </button>
      </form>
    `;
  } else if (onboardingStep === 2) {
    // Step 2: Categories Setup
    const quickChips = getQuickCategorySuggestions(onboardingData.businessType);

    return `
      <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
        Set up product categories
      </h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
        Organize your catalog by creating categories. You can tap quick suggestions or enter custom ones.
      </p>

      <!-- Quick suggestions -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Suggested for ${onboardingData.businessType}:</div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${quickChips.map(chip => `
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 4px 10px;" onclick="addCategoryInOnboarding('${chip}')">
              + ${chip}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Add category input -->
      <div style="background: var(--blue-subtle); padding: 12px 14px; border-radius: 8px; border: 1px solid #D0E2FF; margin-bottom: 16px;">
        <div style="display: flex; gap: 8px;">
          <input type="text" id="ob-cat-name-input" class="form-control" placeholder="New category name (e.g. Toiletries, Beverages)...">
          <button type="button" class="btn btn-primary btn-sm" onclick="addCustomCategoryInOnboarding()">Add</button>
        </div>
      </div>

      <!-- Created Categories List -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--navy-dark); margin-bottom: 8px;">
          Your Categories (${onboardingData.categories.length}):
        </div>
        <div id="ob-categories-list" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
          ${onboardingData.categories.length === 0 ? `
            <div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed var(--border-color); border-radius: 6px;">
              No categories added yet. Tap a suggestion above or enter one.
            </div>
          ` : onboardingData.categories.map(c => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 6px;">
              <div>
                <span style="font-weight: 700; font-size: 0.88rem; color: var(--navy-dark);">${c.name}</span>
                ${c.description ? `<span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 6px;">(${c.description})</span>` : ''}
              </div>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem;" onclick="renameCategoryInOnboarding(${c.id}, '${c.name.replace(/'/g, "\\'")}')">Edit</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem; color: var(--color-danger);" onclick="deleteCategoryInOnboarding(${c.id}, '${c.name.replace(/'/g, "\\'")}')">&times;</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="onboardingStep = 1; renderOnboardingStep();">&larr; Back</button>
        <button type="button" class="btn btn-primary" style="flex: 1;" onclick="handleOnboardingStep2Next()">Next: Add Products &rarr;</button>
      </div>
    `;
  } else if (onboardingStep === 3) {
    // Step 3: Products Setup
    return `
      <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
        Add your initial products
      </h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
        Enter products with their purchase cost, selling price, and category. You can add multiple products.
      </p>

      <!-- Add Product Form -->
      <form id="ob-product-form" onsubmit="event.preventDefault(); addProductInOnboarding();" style="background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 16px;">
        <div class="form-group" style="margin-bottom: 10px;">
          <label class="form-label" style="font-size: 0.8rem;">Product Name *</label>
          <input type="text" id="ob-prod-name" class="form-control" placeholder="e.g. Dangote Sugar 50kg, Peak Milk..." required>
        </div>

        <div class="form-row" style="margin-bottom: 10px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.8rem;">Category *</label>
            <select id="ob-prod-cat" class="form-control" required>
              ${onboardingData.categories.map(c => `
                <option value="${c.id}">${c.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.8rem;">SKU (Optional)</label>
            <input type="text" id="ob-prod-sku" class="form-control" placeholder="e.g. SUGAR-50KG">
          </div>
        </div>

        <div class="form-row" style="margin-bottom: 10px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.8rem;">Cost Price (₦) *</label>
            <input type="number" step="0.01" min="0" id="ob-prod-cost" class="form-control" placeholder="e.g. 8500" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.8rem;">Selling Price (₦) *</label>
            <input type="number" step="0.01" min="0" id="ob-prod-price" class="form-control" placeholder="e.g. 9500" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.8rem;">Opening Stock</label>
            <input type="number" step="1" min="0" id="ob-prod-stock" class="form-control" placeholder="50" value="20">
          </div>
        </div>

        <button type="submit" id="btn-ob-add-prod" class="btn btn-secondary btn-sm btn-block" style="font-weight: 700;">
          + Save Product to Inventory
        </button>
      </form>

      <!-- Added Products List -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--navy-dark); margin-bottom: 8px;">
          Products Ready (${onboardingData.products.length}):
        </div>
        <div id="ob-products-list" style="max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
          ${onboardingData.products.length === 0 ? `
            <div style="text-align: center; padding: 14px; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed var(--border-color); border-radius: 6px;">
              No products added yet. Fill out the form above to add your products.
            </div>
          ` : onboardingData.products.map(p => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 6px;">
              <div>
                <div style="font-weight: 750; font-size: 0.85rem; color: var(--navy-dark);">${p.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  ${p.category_name || 'Category'} • Cost: ₦${Number(p.cost_price).toLocaleString()} • Sell: ₦${Number(p.selling_price).toLocaleString()} • Stock: ${p.current_stock || p.opening_stock || 0}
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem; color: var(--color-danger);" onclick="deleteProductInOnboarding(${p.id})">&times;</button>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="onboardingStep = 2; renderOnboardingStep();">&larr; Back</button>
        <button type="button" class="btn btn-primary" style="flex: 1;" onclick="handleOnboardingStep3Next()">Next: Choose Plan &rarr;</button>
      </div>
    `;
  } else if (onboardingStep === 4) {
    // Step 4: Plan Selection
    return `
      <div style="text-align: center; padding: 10px 0;">
        <div style="width: 50px; height: 50px; background: var(--color-success-bg); color: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <svg style="width: 26px; height: 26px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
          Select Your Subscription Plan
        </h2>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
          Your workspace for <strong>${onboardingData.businessName}</strong> is prepared with <strong>${onboardingData.categories.length} categories</strong> and <strong>${onboardingData.products.length} products</strong>.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 14px; margin-bottom: 24px; text-align: left;">
          <!-- Basic Plan Option -->
          <div id="ob-plan-basic" style="padding: 16px; border: 2px solid ${onboardingData.selectedPlan === 'basic' ? 'var(--blue-primary)' : 'var(--border-color)'}; background: ${onboardingData.selectedPlan === 'basic' ? 'var(--blue-subtle)' : '#FFFFFF'}; border-radius: 8px; cursor: pointer;"
               onclick="selectOnboardingPlan('basic')">
            <div style="font-weight: 800; color: var(--navy-dark); font-size: 0.95rem;">BizBook Basic</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--blue-primary); margin: 4px 0;">₦5,000 <span style="font-size: 0.72rem; color: #64748B; font-weight: 500;">/mo</span></div>
            <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 8px;">Max 2 Active Users (Owner + 1 staff)</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary);">✓ POS & Receipts<br>✓ Inventory & Debtors<br>✓ Standard Reports</div>
          </div>

          <!-- Business Plan Option -->
          <div id="ob-plan-business" style="padding: 16px; border: 2px solid ${onboardingData.selectedPlan !== 'basic' ? 'var(--blue-primary)' : 'var(--border-color)'}; background: ${onboardingData.selectedPlan !== 'basic' ? 'var(--blue-subtle)' : '#FFFFFF'}; border-radius: 8px; cursor: pointer;"
               onclick="selectOnboardingPlan('business')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-weight: 800; color: var(--navy-dark); font-size: 0.95rem;">BizBook Business</div>
              <span class="badge badge-success" style="font-size: 0.65rem;">Popular</span>
            </div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--blue-primary); margin: 4px 0;">₦10,000 <span style="font-size: 0.72rem; color: #64748B; font-weight: 500;">/mo</span></div>
            <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 8px;">Max 5 Active Users (Owner + 4 staff)</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary);">✓ Everything in Basic<br>✓ Full Double-Entry P&L<br>✓ Staff & Payroll Engine</div>
          </div>
        </div>

        <button class="btn btn-primary btn-block" style="padding: 12px; font-size: 0.95rem;" onclick="finishOnboardingWithPlan()">
          Confirm & Open Workspace &rarr;
        </button>
      </div>
    `;
  }
}

function getQuickCategorySuggestions(bizType) {
  const map = {
    'Retail & Supermarket': ['Beverages', 'Provisions', 'Toiletries', 'Snacks', 'Household'],
    'Pharmacy & Health': ['Antibiotics', 'Pain Relief', 'Supplements', 'First Aid'],
    'Building Materials & Hardware': ['Plumbing', 'Electrical', 'Tools', 'Building Materials'],
    'Electronics & Gadgets': ['Smartphones', 'Accessories', 'Audio', 'Computing'],
    'Fashion & Clothing Boutique': ['Men Fashion', 'Women Fashion', 'Shoes', 'Accessories'],
    'Restaurant & Food Services': ['Meals', 'Drinks', 'Pastries', 'Sides']
  };
  return map[bizType] || ['Beverages', 'Provisions', 'General Merchandise'];
}

async function handleOnboardingStep1Next() {
  const name = document.getElementById('ob-biz-name').value.trim();
  const type = document.getElementById('ob-biz-type').value;
  const curr = document.getElementById('ob-biz-curr').value;

  if (!name) {
    showToast('Business name is required.', 'warning');
    return;
  }

  onboardingData.businessName = name;
  onboardingData.businessType = type;
  onboardingData.currency = curr;

  const nextBtn = document.getElementById('ob-step1-submit');
  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.textContent = 'Setting up business...';
  }

  try {
    if (!State.currentBusiness) {
      const res = await API.post('/businesses', {
        name,
        business_type: type,
        currency: curr,
        currency_symbol: curr === 'USD' ? '$' : (curr === 'GBP' ? '£' : '₦')
      });
      const newBiz = res.business;
      State.currentBusiness = newBiz;
      API.setActiveBusinessId(newBiz.id);
      if (!State.businesses) State.businesses = [];
      State.businesses.push(newBiz);
    }

    // Load existing categories if any
    const catRes = await API.get('/categories');
    onboardingData.categories = catRes.categories || [];

    onboardingStep = 2;
    renderOnboardingStep();
  } catch (err) {
    showToast('Setup error: ' + err.message, 'error');
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Next: Set Up Categories →';
    }
  }
}

async function addCategoryInOnboarding(name, desc = '') {
  if (!name || !name.trim()) return;
  try {
    const res = await API.post('/categories', { name: name.trim(), description: desc ? desc.trim() : null });
    showToast(`Category "${name}" created.`, 'success');
    const catRes = await API.get('/categories');
    onboardingData.categories = catRes.categories || [];
    renderOnboardingStep();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function addCustomCategoryInOnboarding() {
  const input = document.getElementById('ob-cat-name-input');
  if (input && input.value.trim()) {
    addCategoryInOnboarding(input.value.trim());
    input.value = '';
  }
}

async function renameCategoryInOnboarding(id, currentName) {
  const newName = prompt('Enter new category name:', currentName);
  if (!newName || !newName.trim() || newName.trim() === currentName) return;

  try {
    await API.put(`/categories/${id}`, { name: newName.trim() });
    showToast('Category renamed.', 'success');
    const catRes = await API.get('/categories');
    onboardingData.categories = catRes.categories || [];
    renderOnboardingStep();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategoryInOnboarding(id, name) {
  if (!confirm(`Delete category "${name}"?`)) return;

  try {
    await API.delete(`/categories/${id}`);
    showToast(`Category "${name}" deleted.`, 'info');
    const catRes = await API.get('/categories');
    onboardingData.categories = catRes.categories || [];
    renderOnboardingStep();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleOnboardingStep2Next() {
  if (!onboardingData.categories || onboardingData.categories.length === 0) {
    showToast('Please create at least one category before proceeding to products.', 'warning');
    return;
  }
  onboardingStep = 3;
  renderOnboardingStep();
}

async function addProductInOnboarding() {
  const nameEl = document.getElementById('ob-prod-name');
  const catEl = document.getElementById('ob-prod-cat');
  const skuEl = document.getElementById('ob-prod-sku');
  const costEl = document.getElementById('ob-prod-cost');
  const priceEl = document.getElementById('ob-prod-price');
  const stockEl = document.getElementById('ob-prod-stock');
  const submitBtn = document.getElementById('btn-ob-add-prod');

  const name = nameEl ? nameEl.value.trim() : '';
  const category_id = catEl ? catEl.value : null;
  const sku = skuEl ? skuEl.value.trim() : null;
  const cost_price = costEl ? costEl.value : '';
  const selling_price = priceEl ? priceEl.value : '';
  const opening_stock = stockEl ? stockEl.value : '0';

  if (!name) {
    showToast('Product name is required.', 'warning');
    return;
  }
  if (!category_id) {
    showToast('Please select a category.', 'warning');
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

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    await API.post('/products', {
      name,
      category_id: Number(category_id),
      sku: sku || null,
      cost_price: Number(cost_price),
      selling_price: Number(selling_price),
      opening_stock: Number(opening_stock) || 0,
      unit: 'unit',
      reorder_level: 10
    });

    showToast(`Product "${name}" saved to inventory.`, 'success');

    // Refresh products list
    const prodRes = await API.get('/products');
    onboardingData.products = prodRes.products || [];

    // Clear form
    if (nameEl) nameEl.value = '';
    if (skuEl) skuEl.value = '';
    if (costEl) costEl.value = '';
    if (priceEl) priceEl.value = '';
    if (stockEl) stockEl.value = '20';

    renderOnboardingStep();
  } catch (err) {
    showToast(err.message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '+ Save Product to Inventory';
    }
  }
}

async function deleteProductInOnboarding(id) {
  try {
    await API.delete(`/products/${id}`);
    showToast('Product removed.', 'info');
    const prodRes = await API.get('/products');
    onboardingData.products = prodRes.products || [];
    renderOnboardingStep();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleOnboardingStep3Next() {
  if (!onboardingData.products || onboardingData.products.length === 0) {
    showToast('Please add at least one product before proceeding.', 'warning');
    return;
  }
  onboardingStep = 4;
  renderOnboardingStep();
}

function selectOnboardingPlan(planCode) {
  onboardingData.selectedPlan = planCode;
  const basicCard = document.getElementById('ob-plan-basic');
  const bizCard = document.getElementById('ob-plan-business');
  if (basicCard && bizCard) {
    if (planCode === 'basic') {
      basicCard.style.borderColor = 'var(--blue-primary)';
      basicCard.style.background = 'var(--blue-subtle)';
      bizCard.style.borderColor = 'var(--border-color)';
      bizCard.style.background = '#FFFFFF';
    } else {
      bizCard.style.borderColor = 'var(--blue-primary)';
      bizCard.style.background = 'var(--blue-subtle)';
      basicCard.style.borderColor = 'var(--border-color)';
      basicCard.style.background = '#FFFFFF';
    }
  }
}

async function finishOnboardingWithPlan() {
  if (onboardingData.selectedPlan === 'basic' && State.currentBusiness) {
    try {
      await API.post('/subscriptions/upgrade', { plan_code: 'basic' });
    } catch (e) {
      console.warn('Could not switch plan at onboarding:', e.message);
    }
  }
  finishOnboarding();
}

function finishOnboarding() {
  renderAppShell();
  State.setView('dashboard');
  showToast('Welcome to BizBook! "Run your business. Know your numbers."', 'success');
}

function showCreateBusinessModal() {
  const content = `
    <form id="create-biz-form" onsubmit="event.preventDefault(); submitCreateBusiness();">
      <div class="form-group">
        <label class="form-label">Business Name *</label>
        <input type="text" id="cb-name" class="form-control" placeholder="e.g. Victoria Island Supermarket" required>
      </div>
      <div class="form-group">
        <label class="form-label">Business Type *</label>
        <input type="text" id="cb-type" class="form-control" placeholder="e.g. Retail, Pharmacy, Building Supplies" required>
      </div>
      <div class="form-group">
        <label class="form-label">Currency</label>
        <select id="cb-currency" class="form-control">
          <option value="NGN">NGN - Nigerian Naira (₦)</option>
          <option value="USD">USD - US Dollar ($)</option>
          <option value="GBP">GBP - British Pound (£)</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitCreateBusiness()">Create Business</button>
  `;

  openModal('Create New Business', content, footer);
}

async function submitCreateBusiness() {
  const name = document.getElementById('cb-name').value;
  const business_type = document.getElementById('cb-type').value;
  const currency = document.getElementById('cb-currency').value;

  try {
    const res = await API.post('/businesses', {
      name,
      business_type,
      currency,
      currency_symbol: currency === 'USD' ? '$' : (currency === 'GBP' ? '£' : '₦')
    });

    showToast(`Business "${name}" created!`, 'success');
    State.businesses.push(res.business);
    State.setCurrentBusiness(res.business.id);
    closeModal();
    renderAppShell();
    State.setView('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
