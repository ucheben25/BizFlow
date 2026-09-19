/**
 * BizBook Public Landing Page (Homepage)
 * Sections 1 through 12
 */

function renderPublicHomePage() {
  const contentHtml = `
    <!-- SECTION 1: HERO -->
    <section class="public-hero">
      <div class="hero-inner">
        <div class="hero-tagline-badge">
          <span>⚡ Modern Financial Business Management</span>
        </div>
        <h1 class="hero-title">
          Run your business.<br>Know your numbers.
        </h1>
        <p class="hero-subtitle">
          BizBook helps small and growing businesses manage products, sales, expenses, customers, suppliers, staff payments, inventory, and financial records from one unified, reliable workspace.
        </p>

        <div class="hero-cta-group">
          <button class="btn btn-primary btn-lg" onclick="navigateToAuth('register')" style="padding: 14px 32px; font-size: 1.05rem;">
            Get Started Now &rarr;
          </button>
          <button class="btn btn-secondary btn-lg" onclick="navigateToPublic('features')" style="padding: 14px 28px; font-size: 1.05rem;">
            Explore Features
          </button>
        </div>

        <!-- Visual Product Interface Mockup -->
        <div class="hero-preview-box">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #EF4444;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #F59E0B;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
            </div>
            <span style="font-size: 0.78rem; font-weight: 700; color: #64748B;">BizBook Dashboard • Real-time Business Metrics</span>
            <span class="badge badge-success" style="font-size: 0.72rem;">Live Engine</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px;">
            <div style="padding: 14px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Today's Sales</div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0A58CA; margin-top: 4px;">₦245,500</div>
              <div style="font-size: 0.75rem; color: #059669; font-weight: 600;">↑ 18 transactions</div>
            </div>
            <div style="padding: 14px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Gross Profit</div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #059669; margin-top: 4px;">₦62,400</div>
              <div style="font-size: 0.75rem; color: #64748B;">Accurate WAC COGS</div>
            </div>
            <div style="padding: 14px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Stock Valuation</div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0A2540; margin-top: 4px;">₦4,850,000</div>
              <div style="font-size: 0.75rem; color: #64748B;">420 Total Units</div>
            </div>
            <div style="padding: 14px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Debtors (Receivables)</div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #D97706; margin-top: 4px;">₦135,000</div>
              <div style="font-size: 0.75rem; color: #D97706; font-weight: 600;">3 Unpaid Invoices</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: WHAT IS BizBook? -->
    <section class="public-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Clarity Over Chaos</div>
          <h2 class="section-heading">What is BizBook?</h2>
          <p class="section-description">
            BizBook brings the everyday operations of your business into one organized workspace, helping you keep track of what you sell, what you spend, what you have in stock, what customers owe, what you owe suppliers, and how your business is performing.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
          <div style="padding: 24px; background: var(--blue-subtle); border-radius: var(--radius-lg); border-left: 4px solid var(--blue-primary);">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 8px;">No More Lost Receipts</h3>
            <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6;">
              Stop relying on paper notebooks, messy spreadsheets, or fading thermal paper. Every sale, expense, restock, and payment is recorded and searchable instantly.
            </p>
          </div>
          <div style="padding: 24px; background: #F0FDF4; border-radius: var(--radius-lg); border-left: 4px solid var(--color-success);">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 8px;">True Financial Accuracy</h3>
            <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6;">
              BizBook calculates your exact Cost of Goods Sold (COGS) using real weighted average cost, giving you true gross profit and net profit—not guesses.
            </p>
          </div>
          <div style="padding: 24px; background: #FFFBEB; border-radius: var(--radius-lg); border-left: 4px solid var(--color-warning);">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 8px;">Role-Protected Privacy</h3>
            <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6;">
              Your cashiers and store staff can record sales and ring up customers without ever seeing your company net profit, bank balances, or supplier costs.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: BUILT FOR BUSINESSES -->
    <section class="public-section bg-subtle">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Industry Ready</div>
          <h2 class="section-heading">Designed for Real Everyday Businesses</h2>
          <p class="section-description">
            Whether you operate an over-the-counter shop or a multi-staff distribution warehouse, BizBook adapts to your workflow.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px;">
          ${[
            { title: 'Retail Stores', icon: '🛒', desc: 'Supermarkets, provision shops, and mini-marts.' },
            { title: 'Wholesale Distributors', icon: '📦', desc: 'Bulk goods, FMCG distributors, carton sales.' },
            { title: 'Fashion & Boutiques', icon: '👗', desc: 'Clothing lines, shoes, accessories, and fabrics.' },
            { title: 'Building Materials', icon: '🏗️', desc: 'Cement, plumbing, electrical, and hardware.' },
            { title: 'Electronics & Gadgets', icon: '📱', desc: 'Phones, computers, appliances, and accessories.' },
            { title: 'Restaurants & Eateries', icon: '🍽️', desc: 'Food outlets, bakeries, lounges, and cafes.' },
            { title: 'Service Enterprises', icon: '💼', desc: 'Agencies, maintenance providers, and workshops.' },
            { title: 'Growing SMEs', icon: '🚀', desc: 'Scaling enterprises managing teams and multi-products.' }
          ].map(b => `
            <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; text-align: center;">
              <div style="font-size: 2.2rem; margin-bottom: 10px;">${b.icon}</div>
              <div style="font-weight: 750; color: var(--navy-dark); font-size: 1.05rem; margin-bottom: 4px;">${b.title}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">${b.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- SECTION 4: CORE FEATURES -->
    <section class="public-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Everything You Need</div>
          <h2 class="section-heading">Core Features Built for Control</h2>
          <p class="section-description">
            Twelve integrated modules built to handle every operational requirement of your enterprise.
          </p>
        </div>

        <div class="feature-grid-3">
          ${[
            { title: 'Sales Management', desc: 'Fast POS counter billing, receipt generation, split payments, and customer invoicing.' },
            { title: 'Inventory Management', desc: 'Real-time stock tracking with Weighted Average Costing and low-stock alerts.' },
            { title: 'Product Catalog', desc: 'Unlimited products, category groupings, SKU/barcode lookup, and price management.' },
            { title: 'Expense Tracking', desc: 'Record overheads, logistics, generator fuel, and rent with categorized accounting.' },
            { title: 'Customer (Debtors) Records', desc: 'Track customer debt balances, partial payment history, and credit sales.' },
            { title: 'Supplier (Creditors) Records', desc: 'Monitor purchase orders, supplier debts, and repayment schedules.' },
            { title: 'Financial Reports', desc: 'Instant Profit & Loss, Balance Sheet, Cash Flow, and Trial Balance generation.' },
            { title: 'Payroll Engine', desc: 'Record salaries, calculate allowances and deductions, and issue payment entries.' },
            { title: 'Staff Management', desc: 'Dedicated employee directory, position records, and salary structures.' },
            { title: 'Payment Tracking', desc: 'Central cash and bank ledger for every inflow, outflow, POS slip, and transfer.' },
            { title: 'Business Accounts', desc: 'Standardized double-entry chart of accounts powering all financial integrity.' },
            { title: 'AI Business Insights', desc: 'Ask natural-language questions about your sales, margins, and top products.' }
          ].map(f => `
            <div class="feature-card">
              <div class="feature-icon-wrapper">
                <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="feature-card-title">${f.title}</div>
              <div class="feature-card-desc">${f.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- SECTION 5: HOW BizBook WORKS -->
    <section class="public-section bg-subtle">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Fast Onboarding</div>
          <h2 class="section-heading">How BizBook Works in 4 Steps</h2>
          <p class="section-description">
            Get your business set up in under five minutes with zero accounting complexity.
          </p>
        </div>

        <div class="workflow-grid">
          <div class="workflow-card">
            <div class="step-badge">1</div>
            <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark); margin-bottom: 8px;">Create Business</h4>
            <p style="font-size: 0.88rem; color: var(--text-secondary);">Register your company and select your monthly subscription plan.</p>
          </div>
          <div class="workflow-card">
            <div class="step-badge">2</div>
            <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark); margin-bottom: 8px;">Add Products & Staff</h4>
            <p style="font-size: 0.88rem; color: var(--text-secondary);">Enter inventory with purchase costs, selling prices, and invite staff.</p>
          </div>
          <div class="workflow-card">
            <div class="step-badge">3</div>
            <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark); margin-bottom: 8px;">Record Daily Work</h4>
            <p style="font-size: 0.88rem; color: var(--text-secondary);">Ring up sales, record restock purchases, and log everyday expenses.</p>
          </div>
          <div class="workflow-card">
            <div class="step-badge">4</div>
            <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark); margin-bottom: 8px;">Know Your Numbers</h4>
            <p style="font-size: 0.88rem; color: var(--text-secondary);">View live profits, debtors, cash flow, and low-stock warnings instantly.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 6: KNOW YOUR NUMBERS -->
    <section class="public-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Financial Visibility</div>
          <h2 class="section-heading">Know Your Key Financial Numbers</h2>
          <p class="section-description">
            BizBook breaks down your finances into clean, actionable metrics so you always know where your money is.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px;">
          ${[
            { title: 'Sales Revenue', desc: 'Total gross value of all completed sales, separated into cash collected and pending credit balances.' },
            { title: 'Operating Expenses', desc: 'Total money spent on utilities, generator diesel, transport, rent, maintenance, and supplies.' },
            { title: 'Gross Profit', desc: 'Revenue minus true Cost of Goods Sold (COGS). Tells you if your product markups are actually healthy.' },
            { title: 'Net Profit', desc: 'Gross profit minus all operational expenses and salaries. Your actual bottom line after every bill.' },
            { title: 'Cash Flow', desc: 'Live balances across Cash on Hand, Bank Accounts, and POS settlements. Never wonder where cash went.' },
            { title: 'Inventory Value', desc: 'Total monetary worth of goods sitting on your shelves, calculated via Weighted Average Cost.' },
            { title: 'Customer Receivables', desc: 'Who owes you money, how long they have owed, and how much has been recovered.' },
            { title: 'Supplier Payables', desc: 'What you owe your distributors, due dates, and remaining balances on bulk goods.' }
          ].map(k => `
            <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 22px;">
              <h4 style="font-weight: 800; font-size: 1.05rem; color: var(--blue-primary); margin-bottom: 6px;">${k.title}</h4>
              <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.55;">${k.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- SECTION 7: INVENTORY MANAGEMENT -->
    <section class="public-section bg-subtle">
      <div class="section-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;">
        <div>
          <div class="section-eyebrow">Never Run Out</div>
          <h2 class="section-heading" style="text-align: left;">Automated Inventory & Low-Stock Alerts</h2>
          <p class="section-description" style="text-align: left; margin-bottom: 20px;">
            Add products with barcodes, assign reorder thresholds, and let BizBook automatically calculate your inventory value using Weighted Average Costing (WAC).
          </p>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li style="display: flex; gap: 10px; font-size: 0.92rem; color: var(--text-primary);">
              <span style="color: var(--color-success); font-weight: 800;">✔</span>
              Automatic stock deduction upon counter checkout
            </li>
            <li style="display: flex; gap: 10px; font-size: 0.92rem; color: var(--text-primary);">
              <span style="color: var(--color-success); font-weight: 800;">✔</span>
              Configurable reorder level warnings to prevent stockouts
            </li>
            <li style="display: flex; gap: 10px; font-size: 0.92rem; color: var(--text-primary);">
              <span style="color: var(--color-success); font-weight: 800;">✔</span>
              Support for stock damage, shrinkage, and audit adjustments
            </li>
          </ul>
        </div>
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-md);">
          <div style="font-weight: 800; color: var(--navy-dark); margin-bottom: 14px; font-size: 1.05rem;">Stock Health Overview</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #FEF2F2; border-radius: 6px; border: 1px solid #FCA5A5;">
              <div>
                <div style="font-weight: 700; color: #991B1B; font-size: 0.88rem;">Golden Penny Semovita 10kg</div>
                <div style="font-size: 0.75rem; color: #DC2626;">Only 4 bags remaining (Reorder level: 15)</div>
              </div>
              <span class="badge badge-danger">Low Stock</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #F8FAFC; border-radius: 6px; border: 1px solid var(--border-color);">
              <div>
                <div style="font-weight: 700; color: var(--navy-dark); font-size: 0.88rem;">Dangote Sugar 50kg</div>
                <div style="font-size: 0.75rem; color: #64748B;">20 bags on shelf • Valued at ₦1,360,000</div>
              </div>
              <span class="badge badge-success">Optimal</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 8: PAYROLL ENGINE -->
    <section class="public-section">
      <div class="section-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;">
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-md);">
          <div style="font-weight: 800; color: var(--navy-dark); margin-bottom: 14px; font-size: 1.05rem;">Monthly Payroll Record</div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
              <span style="color: #64748B;">Staff Member</span>
              <span style="font-weight: 750;">Chidi Nwosu (Operations)</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
              <span style="color: #64748B;">Basic Salary</span>
              <span style="font-weight: 700;">₦250,000</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
              <span style="color: #64748B;">Allowances</span>
              <span style="font-weight: 700; color: #059669;">+ ₦30,000</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
              <span style="color: #64748B;">Deductions</span>
              <span style="font-weight: 700; color: #DC2626;">- ₦10,000</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 850; padding: 10px 0; color: var(--navy-dark);">
              <span>Net Payout</span>
              <span style="color: var(--blue-primary);">₦270,000</span>
            </div>
            <div style="font-size: 0.78rem; color: #059669; font-weight: 600; text-align: center; margin-top: 4px;">
              ⚡ Auto-debits Salary Expense & credits Bank ledger
            </div>
          </div>
        </div>

        <div>
          <div class="section-eyebrow">People & Payroll</div>
          <h2 class="section-heading" style="text-align: left;">Integrated Staff & Salary Management</h2>
          <p class="section-description" style="text-align: left; margin-bottom: 20px;">
            Eliminate separate payroll spreadsheets. Record salaries, calculate allowances and custom deductions, and execute payments that instantly integrate into your Profit & Loss statement.
          </p>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px;">
            <li style="display: flex; gap: 10px; font-size: 0.92rem; color: var(--text-primary);">
              <span style="color: var(--color-success); font-weight: 800;">✔</span>
              Formula: Basic Salary + Allowances - Deductions = Net Salary
            </li>
            <li style="display: flex; gap: 10px; font-size: 0.92rem; color: var(--text-primary);">
              <span style="color: var(--color-success); font-weight: 800;">✔</span>
              Automatic Double-Entry: Debits Salary Expense (6040) & Credits Cash/Bank
            </li>
            <li style="display: flex; gap: 10px; font-size: 0.92rem; color: var(--text-primary);">
              <span style="color: var(--color-success); font-weight: 800;">✔</span>
              Role-restricted: ordinary staff cannot view salaries or payroll totals
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- SECTION 9: SECURITY -->
    <section class="public-section bg-subtle">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Enterprise Protection</div>
          <h2 class="section-heading">Security and Access Control</h2>
          <p class="section-description">
            Your financial data belongs exclusively to you. BizBook implements robust engineering practices to protect tenant isolation and credential privacy.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px;">
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark); margin-bottom: 8px;">Multi-Tenant Isolation</div>
            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">
              Every database query strictly scopes to your verified business ID. Users from other businesses can never inspect, modify, or leak your records.
            </p>
          </div>
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px;">
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark); margin-bottom: 8px;">Role-Based Permissions</div>
            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">
              Server-enforced RBAC blocks cashiers and ordinary users from viewing profit margins, expense ledgers, balance sheets, and sensitive payroll data.
            </p>
          </div>
          <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px;">
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark); margin-bottom: 8px;">Tamper-Evident Audit Trail</div>
            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">
              Every price change, stock adjustment, voided sale, and configuration update is logged with user attribution and timestamp.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 10: PRICING -->
    <section class="public-section" id="pricing-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Clear & Predictable</div>
          <h2 class="section-heading">Simple, Transparent Pricing</h2>
          <p class="section-description">
            Choose the subscription plan that fits your current team size. Upgrade seamlessly as you grow.
          </p>
        </div>

        <div class="pricing-grid">
          <!-- Basic Plan -->
          <div class="pricing-card">
            <div class="plan-name">BizBook Basic</div>
            <div class="plan-desc">Essential business management for single shops, boutiques, and small teams.</div>
            <div class="plan-price-box">
              <span class="plan-amount">₦5,000</span>
              <span class="plan-interval">/ month</span>
            </div>
            <div class="plan-seats-badge">Up to 2 Active Users (Owner + 1 Staff)</div>

            <ul class="plan-features-list">
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                POS Counter Sales & Receipts
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
                Expense Logging & Cash Ledgers
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Standard Financial Summaries
              </li>
            </ul>

            <button class="btn btn-secondary btn-block" onclick="navigateToAuth('register')" style="padding: 12px;">
              Get Started with Basic
            </button>
          </div>

          <!-- Business Plan -->
          <div class="pricing-card featured">
            <div class="popular-badge">Most Popular</div>
            <div class="plan-name">BizBook Business</div>
            <div class="plan-desc">Comprehensive enterprise management for growing retail, wholesale, and multi-staff operations.</div>
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
                Double-Entry P&L, Balance Sheet, & Cash Flow
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
                AI Business Assistant & Insights
              </li>
              <li>
                <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                Full Audit Trail & User Security Control
              </li>
            </ul>

            <button class="btn btn-primary btn-block" onclick="navigateToAuth('register')" style="padding: 12px;">
              Get Started with Business
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 11: FAQ -->
    <section class="public-section bg-subtle">
      <div class="section-container">
        <div class="section-header">
          <div class="section-eyebrow">Frequently Asked Questions</div>
          <h2 class="section-heading">Answers to Common Questions</h2>
          <p class="section-description">
            Everything you need to know about setting up and running your business on BizBook.
          </p>
        </div>

        <div class="faq-container">
          ${[
            {
              q: 'Can I add my own custom products and prices?',
              a: 'Yes! You can add unlimited products, define your purchase costs and selling prices, set barcode numbers, categorize items, and specify custom units of measurement (e.g. bags, cartons, pieces, kilograms).'
            },
            {
              q: 'Can ordinary staff members see my net profit or bank balance?',
              a: 'No. BizBook strictly enforces role-based access on the server. Staff and cashiers can process counter sales and look up items, but are forbidden from viewing Profit & Loss, gross/net profits, bank balances, or payroll summaries.'
            },
            {
              q: 'How does the staff limit work for each plan?',
              a: 'The Basic plan (₦5,000/month) allows up to 2 active users (Owner + 1 staff). The Business plan (₦10,000/month) allows up to 5 active users. You can upgrade smoothly at any time when your team grows.'
            },
            {
              q: 'How does salary payment integrate into my accounts?',
              a: 'When you record a salary payout, BizBook automatically writes a balanced double-entry journal entry: debiting Salaries & Wages Operating Expense (6040) and crediting Cash on Hand or Bank Account, ensuring accurate P&L and Balance Sheet records.'
            },
            {
              q: 'What happens to my data if my subscription expires?',
              a: 'Your business data is 100% safe and permanently preserved. BizBook will never delete your transactions or records upon subscription lapse. You simply renew your plan to resume active operational billing.'
            }
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
    </section>

    <!-- SECTION 12: FINAL CTA -->
    <section class="public-section" style="background: linear-gradient(180deg, #0A2540 0%, #051A30 100%); color: #FFFFFF; text-align: center; padding: 80px 24px;">
      <div class="section-container" style="max-width: 760px;">
        <h2 style="font-size: 2.5rem; font-weight: 850; color: #FFFFFF; line-height: 1.2; margin-bottom: 16px;">
          Ready to run your business with more clarity?
        </h2>
        <p style="font-size: 1.15rem; color: #94A3B8; margin-bottom: 36px; line-height: 1.6;">
          Start tracking sales, managing inventory, recording staff salaries, and understanding your true financial numbers today.
        </p>

        <button class="btn btn-primary btn-lg" onclick="navigateToAuth('register')" style="padding: 16px 36px; font-size: 1.1rem; box-shadow: 0 10px 25px rgba(10, 88, 202, 0.4);">
          Get Started with BizBook Now &rarr;
        </button>
      </div>
    </section>
  `;

  renderPublicLayout(contentHtml, 'home');
}

function toggleFaqAccordion(idx) {
  const ans = document.getElementById(`faq-ans-${idx}`);
  const icon = document.getElementById(`faq-icon-${idx}`);
  if (ans && icon) {
    const isHidden = ans.style.display === 'none';
    ans.style.display = isHidden ? 'block' : 'none';
    icon.textContent = isHidden ? '−' : '+';
  }
}
