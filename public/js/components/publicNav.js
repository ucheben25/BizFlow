/**
 * BizBook Public Website Navigation & Footer Layout
 * "Run your business. Know your numbers."
 */

function renderPublicLayout(contentHtml, activePage = 'home') {
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <div class="public-page-wrapper">
      <!-- Public Header -->
      <header class="public-header">
        <div class="public-nav-container">
          <div class="public-brand" onclick="navigateToPublic('home')">
            ${LOGO_SVG}
            <div>
              <span class="public-brand-title">BizBook</span>
              <span class="public-brand-sub">Know your numbers</span>
            </div>
          </div>

          <!-- Desktop Navigation Links -->
          <ul class="public-nav-links">
            <li><a href="#home" class="public-nav-link ${activePage === 'home' ? 'active' : ''}">Home</a></li>
            <li><a href="#about" class="public-nav-link ${activePage === 'about' ? 'active' : ''}">About</a></li>
            <li><a href="#features" class="public-nav-link ${activePage === 'features' ? 'active' : ''}">Features</a></li>
            <li><a href="#pricing" class="public-nav-link ${activePage === 'pricing' ? 'active' : ''}">Pricing</a></li>
            <li><a href="#faq" class="public-nav-link ${activePage === 'faq' ? 'active' : ''}">FAQ</a></li>
            <li><a href="#contact" class="public-nav-link ${activePage === 'contact' ? 'active' : ''}">Contact</a></li>
          </ul>

          <!-- Action Buttons -->
          <div class="public-nav-actions">
            ${(typeof State !== 'undefined' && State.user) ? `
              <button class="btn btn-primary btn-sm" onclick="openAppDashboard()">Dashboard &rarr;</button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="navigateToAuth('login')">Sign In</button>
              <button class="btn btn-primary btn-sm" onclick="navigateToAuth('register')">Get Started</button>
            `}
            <button class="public-mobile-toggle" onclick="togglePublicMobileMenu()" aria-label="Toggle menu">
              <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Drawer Menu -->
        <div id="public-mobile-menu" style="display: none; padding: 16px 24px; border-top: 1px solid var(--border-color); background: #FFFFFF;">
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <a href="#home" class="public-nav-link" onclick="togglePublicMobileMenu()">Home</a>
            <a href="#about" class="public-nav-link" onclick="togglePublicMobileMenu()">About</a>
            <a href="#features" class="public-nav-link" onclick="togglePublicMobileMenu()">Features</a>
            <a href="#pricing" class="public-nav-link" onclick="togglePublicMobileMenu()">Pricing</a>
            <a href="#faq" class="public-nav-link" onclick="togglePublicMobileMenu()">FAQ</a>
            <a href="#contact" class="public-nav-link" onclick="togglePublicMobileMenu()">Contact</a>
          </div>
          <div style="display: flex; gap: 8px;">
            ${(typeof State !== 'undefined' && State.user) ? `
              <button class="btn btn-primary btn-block btn-sm" onclick="togglePublicMobileMenu(); openAppDashboard()">Dashboard &rarr;</button>
            ` : `
              <button class="btn btn-secondary btn-block btn-sm" onclick="togglePublicMobileMenu(); navigateToAuth('login')">Sign In</button>
              <button class="btn btn-primary btn-block btn-sm" onclick="togglePublicMobileMenu(); navigateToAuth('register')">Get Started</button>
            `}
          </div>
        </div>
      </header>

      <!-- Main Page Content Body -->
      <main style="flex: 1;">
        ${contentHtml}
      </main>

      <!-- Public Footer -->
      <footer class="public-footer">
        <div class="footer-container">
          <div class="footer-grid">
            <!-- Brand Column -->
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                ${LOGO_SVG}
                <span style="font-size: 1.4rem; font-weight: 800; color: #FFFFFF;">BizBook</span>
              </div>
              <p style="font-size: 0.9rem; font-weight: 700; color: #70B4FF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                Run your business. Know your numbers.
              </p>
              <p class="footer-brand-desc">
                The all-in-one financial and operations management system designed for small and growing businesses in Nigeria and beyond.
              </p>
            </div>

            <!-- Product Links -->
            <div>
              <div class="footer-col-title">Product</div>
              <ul class="footer-links">
                <li><a href="#features" class="footer-link">Core Features</a></li>
                <li><a href="#pricing" class="footer-link">Subscription Plans</a></li>
                <li><a href="#about" class="footer-link">About BizBook</a></li>
                <li><a href="#faq" class="footer-link">Frequently Asked Questions</a></li>
              </ul>
            </div>

            <!-- Operations Links -->
            <div>
              <div class="footer-col-title">Capabilities</div>
              <ul class="footer-links">
                <li><a href="#features" class="footer-link">POS & Sales Invoicing</a></li>
                <li><a href="#features" class="footer-link">Inventory Tracking</a></li>
                <li><a href="#features" class="footer-link">Staff & Payroll Engine</a></li>
                <li><a href="#features" class="footer-link">Double-Entry Reports</a></li>
              </ul>
            </div>

            <!-- Legal & Contact -->
            <div>
              <div class="footer-col-title">Support & Trust</div>
              <ul class="footer-links">
                <li><a href="#contact" class="footer-link">Contact Support</a></li>
                <li><a href="#privacy" class="footer-link">Privacy Policy</a></li>
                <li><a href="#terms" class="footer-link">Terms of Service</a></li>
                <li><a href="mailto:support@bizbook.ng" class="footer-link">support@bizbook.ng</a></li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom">
            <div>&copy; ${new Date().getFullYear()} BizBook Inc. All rights reserved. Built for modern African enterprises.</div>
            <div style="display: flex; gap: 16px;">
              <a href="#privacy" class="footer-link" style="font-size: 0.82rem;">Privacy</a>
              <a href="#terms" class="footer-link" style="font-size: 0.82rem;">Terms</a>
              <a href="#contact" class="footer-link" style="font-size: 0.82rem;">Help Center</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `;

  window.scrollTo(0, 0);
}

function togglePublicMobileMenu() {
  const menu = document.getElementById('public-mobile-menu');
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
}

function navigateToPublic(page) {
  window.location.hash = page === 'home' ? '#home' : `#${page}`;
}

function navigateToAuth(mode = 'login') {
  authMode = mode;
  window.location.hash = `#${mode}`;
}

function openAppDashboard() {
  if (typeof State !== 'undefined' && State.setView) {
    State.setView('dashboard');
  } else {
    window.location.hash = '#app/dashboard';
  }
}
