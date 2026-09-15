/**
 * BizFlow Main Application Entry Point
 * Routing, Lifecycle, and Event Subscriptions
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('BizFlow Initializing... "Run your business. Know your numbers."');

  // Listen for state view changes
  State.subscribe((event, payload) => {
    if (event === 'view:changed') {
      renderActiveView(payload.view);
      // Update active state in sidebar and mobile nav
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.mobile-nav-btn').forEach(el => el.classList.remove('active'));

      const activeSidebarEl = Array.from(document.querySelectorAll('.nav-item')).find(el =>
        el.textContent.toLowerCase().includes(payload.view)
      );
      if (activeSidebarEl) activeSidebarEl.classList.add('active');

      // Close mobile sidebar if open
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
      }

      // Scroll to top
      window.scrollTo(0, 0);
    } else if (event === 'business:changed') {
      renderAppShell();
      renderActiveView(State.currentView);
    }
  });

  // Listen for session expiry
  window.addEventListener('auth:expired', () => {
    showToast('Your session has expired. Please log in again.', 'warning');
    renderAuthScreen();
  });

  // Check initial authentication
  await checkAuthAndBootstrap();
});

async function checkAuthAndBootstrap() {
  const token = API.getToken();

  if (!token) {
    renderAuthScreen();
    return;
  }

  try {
    const data = await API.get('/auth/me');
    State.user = data.user;
    State.businesses = data.businesses || [];

    if (State.businesses.length === 0) {
      // User registered but has not set up a business yet
      startOnboardingWizard();
      return;
    }

    // Set active business
    const savedBizId = API.getActiveBusinessId();
    const activeBiz = State.businesses.find(b => String(b.id) === String(savedBizId)) || State.businesses[0];

    State.setCurrentBusiness(activeBiz.id);
    renderAppShell();
    renderActiveView(State.currentView || 'dashboard');
  } catch (err) {
    console.warn('Authentication bootstrap failed:', err.message);
    API.clearToken();
    renderAuthScreen();
  }
}

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
