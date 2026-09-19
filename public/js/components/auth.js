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
            Login with Adeleke Provisions Demo Data
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
      emailEl.value = 'demo@bizflow.ng';
      pwEl.value = 'bizflow123';
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

// 7-Step Simple Onboarding Wizard
let onboardingStep = 1;
let onboardingData = {
  businessName: '',
  businessType: 'Retail Store',
  currency: 'NGN',
  firstProductName: '',
  firstProductCost: 0,
  firstProductPrice: 0,
  firstProductStock: 0
};

function startOnboardingWizard() {
  onboardingStep = 1;
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F8FAFC; padding: 20px;">
      <div style="max-width: 550px; width: 100%; background: #FFFFFF; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); padding: 36px;">
        <!-- Wizard Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${LOGO_SVG}
            <div>
              <div style="font-weight: 800; color: var(--navy-dark); font-size: 1.1rem;">BizBook Onboarding</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Step ${onboardingStep} of 3 • Quick Setup</div>
            </div>
          </div>
          <div style="font-weight: 700; color: var(--blue-primary); font-size: 0.85rem;">${Math.round((onboardingStep / 3) * 100)}%</div>
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

      <form onsubmit="event.preventDefault(); nextOnboardingStep();">
        <div class="form-group">
          <label class="form-label">Business Name *</label>
          <input type="text" id="ob-biz-name" class="form-control" placeholder="e.g. Star Provisions & Stores" value="${onboardingData.businessName}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Business Type / Category *</label>
          <select id="ob-biz-type" class="form-control">
            <option value="Retail & Supermarket">Retail & Supermarket</option>
            <option value="Building Materials & Hardware">Building Materials & Hardware</option>
            <option value="Electronics & Gadgets">Electronics & Gadgets</option>
            <option value="Fashion & Clothing Boutique">Fashion & Clothing Boutique</option>
            <option value="Restaurant & Food Services">Restaurant & Food Services</option>
            <option value="Pharmacy & Health">Pharmacy & Health</option>
            <option value="Wholesale Distributor">Wholesale Distributor</option>
            <option value="General Trading">General Trading</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Base Currency</label>
          <select id="ob-biz-curr" class="form-control">
            <option value="NGN">NGN - Nigerian Naira (₦)</option>
            <option value="USD">USD - US Dollar ($)</option>
            <option value="GBP">GBP - British Pound (£)</option>
            <option value="GHS">GHS - Ghanaian Cedi (₵)</option>
          </select>
        </div>

        <button type="submit" class="btn btn-primary btn-block" style="padding: 12px; margin-top: 10px;">Next: Add Your First Product &rarr;</button>
      </form>
    `;
  } else if (onboardingStep === 2) {
    return `
      <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
        Add your first product
      </h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
        Enter one item you sell along with its cost price and current shelf stock.
      </p>

      <form onsubmit="event.preventDefault(); nextOnboardingStep();">
        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input type="text" id="ob-prod-name" class="form-control" placeholder="e.g. Dangote Cement 50kg, Peak Milk..." value="${onboardingData.firstProductName}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Purchase Cost (₦) *</label>
            <input type="number" step="0.01" min="0" id="ob-prod-cost" class="form-control" placeholder="8500" value="${onboardingData.firstProductCost || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Selling Price (₦) *</label>
            <input type="number" step="0.01" min="0" id="ob-prod-price" class="form-control" placeholder="9500" value="${onboardingData.firstProductPrice || ''}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Current Stock on Shelf (Units)</label>
          <input type="number" step="1" min="0" id="ob-prod-stock" class="form-control" placeholder="50" value="${onboardingData.firstProductStock || '20'}">
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="onboardingStep = 1; renderOnboardingStep();">&larr; Back</button>
          <button type="submit" class="btn btn-primary" style="flex: 1;">Complete Setup &rarr;</button>
        </div>
      </form>
    `;
  } else if (onboardingStep === 3) {
    return `
      <div style="text-align: center; padding: 10px 0;">
        <div style="width: 50px; height: 50px; background: var(--color-success-bg); color: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <svg style="width: 26px; height: 26px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
          Select Your Subscription Plan
        </h2>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
          Your workspace for <strong>${onboardingData.businessName}</strong> is prepared. Select your monthly tier:
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; text-align: left;">
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
  // If user selected basic plan, downgrade subscription record accordingly
  if (onboardingData.selectedPlan === 'basic' && State.currentBusiness) {
    try {
      await API.post('/subscriptions/upgrade', { plan_code: 'basic' });
    } catch (e) {
      console.warn('Could not switch plan at onboarding:', e.message);
    }
  }
  finishOnboarding();
}

async function nextOnboardingStep() {
  if (onboardingStep === 1) {
    onboardingData.businessName = document.getElementById('ob-biz-name').value;
    onboardingData.businessType = document.getElementById('ob-biz-type').value;
    onboardingData.currency = document.getElementById('ob-biz-curr').value;
    onboardingStep = 2;
    renderOnboardingStep();
  } else if (onboardingStep === 2) {
    onboardingData.firstProductName = document.getElementById('ob-prod-name').value;
    onboardingData.firstProductCost = Number(document.getElementById('ob-prod-cost').value);
    onboardingData.firstProductPrice = Number(document.getElementById('ob-prod-price').value);
    onboardingData.firstProductStock = Number(document.getElementById('ob-prod-stock').value) || 0;

    // Create Business and First Product on server
    try {
      const bizRes = await API.post('/businesses', {
        name: onboardingData.businessName,
        business_type: onboardingData.businessType,
        currency: onboardingData.currency,
        currency_symbol: onboardingData.currency === 'USD' ? '$' : (onboardingData.currency === 'GBP' ? '£' : '₦')
      });

      const newBiz = bizRes.business;
      State.currentBusiness = newBiz;
      API.setActiveBusinessId(newBiz.id);
      State.businesses.push(newBiz);

      // Create first product
      if (onboardingData.firstProductName) {
        await API.post('/products', {
          name: onboardingData.firstProductName,
          cost_price: onboardingData.firstProductCost,
          selling_price: onboardingData.firstProductPrice,
          opening_stock: onboardingData.firstProductStock,
          unit: 'unit'
        });
      }

      onboardingStep = 3;
      renderOnboardingStep();
    } catch (err) {
      showToast('Onboarding creation failed: ' + err.message, 'error');
    }
  }
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
