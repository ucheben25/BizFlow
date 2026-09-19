/**
 * BizFlow Public Pages
 * About, Features, Pricing, Contact, Privacy, Terms, FAQ, 404
 */

// --- 1. ABOUT PAGE (Requirement 6) ---
function renderAboutPage() {
  const contentHtml = `
    <div class="legal-container">
      <div class="legal-header">
        <h1 class="legal-title">About BizFlow</h1>
        <p class="legal-meta">Run your business. Know your numbers.</p>
      </div>

      <div class="legal-content">
        <h2>Our Purpose</h2>
        <p>
          Small businesses generate a tremendous volume of operational information every day—sales transactions, restock receipts, supplier bills, customer debts, employee allowances, and everyday utility bills.
        </p>
        <p>
          Too often, that critical business data is scattered across paper notebooks, messy spreadsheets, fading thermal slips, instant messaging apps, and memory. When information is fragmented, business owners struggle to answer fundamental questions: <em>Am I actually making a net profit? How much stock do I really have? Who owes me money today?</em>
        </p>
        <p>
          <strong>BizFlow was built to bring those everyday business records together into one reliable, trustworthy workspace.</strong>
        </p>

        <h2>What We Help Businesses Do</h2>
        <p>
          BizFlow connects daily counter operations directly to verified financial statements without requiring the owner to hold an accounting degree:
        </p>
        <ul>
          <li><strong>Track Every Naira:</strong> From counter cash to bank transfers and POS settlement slips.</li>
          <li><strong>Protect Profit Margins:</strong> Real-time Weighted Average Costing ensures your selling prices generate true profit after cost of goods.</li>
          <li><strong>Eliminate Debt Disputes:</strong> Transparent ledgers for customer debtors and distributor payables.</li>
          <li><strong>Streamline People & Payroll:</strong> Manage your team, track allowances and deductions, and issue accurate salary payments.</li>
          <li><strong>Enforce Role Privacy:</strong> Keep sensitive company net margins, bank balances, and executive payroll restricted from ordinary counter cashiers.</li>
        </ul>

        <h2>Who BizFlow Is For</h2>
        <p>
          BizFlow is purposely designed for real small and growing enterprises operating in dynamic commercial environments:
        </p>
        <ul>
          <li>Retail supermarkets, grocery stores, and neighborhood provisions marts.</li>
          <li>Wholesale distributors handling high-volume bulk cartons and bags.</li>
          <li>Building materials, electronics, and hardware dealers.</li>
          <li>Boutiques, fashion designers, and clothing retailers.</li>
          <li>Restaurants, food outlets, and hospitality vendors.</li>
          <li>Growing service agencies and professional trading enterprises.</li>
        </ul>

        <h2>Our Approach: Simplicity, Visibility, and Growth</h2>
        <p>
          We believe financial technology should empower business owners rather than intimidate them. We adhere to three core design principles:
        </p>
        <ul>
          <li><strong>Simplicity:</strong> Fast 1-click counter sales, clean forms, and responsive mobile controls.</li>
          <li><strong>Financial Visibility:</strong> Automatic double-entry accounting guarantees that every debit has a balanced credit, eliminating phantom profits.</li>
          <li><strong>Business Growth:</strong> Actionable insights and low-stock intelligence that help owners make timely restock decisions.</li>
        </ul>

        <div style="margin-top: 40px; text-align: center;">
          <button class="btn btn-primary btn-lg" onclick="navigateToAuth('register')">
            Get Started with BizFlow Today &rarr;
          </button>
        </div>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, 'about');
}

// --- 2. FEATURES PAGE (Requirement 7) ---
function renderFeaturesPage() {
  const contentHtml = `
    <div class="public-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Complete Platform Overview</div>
          <h1 class="section-heading">Features Built for Complete Operational Control</h1>
          <p class="section-description">
            Explore how BizFlow unifies counter sales, inventory tracking, payroll management, and double-entry accounting.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 48px;">
          <!-- 1. Business Management -->
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <span style="font-size: 1.8rem;">🏢</span>
              <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--navy-dark); margin: 0;">1. Business Management</h2>
            </div>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
              Manage your company profile, currency preferences, tax identification, and multi-user team hierarchy.
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Executive Dashboard</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Real-time snapshot of sales, gross profit, cash on hand, and receivables.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Team Roles & Permissions</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Separate owner, manager, accountant, cashier, and staff permissions.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Multi-Store Support</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Switch between different business entities from a single unified user account.</div>
              </div>
            </div>
          </div>

          <!-- 2. Sales & Invoicing -->
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <span style="font-size: 1.8rem;">🧾</span>
              <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--navy-dark); margin: 0;">2. Sales & Invoicing</h2>
            </div>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
              Built for speed at the checkout counter and precision for bulk trade orders.
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Lightning POS Counter</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Search products, adjust quantities, apply discounts, and complete checkout in seconds.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Thermal Receipt Printing</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Formatted 80mm/58mm thermal receipts with business details, invoice number, and tax breakdown.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Split & Credit Payments</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Support partial cash, POS transfer, or full credit sales with automatic debtor tracking.</div>
              </div>
            </div>
          </div>

          <!-- 3. Inventory & Purchasing -->
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <span style="font-size: 1.8rem;">📦</span>
              <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--navy-dark); margin: 0;">3. Inventory & Purchasing</h2>
            </div>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
              Maintain accurate stock counts, purchase history, and cost valuations.
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Weighted Average Costing</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Recalculates product cost dynamically upon every restock batch.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Reorder Level Alerts</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Visual warnings when shelf units drop to or below safety thresholds.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Supplier Purchase Orders</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Record restock batches, track supplier bills, and record repayment installments.</div>
              </div>
            </div>
          </div>

          <!-- 4. People & Payroll -->
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <span style="font-size: 1.8rem;">👥</span>
              <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--navy-dark); margin: 0;">4. People & Payroll</h2>
            </div>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
              Manage your workforce and salary payment obligations without spreadsheet errors.
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Staff Directory</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Employee IDs, positions, departments, contact numbers, and basic salary structures.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Net Salary Calculator</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Automatic calculation of Basic Salary + Allowances - Deductions.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Automatic Double-Entry</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Salary payouts instantly debit Salaries & Wages Expense (6040) and credit Bank Account.</div>
              </div>
            </div>
          </div>

          <!-- 5. Financial Statements & AI Insights -->
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <span style="font-size: 1.8rem;">📊</span>
              <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--navy-dark); margin: 0;">5. Financial Statements & AI Insights</h2>
            </div>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
              Get board-level financial transparency and intelligent conversational analytics.
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Profit & Loss (P&L)</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Revenue, COGS, operating expenses, and net profit calculated for any custom date range.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Balance Sheet & Cash Flow</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Complete equation: Assets = Liabilities + Equity with live cash and bank breakdowns.</div>
              </div>
              <div style="padding: 16px; background: var(--bg-app); border-radius: 8px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">AI Business Assistant</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Ask natural questions: "What was my top selling product this week?" or "How much do customers owe me?"</div>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 60px; text-align: center;">
          <button class="btn btn-primary btn-lg" onclick="navigateToAuth('register')">
            Get Started Now &rarr;
          </button>
        </div>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, 'features');
}

// --- 3. PRICING PAGE (Requirement 8) ---
function renderPricingPage() {
  const contentHtml = `
    <div class="public-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Affordable Subscriptions</div>
          <h1 class="section-heading">Predictable Monthly Plans for Growing Teams</h1>
          <p class="section-description">
            All plans are billed monthly in Nigerian Naira (₦). Seat limits represent the total active users including the business administrator.
          </p>
        </div>

        <div class="pricing-grid">
          <!-- Basic Plan -->
          <div class="pricing-card">
            <div class="plan-name">BizFlow Basic</div>
            <div class="plan-desc">Perfect for single-location shops, retail counters, and solo operators with one helper.</div>
            <div class="plan-price-box">
              <span class="plan-amount">₦5,000</span>
              <span class="plan-interval">/ month</span>
            </div>
            <div class="plan-seats-badge">Up to 2 Active Users (Owner + 1 Staff)</div>

            <ul class="plan-features-list">
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                POS Counter Billing & Receipt Printing
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Inventory Tracking & Low-Stock Alerts
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Customer Debtors & Supplier Creditors
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Expense Tracking & Cash Ledgers
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Standard Financial Summary Reports
              </li>
            </ul>

            <button class="btn btn-secondary btn-block" onclick="navigateToAuth('register')" style="padding: 12px;">
              Get Started with Basic
            </button>
          </div>

          <!-- Business Plan -->
          <div class="pricing-card featured">
            <div class="popular-badge">Most Popular</div>
            <div class="plan-name">BizFlow Business</div>
            <div class="plan-desc">Designed for scaling retail, wholesale, supermarkets, and multi-staff operations.</div>
            <div class="plan-price-box">
              <span class="plan-amount">₦10,000</span>
              <span class="plan-interval">/ month</span>
            </div>
            <div class="plan-seats-badge" style="background: var(--blue-light); color: var(--blue-primary);">Up to 5 Active Users (Owner + 4 Staff)</div>

            <ul class="plan-features-list">
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                <strong>Everything in Basic Plan</strong>
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Full Double-Entry Financial Engine (P&L, Balance Sheet, Cash Flow)
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Complete Staff & Salary Payroll Engine
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Automatic Salary Expense Journal Integration
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                AI Business Assistant & Conversational Analytics
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Permanent Audit Trail & Security Logs
              </li>
            </ul>

            <button class="btn btn-primary btn-block" onclick="navigateToAuth('register')" style="padding: 12px;">
              Get Started with Business
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, 'pricing');
}

// --- 4. CONTACT PAGE (Requirement 23) ---
function renderContactPage() {
  const contentHtml = `
    <div class="public-section">
      <div class="section-container" style="max-width: 900px;">
        <div class="section-header">
          <div class="section-eyebrow">Get in Touch</div>
          <h1 class="section-heading">Contact the BizFlow Team</h1>
          <p class="section-description">
            Have questions about onboarding your business or configuring subscription seats? Send us a message and our support team will respond promptly.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 40px; align-items: start;">
          <!-- Contact Info -->
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 16px;">Office & Support</h3>
            <div style="display: flex; flex-direction: column; gap: 20px; font-size: 0.92rem; color: var(--text-secondary);">
              <div>
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 2px;">Email Support</div>
                <a href="mailto:support@bizflow.ng" style="color: var(--blue-primary); font-weight: 600;">support@bizflow.ng</a>
              </div>
              <div>
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 2px;">Phone Inquiries</div>
                <div>+234 800 BIZFLOW (+234 800 249 3569)</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Mon – Fri: 8:00 AM – 6:00 PM WAT</div>
              </div>
              <div>
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 2px;">Commercial Hub</div>
                <div>Victoria Island Commercial District, Lagos, Nigeria</div>
              </div>
              <div style="padding: 16px; background: var(--blue-subtle); border-radius: 8px; margin-top: 10px;">
                <div style="font-weight: 750; color: var(--navy-dark); margin-bottom: 4px;">Quick Answers?</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Check our compiled answers to common questions regarding POS, billing, and staff limits.</div>
                <a href="#faq" style="font-weight: 700; font-size: 0.85rem;">Browse FAQ &rarr;</a>
              </div>
            </div>
          </div>

          <!-- Contact Form -->
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 32px; box-shadow: var(--shadow-sm);">
            <form onsubmit="event.preventDefault(); submitPublicContactForm();" id="public-contact-form">
              <div class="form-group">
                <label class="form-label">Your Full Name *</label>
                <input type="text" id="cf-name" class="form-control" placeholder="e.g. Adebayo Adeleke" required>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input type="email" id="cf-email" class="form-control" placeholder="adebayo@business.com" required>
              </div>

              <div class="form-group">
                <label class="form-label">Subject</label>
                <input type="text" id="cf-subject" class="form-control" placeholder="e.g. Question about Multi-store Inventory">
              </div>

              <div class="form-group">
                <label class="form-label">Message *</label>
                <textarea id="cf-message" class="form-control" rows="5" placeholder="How can we assist your business operations?" required minlength="5"></textarea>
              </div>

              <button type="submit" id="cf-submit-btn" class="btn btn-primary btn-block" style="padding: 12px;">
                Send Message &rarr;
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, 'contact');
}

async function submitPublicContactForm() {
  const name = document.getElementById('cf-name').value;
  const email = document.getElementById('cf-email').value;
  const subject = document.getElementById('cf-subject').value;
  const message = document.getElementById('cf-message').value;
  const btn = document.getElementById('cf-submit-btn');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending message...';
  }

  try {
    const res = await API.post('/public/contact', { name, email, subject, message });
    showToast(res.message || 'Message sent successfully!', 'success');
    const form = document.getElementById('public-contact-form');
    if (form) form.reset();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send Message →';
    }
  }
}

// --- 5. PRIVACY POLICY (Requirement 24) ---
function renderPrivacyPage() {
  const contentHtml = `
    <div class="legal-container">
      <div class="legal-header">
        <h1 class="legal-title">Privacy Policy</h1>
        <p class="legal-meta">Last Updated: September 2026 • Suitable for preliminary review prior to legal finalization</p>
      </div>

      <div class="legal-content">
        <h2>1. Introduction</h2>
        <p>
          BizFlow ("we", "our", or "us") is dedicated to safeguarding the privacy and integrity of information entrusted to us by business enterprises and their authorized representatives. This Privacy Policy explains how we collect, process, store, and protect your information when accessing our platform.
        </p>

        <h2>2. Information We Collect</h2>
        <p>In operating the BizFlow platform, we collect the following categories of information:</p>
        <ul>
          <li><strong>Account Information:</strong> Full name, verified business email address, phone number, and encrypted authentication credentials.</li>
          <li><strong>Business Entity Information:</strong> Registered trading name, industry categorization, business address, local government area/state, tax identification number, and default functional currency.</li>
          <li><strong>Operational & Transactional Records:</strong> Products, SKUs, inventory cost and selling prices, sales invoices, receipts, expenses, customer debtor ledgers, and supplier creditor histories.</li>
          <li><strong>Employee & Staff Records:</strong> Staff names, internal employee identification codes, assigned roles, departments, employment dates, and salary payment records necessary for payroll processing.</li>
        </ul>

        <h2>3. How We Use Collected Information</h2>
        <p>Information gathered is utilized strictly to provide and maintain business platform services:</p>
        <ul>
          <li>Enabling Point of Sale (POS) billing, receipt formatting, and real-time inventory adjustments.</li>
          <li>Executing accurate double-entry accounting computations including Profit & Loss and Balance Sheets.</li>
          <li>Processing authorized subscription memberships and enforcing plan seat limits.</li>
          <li>Maintaining an immutable, tamper-evident audit trail of system transactions for business owners.</li>
        </ul>

        <h2>4. Data Isolation & Security Practices</h2>
        <p>
          We implement rigorous multi-tenant data isolation. Every database query enforces verified business ID scoping to ensure zero cross-business exposure. Passwords are cryptographic salted hashes using bcrypt, and API interactions require signed JSON Web Tokens (JWT).
        </p>

        <h2>5. Third-Party Payment Processing</h2>
        <p>
          Subscription transactions are processed through authorized payment infrastructure partners (such as Paystack). BizFlow does not store raw credit card numbers or banking PINs on its application servers.
        </p>

        <h2>6. Data Retention & User Rights</h2>
        <p>
          Your business financial data remains safely preserved in your private database partition. In the event of subscription expiration or non-renewal, your historical records are not silently destroyed. Authorized business owners may request an export of their transaction records.
        </p>

        <h2>7. Contact Inquiries</h2>
        <p>
          For privacy inquiries or compliance notices, please contact us at <a href="mailto:privacy@bizflow.ng">privacy@bizflow.ng</a>.
        </p>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, 'privacy');
}

// --- 6. TERMS OF SERVICE (Requirement 25) ---
function renderTermsPage() {
  const contentHtml = `
    <div class="legal-container">
      <div class="legal-header">
        <h1 class="legal-title">Terms of Service</h1>
        <p class="legal-meta">Last Updated: September 2026 • Suitable for preliminary review prior to legal finalization</p>
      </div>

      <div class="legal-content">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or accessing the BizFlow business platform, you agree to be bound by these Terms of Service. If you are registering on behalf of a corporate entity, you affirm you hold legal authority to bind that enterprise.
        </p>

        <h2>2. Business Responsibilities</h2>
        <p>
          The business owner is responsible for maintaining the confidentiality of staff access credentials and for all counter sales, price changes, and inventory adjustments logged under authorized accounts.
        </p>

        <h2>3. Subscription Plans & User Limits</h2>
        <p>
          BizFlow offers monthly recurring subscription tiers:
        </p>
        <ul>
          <li><strong>BizFlow Basic:</strong> ₦5,000 per month, supporting a maximum of 2 active users (Owner + 1 staff).</li>
          <li><strong>BizFlow Business:</strong> ₦10,000 per month, supporting a maximum of 5 active users.</li>
        </ul>
        <p>
          User limits encompass all active members belonging to the business account. Attempting to add users beyond plan allocation requires an upgrade. Subscriptions remain pending until successful verification with the payment provider.
        </p>

        <h2>4. User Roles & Financial Restrictions</h2>
        <p>
          BizFlow distinguishes between business owners/administrators and operational staff. Staff and cashier roles are granted operational permissions (such as POS checkout) but are strictly prohibited from inspecting executive financial reports, Profit & Loss figures, cash balances, or salary summaries.
        </p>

        <h2>5. Acceptable Use & Financial Records</h2>
        <p>
          Users agree not to input fraudulent transactions or attempt unauthorized privilege escalation. BizFlow maintains permanent, tamper-evident audit logs of transactions, voids, and administrative changes.
        </p>

        <h2>6. Service Availability & Limitation of Liability</h2>
        <p>
          BizFlow strives for 99.9% uptime. BizFlow is a business software tool providing calculations based strictly on data inputted by users. Final tax and statutory compliance filings remain the responsibility of the business enterprise.
        </p>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, 'terms');
}

// --- 7. FAQ PAGE (Requirement 26) ---
function renderFaqPage() {
  const contentHtml = `
    <div class="public-section">
      <div class="section-container" style="max-width: 860px;">
        <div class="section-header">
          <div class="section-eyebrow">Help & Clarity</div>
          <h1 class="section-heading">Frequently Asked Questions</h1>
          <p class="section-description">
            Clear, honest answers to common questions about running your enterprise on BizFlow.
          </p>
        </div>

        <div class="faq-container">
          ${[
            { q: 'What is BizFlow?', a: 'BizFlow is a unified business and financial management web application that combines point-of-sale checkout, inventory tracking, debtor/creditor ledgers, payroll calculation, and double-entry accounting in one workspace.' },
            { q: 'Who is BizFlow for?', a: 'Retail shops, supermarkets, wholesale distributors, building material yards, electronics stores, boutiques, restaurants, and growing small businesses.' },
            { q: 'Can I add my own products and categories?', a: 'Yes. You can add unlimited products, define your purchase costs and selling prices, assign custom units (bags, cartons, pcs), and upload barcodes.' },
            { q: 'How does stock tracking work?', a: 'Stock deducts automatically upon checkout. When you restock, BizFlow uses Weighted Average Costing (WAC) to adjust your cost price dynamically.' },
            { q: 'Can I track customer debts (receivables)?', a: 'Yes! When a customer purchases on credit or makes a partial deposit, their outstanding balance is recorded and tracked on their ledger.' },
            { q: 'Can I track supplier debts (payables)?', a: 'Yes. Every restock purchase can be paid in full or recorded as credit, showing exactly how much you owe each distributor.' },
            { q: 'Can I record everyday business expenses?', a: 'Yes. You can log utility bills, generator fuel, transport, store rent, and maintenance, categorized directly into your operating expenses.' },
            { q: 'Can I manage staff and track salaries?', a: 'Yes. BizFlow features a full staff directory and a payroll engine that calculates Basic Salary + Allowances - Deductions = Net Payout.' },
            { q: 'Does salary payment integrate into my financial accounts?', a: 'Yes! When you record a salary payout, BizFlow writes a double-entry journal entry: debiting Salaries & Wages Expense (6040) and crediting Cash on Hand or Bank Account.' },
            { q: 'Does BizFlow calculate profit accurately?', a: 'Yes. BizFlow calculates true Gross Profit (Revenue - WAC COGS) and Net Profit (Gross Profit - Operating Expenses & Salaries).' },
            { q: 'Can multiple people use one business account?', a: 'Yes. The Basic plan supports up to 2 active users, and the Business plan supports up to 5 active users with customizable role permissions.' },
            { q: 'Can ordinary staff members see my net profit or bank balance?', a: 'No! The backend enforces strict role-based access control. Ordinary staff and cashiers cannot access P&L, balance sheets, expenses, or payroll summaries.' },
            { q: 'What are the subscription plans?', a: 'BizFlow Basic is ₦5,000/month (up to 2 users), and BizFlow Business is ₦10,000/month (up to 5 users). Billed monthly.' },
            { q: 'How does payment work?', a: 'Payments are processed securely via verified payment gateway providers like Paystack. Subscriptions become active upon server-side transaction verification.' },
            { q: 'What happens if my subscription expires?', a: 'Your data is 100% safe and permanently preserved. You will simply be prompted to renew your subscription to resume active operational billing.' },
            { q: 'Can I export reports and print receipts?', a: 'Yes. Invoices and POS receipts can be printed to standard 80mm/58mm thermal receipt printers, and financial statements can be printed or exported.' }
          ].map((item, idx) => `
            <div class="faq-card" onclick="toggleFaqAccordion(${idx})">
              <div class="faq-q">
                <span>${item.q}</span>
                <span id="faq-icon-${idx}" style="font-size: 1.2rem; color: var(--blue-primary);">+</span>
              </div>
              <div class="faq-a" id="faq-ans-${idx}" style="display: none;">
                ${item.a}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, 'faq');
}

// --- 8. 404 NOT FOUND PAGE (Requirement 41) ---
function render404Page() {
  const contentHtml = `
    <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 40px 24px;">
      <div style="max-width: 480px;">
        <div style="font-size: 4rem; font-weight: 900; color: var(--blue-primary); line-height: 1; margin-bottom: 12px;">404</div>
        <h1 style="font-size: 1.8rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 12px;">Page not found</h1>
        <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 28px; line-height: 1.6;">
          The page you requested could not be found. It may have moved, or the URL address may have been typed incorrectly.
        </p>
        <button class="btn btn-primary btn-lg" onclick="navigateToPublic('home')">
          Return to BizFlow
        </button>
      </div>
    </div>
  `;

  renderPublicLayout(contentHtml, '404');
}
