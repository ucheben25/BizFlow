const db = require('../config/database');

function runMigrations() {
  console.log('[Database] Starting database migrations...');

  const migrationStatements = [
    // 1. Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 2. Businesses table
    `CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      business_type TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'Nigeria',
      currency TEXT DEFAULT 'NGN',
      currency_symbol TEXT DEFAULT '₦',
      logo_url TEXT,
      tax_identification_number TEXT,
      reorder_warning_enabled INTEGER DEFAULT 1,
      allow_negative_stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 3. Business Members table (Multi-tenancy & Roles)
    `CREATE TABLE IF NOT EXISTS business_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'accountant', 'cashier', 'staff')),
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business_id, user_id)
    );`,

    // 4. Chart of Accounts (Double-Entry Engine)
    `CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
      sub_type TEXT NOT NULL,
      is_system INTEGER DEFAULT 1,
      balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business_id, code)
    );`,

    // 5. Product Categories
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business_id, name)
    );`,

    // 6. Products table
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT,
      barcode TEXT,
      unit TEXT DEFAULT 'unit',
      cost_price REAL NOT NULL DEFAULT 0.0,
      selling_price REAL NOT NULL DEFAULT 0.0,
      current_stock REAL NOT NULL DEFAULT 0.0,
      opening_stock REAL NOT NULL DEFAULT 0.0,
      reorder_level REAL NOT NULL DEFAULT 10.0,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 7. Inventory Transactions Ledger
    `CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening_stock', 'purchase', 'sale', 'sale_return', 'purchase_return', 'damage', 'adjustment')),
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 8. Customers
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      outstanding_balance REAL DEFAULT 0.0,
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 9. Suppliers
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      outstanding_balance REAL DEFAULT 0.0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 10. Sales
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0.0,
      tax REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      balance_amount REAL NOT NULL DEFAULT 0.0,
      payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'pos', 'credit', 'split', 'other')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'returned')),
      notes TEXT,
      void_reason TEXT,
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business_id, invoice_number)
    );`,

    // 11. Sale Items
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL,
      total_price REAL NOT NULL,
      total_cost REAL NOT NULL
    );`,

    // 12. Purchases
    `CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      purchase_number TEXT NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      balance_amount REAL NOT NULL DEFAULT 0.0,
      payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'returned')),
      notes TEXT,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business_id, purchase_number)
    );`,

    // 13. Purchase Items
    `CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL
    );`,

    // 14. Expenses
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      description TEXT,
      expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 15. Centralized Payments
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      payment_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      reference_type TEXT,
      reference_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_account_code TEXT NOT NULL,
      notes TEXT,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 16. Double-Entry Journal Entries
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      entry_number TEXT NOT NULL,
      entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      reference_type TEXT NOT NULL,
      reference_id INTEGER,
      description TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      is_balanced INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business_id, entry_number)
    );`,

    // 17. Journal Entry Lines (Debit & Credit)
    `CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      debit REAL NOT NULL DEFAULT 0.0,
      credit REAL NOT NULL DEFAULT 0.0,
      description TEXT
    );`,

    // 18. Audit Logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 19. Plans (SaaS Subscriptions)
    `CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'NGN',
      billing_interval TEXT DEFAULT 'monthly',
      max_users INTEGER NOT NULL,
      description TEXT,
      features TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 20. Subscriptions
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'failed', 'cancelled', 'expired', 'past_due')),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'NGN',
      max_users INTEGER NOT NULL,
      billing_interval TEXT DEFAULT 'monthly',
      provider TEXT DEFAULT 'paystack',
      provider_reference TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_period_end DATETIME,
      cancelled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 21. Staff
    `CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      employee_id TEXT,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      position TEXT NOT NULL,
      department TEXT,
      employment_date DATE,
      employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'terminated', 'archived')),
      basic_salary REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 22. Salary Records (Payroll)
    `CREATE TABLE IF NOT EXISTS salary_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      pay_period TEXT NOT NULL,
      basic_salary REAL NOT NULL,
      allowances REAL DEFAULT 0.0,
      deductions REAL DEFAULT 0.0,
      net_salary REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
      payment_date DATETIME,
      payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'pos', 'other')),
      payment_reference TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 23. Public Website Contact Submissions
    `CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Performance Indexes
    `CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_business_product ON inventory_transactions(business_id, product_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id, sale_date);`,
    `CREATE INDEX IF NOT EXISTS idx_purchases_business ON purchases(business_id, purchase_date);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id, expense_date);`,
    `CREATE INDEX IF NOT EXISTS idx_journal_entries_business ON journal_entries(business_id, entry_date);`,
    `CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id, created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON subscriptions(business_id);`,
    `CREATE INDEX IF NOT EXISTS idx_staff_business ON staff(business_id);`,
    `CREATE INDEX IF NOT EXISTS idx_salary_records_business ON salary_records(business_id, pay_period);`,
    `CREATE INDEX IF NOT EXISTS idx_salary_records_staff ON salary_records(staff_id);`
  ];

  db.transaction(() => {
    for (const sql of migrationStatements) {
      db.prepare(sql).run();
    }

    // Seed default subscription plans (Requirement 8 & 11)
    const insertPlan = db.prepare(`
      INSERT OR IGNORE INTO plans (id, name, slug, price, currency, billing_interval, max_users, description, features, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    insertPlan.run(
      1,
      'BizFlow Basic',
      'basic',
      5000,
      'NGN',
      'monthly',
      2,
      'Essential business management for small shops, single branches, and small teams.',
      JSON.stringify([
        'Up to 2 active users (Owner + 1 staff)',
        'POS & Sales Invoicing',
        'Real-time Inventory Tracking',
        'Customer Debtors & Supplier Creditors',
        'Expense Tracking',
        'Basic Financial Reports'
      ])
    );

    insertPlan.run(
      2,
      'BizFlow Business',
      'business',
      10000,
      'NGN',
      'monthly',
      5,
      'Comprehensive enterprise financial management for growing retail, wholesale, and multi-staff businesses.',
      JSON.stringify([
        'Up to 5 active users (Owner + 4 staff)',
        'Everything in Basic Plan',
        'Full Double-Entry Accounting Engine',
        'Profit & Loss, Balance Sheet & Cash Flow',
        'Complete Staff & Salary Payroll Engine',
        'Automatic Salary Expense Journal Integration',
        'AI Business Insights & Real-time Assistant',
        'System Audit Trail & Access Logs'
      ])
    );

    // Ensure any existing business without an active subscription gets a Business plan subscription
    const existingBusinesses = db.prepare(`
      SELECT b.id FROM businesses b
      LEFT JOIN subscriptions s ON b.id = s.business_id AND s.status = 'active'
      WHERE s.id IS NULL
    `).all();

    for (const b of existingBusinesses) {
      db.prepare(`
        INSERT INTO subscriptions (
          business_id, plan_id, status, amount, currency, max_users, billing_interval, provider, provider_reference, started_at, current_period_start, current_period_end
        ) VALUES (?, 2, 'active', 10000, 'NGN', 5, 'monthly', 'system_seed', 'SEED-INITIAL-' || ?, datetime('now'), datetime('now'), datetime('now', '+30 days'))
      `).run(b.id, b.id);
    }
  })();

  console.log('[Database] Migrations executed successfully.');
}

module.exports = { runMigrations };
