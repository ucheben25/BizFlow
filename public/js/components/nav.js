/**
 * BizBook Navigation, Branding, and Shell Components
 */

const LOGO_SVG = `
<svg class="brand-logo-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="12" fill="#0A58CA"/>
  <!-- Intersecting flow ribbons representing growth and financial clarity -->
  <path d="M12 32C12 24 18 16 26 16C31 16 35 19 36 24C34 24 30 22 26 22C20 22 17 27 17 32H12Z" fill="#FFFFFF" fill-opacity="0.95"/>
  <path d="M36 16C36 24 30 32 22 32C17 32 13 29 12 24C14 24 18 26 22 26C28 26 31 21 31 16H36Z" fill="#70B4FF"/>
  <circle cx="36" cy="16" r="3.5" fill="#FFFFFF"/>
</svg>
`;

function renderAppShell() {
  const root = document.getElementById('app-root');
  const biz = State.currentBusiness || { name: 'BizBook Store', role: 'owner', currency_symbol: '₦' };
  const user = State.user || { full_name: 'User', email: '' };
  const role = (biz.role || 'owner').toLowerCase();
  const isAdmin = ['owner', 'admin'].includes(role);

  root.innerHTML = `
    <div class="app-container">
      <!-- Sidebar Navigation -->
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <div class="brand-logo-container" onclick="State.setView('dashboard')" style="cursor: pointer;">
            ${LOGO_SVG}
            <div class="brand-info">
              <span class="brand-name">BizBook</span>
              <span class="brand-tagline">Know your numbers</span>
            </div>
          </div>
        </div>

        <!-- Business Switcher -->
        <div class="business-switcher" onclick="showBusinessSwitcherModal()">
          <div class="biz-avatar">${biz.name.substring(0, 2).toUpperCase()}</div>
          <div class="biz-details">
            <div class="biz-name">${biz.name}</div>
            <div class="biz-role">${biz.role ? (biz.role.charAt(0).toUpperCase() + biz.role.slice(1)) : 'Owner'}</div>
          </div>
          <svg style="width: 16px; height: 16px; stroke: #64748B;" fill="none" stroke-width="2" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </div>

        <!-- Nav Items -->
        <nav class="sidebar-nav">
          <div class="nav-section-title">Core Operations</div>
          <div class="nav-item ${State.currentView === 'dashboard' ? 'active' : ''}" onclick="State.setView('dashboard')">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </div>
          <div class="nav-item ${State.currentView === 'pos' ? 'active' : ''}" onclick="State.setView('pos')">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Point of Sale (POS)
          </div>
          <div class="nav-item ${State.currentView === 'sales' ? 'active' : ''}" onclick="State.setView('sales')">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Sales & Invoices
          </div>
          <div class="nav-item ${State.currentView === 'products' ? 'active' : ''}" onclick="State.setView('products')">
            <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Products & Inventory
          </div>
          <div class="nav-item ${State.currentView === 'purchases' ? 'active' : ''}" onclick="State.setView('purchases')">
            <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            Purchases & Restock
          </div>

          <div class="nav-section-title">Relationships & Finance</div>
          <div class="nav-item ${State.currentView === 'customers' ? 'active' : ''}" onclick="State.setView('customers')">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Customers (Debtors)
          </div>
          <div class="nav-item ${State.currentView === 'suppliers' ? 'active' : ''}" onclick="State.setView('suppliers')">
            <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            Suppliers (Creditors)
          </div>
          ${isAdmin ? `
          <div class="nav-item ${State.currentView === 'expenses' ? 'active' : ''}" onclick="State.setView('expenses')">
            <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Expense Tracking
          </div>
          <div class="nav-item ${State.currentView === 'reports' ? 'active' : ''}" onclick="State.setView('reports')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Financial Reports
          </div>
          ` : ''}

          ${isAdmin ? `
          <div class="nav-section-title">People & Payroll</div>
          <div class="nav-item ${State.currentView === 'staff' ? 'active' : ''}" onclick="State.setView('staff')">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Staff Directory
          </div>
          <div class="nav-item ${State.currentView === 'payroll' ? 'active' : ''}" onclick="State.setView('payroll')">
            <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="6" y1="12" x2="18" y2="12"></line><line x1="12" y1="8" x2="12" y2="16"></line></svg>
            Payroll Management
          </div>
          ` : ''}

          <div class="nav-section-title">System & Administration</div>
          <div class="nav-item ${State.currentView === 'ai' ? 'active' : ''}" onclick="State.setView('ai')">
            <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            AI Assistant
          </div>
          ${isAdmin ? `
          <div class="nav-item ${State.currentView === 'subscription' ? 'active' : ''}" onclick="State.setView('subscription')">
            <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            Subscription & Billing
          </div>
          <div class="nav-item ${State.currentView === 'settings' ? 'active' : ''}" onclick="State.setView('settings')">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings & Team
          </div>
          ` : ''}

          <div style="margin-top: 16px; padding: 10px 14px; border-top: 1px solid var(--border-color);">
            <a href="#home" style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--blue-primary); text-decoration: none; font-weight: 600;">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              Public Website
            </a>
          </div>
        </nav>

        <!-- User Profile & Logout -->
        <div class="sidebar-footer">
          <div class="user-profile">
            <div class="user-avatar">${user.full_name.substring(0, 1).toUpperCase()}</div>
            <div class="user-info">
              <span class="user-name">${user.full_name}</span>
              <span class="user-email">${user.email}</span>
            </div>
          </div>
          <button class="btn-logout" title="Logout" onclick="handleLogout()">
            <svg style="width: 18px; height: 18px; stroke: currentColor;" fill="none" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Main Content Layout -->
      <div class="main-wrapper">
        <!-- Desktop Topbar -->
        <header class="topbar">
          <div class="topbar-left">
            <h1 class="page-title" id="page-title-heading">Dashboard</h1>
          </div>
          <div class="topbar-right">
            <button class="quick-action-btn" onclick="State.setView('pos')">
              <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New Sale
            </button>
            <button class="btn btn-secondary btn-sm" onclick="showAddProductModal()">+ Product</button>
            ${isAdmin ? `<button class="btn btn-secondary btn-sm" onclick="showAddExpenseModal()">+ Expense</button>` : ''}
          </div>
        </header>

        <!-- Mobile Header -->
        <header class="mobile-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="toggleMobileSidebar()">
              <svg style="width: 26px; height: 26px; stroke: #0A58CA;" fill="none" stroke-width="2" viewBox="0 0 24 24">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div style="font-weight: 800; font-size: 1.15rem; color: #0A58CA;">BizBook</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-primary btn-sm" onclick="State.setView('pos')">+ Sale</button>
          </div>
        </header>

        <!-- Dynamic View Body -->
        <main class="content-body" id="app-view">
          <!-- View component renders here -->
        </main>
      </div>

      <!-- Mobile Bottom Navigation Bar -->
      <nav class="mobile-nav-bar">
        <button class="mobile-nav-btn ${State.currentView === 'dashboard' ? 'active' : ''}" onclick="State.setView('dashboard')">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Home
        </button>
        <button class="mobile-nav-btn ${State.currentView === 'pos' ? 'active' : ''}" onclick="State.setView('pos')">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          Sale
        </button>
        <button class="mobile-nav-btn ${State.currentView === 'products' ? 'active' : ''}" onclick="State.setView('products')">
          <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          Products
        </button>
        ${isAdmin ? `
        <button class="mobile-nav-btn ${State.currentView === 'expenses' ? 'active' : ''}" onclick="State.setView('expenses')">
          <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Expenses
        </button>
        ` : `
        <button class="mobile-nav-btn ${State.currentView === 'sales' ? 'active' : ''}" onclick="State.setView('sales')">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Invoices
        </button>
        `}
        <button class="mobile-nav-btn" onclick="toggleMobileSidebar()">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          More
        </button>
      </nav>
    </div>
  `;
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-open');
  }
}

function handleLogout() {
  API.clearToken();
  showToast('Logged out successfully.', 'info');
  window.location.reload();
}

function showBusinessSwitcherModal() {
  const businesses = State.businesses || [];
  const currentId = State.currentBusiness ? State.currentBusiness.id : null;

  const content = `
    <div style="margin-bottom: 16px;">
      <p style="font-size: 0.9rem; color: #64748B; margin-bottom: 12px;">Select the business you wish to manage:</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${businesses.map(b => `
          <div style="padding: 12px; border: 1px solid ${b.id === currentId ? '#0A58CA' : '#E2E8F0'}; background: ${b.id === currentId ? '#F0F6FF' : '#FFFFFF'}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;"
               onclick="State.setCurrentBusiness(${b.id}); closeModal();">
            <div>
              <div style="font-weight: 700; color: #0A2540;">${b.name}</div>
              <div style="font-size: 0.75rem; color: #64748B;">Role: ${b.role || 'Member'} • ${b.currency || 'NGN'}</div>
            </div>
            ${b.id === currentId ? '<span class="badge badge-success">Active</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="closeModal(); showCreateBusinessModal();">+ Create New Business</button>
  `;

  openModal('Switch Business', content, footer);
}
