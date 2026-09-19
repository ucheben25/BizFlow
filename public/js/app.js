/**
 * BizBook Main Application Entry Point
 * Routing, Lifecycle, State Subscriptions & Route Dispatcher
 * "Run your business. Know your numbers."
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('BizBook Initializing... "Run your business. Know your numbers."');

  // Pre-load authenticated user state if token exists
  if (API.getToken()) {
    await bootstrapAuthState();
  }

  // Subscribe to state changes
  State.subscribe((event, payload) => {
    if (event === 'view:changed') {
      const view = payload.view;
      if (!document.getElementById('app-sidebar') || !document.getElementById('app-view')) {
        renderAppShell();
      }
      renderActiveView(view);
      updateNavActiveStates(view);
      window.scrollTo(0, 0);
    } else if (event === 'business:changed') {
      renderAppShell();
      renderActiveView(State.currentView || 'dashboard');
    }
  });

  // Listen for session expiry
  window.addEventListener('auth:expired', () => {
    showToast('Your session has expired. Please log in again.', 'warning');
    API.clearToken();
    State.user = null;
    State.businesses = [];
    State.currentBusiness = null;
    window.location.hash = '#login';
  });

  // Listen for browser navigation / hashchange and popstate
  window.addEventListener('hashchange', () => {
    handleRoute();
  });
  window.addEventListener('popstate', () => {
    handleRoute();
  });

  // Dispatch initial route
  await handleRoute();
});

/**
 * Loads session state from /api/auth/me
 */
async function bootstrapAuthState() {
  const token = API.getToken();
  if (!token) return false;

  try {
    const data = await API.get('/auth/me');
    State.user = data.user;
    State.businesses = data.businesses || [];

    if (State.businesses.length > 0) {
      const savedBizId = API.getActiveBusinessId();
      const activeBiz = State.businesses.find(b => String(b.id) === String(savedBizId)) || State.businesses[0];
      State.currentBusiness = activeBiz;
      API.setActiveBusinessId(activeBiz.id);
    }
    return true;
  } catch (err) {
    console.warn('Bootstrap auth failed:', err.message);
    API.clearToken();
    State.user = null;
    State.businesses = [];
    State.currentBusiness = null;
    return false;
  }
}

/**
 * Central Router
 */
async function handleRoute() {
  // Determine active route: Check hash first, then pathname
  let cleanRoute = '';
  if (window.location.hash && window.location.hash !== '#' && window.location.hash !== '#!') {
    cleanRoute = window.location.hash.replace(/^#\/?/, '');
  } else {
    cleanRoute = window.location.pathname.replace(/^\/+|\/+$/g, '');
  }

  if (!cleanRoute) cleanRoute = 'home';

  // Normalize route aliases
  if (cleanRoute === 'sign-in') cleanRoute = 'login';
  if (cleanRoute === 'sign-up') cleanRoute = 'register';

  // 1. Authenticated App Routes: #app/<view> or app/<view>
  if (cleanRoute.startsWith('app/') || cleanRoute === 'app') {
    let view = cleanRoute.split('/')[1] || 'dashboard';

    const token = API.getToken();
    if (!token) {
      showToast('Please sign in to access your business workspace.', 'info');
      window.location.hash = '#login';
      return;
    }

    if (!State.user) {
      const ok = await bootstrapAuthState();
      if (!ok) {
        window.location.hash = '#login';
        return;
      }
    }

    if (!State.businesses || State.businesses.length === 0) {
      startOnboardingWizard();
      return;
    }

    // Ensure active business selected
    if (!State.currentBusiness) {
      const savedBizId = API.getActiveBusinessId();
      const activeBiz = State.businesses.find(b => String(b.id) === String(savedBizId)) || State.businesses[0];
      State.setCurrentBusiness(activeBiz.id);
    }

    // Subscription status check
    const biz = State.currentBusiness;
    const subStatus = biz ? (biz.subscription_status || 'active') : 'active';
    const isGated = ['expired', 'past_due', 'cancelled'].includes(subStatus);
    if (isGated && view !== 'subscription') {
      showToast('Your subscription is inactive. Please renew your plan to resume operations.', 'warning');
      window.location.hash = '#app/subscription';
      return;
    }

    // Role-based route protection
    const role = (biz?.role || 'owner').toLowerCase();
    const isAdmin = ['owner', 'admin'].includes(role);
    const adminOnlyViews = ['expenses', 'reports', 'staff', 'payroll', 'subscription', 'settings'];
    if (!isAdmin && adminOnlyViews.includes(view)) {
      showToast('Access restricted: Staff roles cannot access this financial section.', 'warning');
      window.location.hash = '#app/dashboard';
      return;
    }

    // Render app shell container if missing
    if (!document.getElementById('app-sidebar') || !document.getElementById('app-view')) {
      renderAppShell();
    }

    State.currentView = view;
    renderActiveView(view);
    updateNavActiveStates(view);
    window.scrollTo(0, 0);
    return;
  }

  // 2. Authentication Pages: #login, #register, /sign-in, /sign-up
  if (cleanRoute === 'login' || cleanRoute === 'register') {
    if (API.getToken() && State.user && State.businesses?.length > 0) {
      window.location.hash = '#app/dashboard';
      return;
    }
    authMode = cleanRoute;
    renderAuthScreen();
    window.scrollTo(0, 0);
    return;
  }

  // 3. Public Marketing Pages
  switch (cleanRoute) {
    case '':
    case 'home':
      renderPublicHomePage();
      break;
    case 'about':
      renderAboutPage();
      break;
    case 'features':
      renderFeaturesPage();
      break;
    case 'pricing':
      renderPricingPage();
      break;
    case 'faq':
      renderFaqPage();
      break;
    case 'contact':
      renderContactPage();
      break;
    case 'privacy':
      renderPrivacyPage();
      break;
    case 'terms':
      renderTermsPage();
      break;
    case '404':
      render404Page();
      break;
    default:
      render404Page();
      break;
  }
  window.scrollTo(0, 0);
}

/**
 * Dispatches active view rendering inside main workspace
 */
function renderActiveView(viewName) {
  switch (viewName) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'pos':
      renderPOS();
      break;
    case 'sales':
      renderSales();
      break;
    case 'products':
      renderProducts();
      break;
    case 'purchases':
      renderPurchases();
      break;
    case 'customers':
      renderCustomers();
      break;
    case 'suppliers':
      renderSuppliers();
      break;
    case 'expenses':
      renderExpenses();
      break;
    case 'reports':
      renderReports();
      break;
    case 'staff':
      renderStaff();
      break;
    case 'payroll':
      renderPayroll();
      break;
    case 'subscription':
      renderSubscription();
      break;
    case 'ai':
      renderAiView();
      break;
    case 'settings':
      renderSettings();
      break;
    default:
      renderDashboard();
  }
}

/**
 * Updates active indicators in desktop sidebar and mobile navigation bar
 */
function updateNavActiveStates(view) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(el => el.classList.remove('active'));

  // Highlight active sidebar item
  const activeSidebarEl = Array.from(document.querySelectorAll('.nav-item')).find(el => {
    const clickAttr = el.getAttribute('onclick') || '';
    return clickAttr.includes(`'${view}'`);
  });
  if (activeSidebarEl) activeSidebarEl.classList.add('active');

  // Highlight active mobile bottom nav item
  const activeMobileEl = Array.from(document.querySelectorAll('.mobile-nav-btn')).find(el => {
    const clickAttr = el.getAttribute('onclick') || '';
    return clickAttr.includes(`'${view}'`);
  });
  if (activeMobileEl) activeMobileEl.classList.add('active');

  // Close mobile sidebar if open
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar && sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
  }
}
