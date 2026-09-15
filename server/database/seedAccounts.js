const db = require('../config/database');

const STANDARD_ACCOUNTS = [
  // Assets (1000 - 1999)
  { code: '1010', name: 'Cash on Hand', type: 'asset', sub_type: 'cash' },
  { code: '1020', name: 'Bank Account', type: 'asset', sub_type: 'bank' },
  { code: '1030', name: 'POS Account', type: 'asset', sub_type: 'pos' },
  { code: '1100', name: 'Accounts Receivable (Debtors)', type: 'asset', sub_type: 'receivable' },
  { code: '1200', name: 'Inventory Asset', type: 'asset', sub_type: 'inventory' },

  // Liabilities (2000 - 2999)
  { code: '2010', name: 'Accounts Payable (Creditors)', type: 'liability', sub_type: 'payable' },

  // Equity (3000 - 3999)
  { code: '3010', name: "Owner's Equity", type: 'equity', sub_type: 'equity' },
  { code: '3020', name: 'Retained Earnings', type: 'equity', sub_type: 'equity' },

  // Revenue (4000 - 4999)
  { code: '4010', name: 'Sales Revenue', type: 'revenue', sub_type: 'sales' },
  { code: '4020', name: 'Other Income', type: 'revenue', sub_type: 'other_income' },

  // Cost of Goods Sold (5000 - 5999)
  { code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'expense', sub_type: 'cogs' },

  // Operating Expenses (6000 - 6999)
  { code: '6010', name: 'Transportation & Delivery', type: 'expense', sub_type: 'operating' },
  { code: '6020', name: 'Electricity & Utilities', type: 'expense', sub_type: 'operating' },
  { code: '6030', name: 'Rent', type: 'expense', sub_type: 'operating' },
  { code: '6040', name: 'Salaries & Wages', type: 'expense', sub_type: 'operating' },
  { code: '6050', name: 'Fuel & Generator', type: 'expense', sub_type: 'operating' },
  { code: '6060', name: 'Internet & Phone', type: 'expense', sub_type: 'operating' },
  { code: '6070', name: 'Repairs & Maintenance', type: 'expense', sub_type: 'operating' },
  { code: '6080', name: 'Advertising & Marketing', type: 'expense', sub_type: 'operating' },
  { code: '6090', name: 'Packaging & Supplies', type: 'expense', sub_type: 'operating' },
  { code: '6100', name: 'Bank Charges & POS Fees', type: 'expense', sub_type: 'operating' },
  { code: '6110', name: 'Miscellaneous Expenses', type: 'expense', sub_type: 'operating' }
];

const DEFAULT_CATEGORIES = [
  'General Goods',
  'Provisions & Food',
  'Building Materials',
  'Electronics & Gadgets',
  'Clothing & Fashion',
  'Services'
];

function seedBusinessDefaults(businessId) {
  const insertAccount = db.prepare(`
    INSERT OR IGNORE INTO accounts (business_id, code, name, type, sub_type, is_system, balance)
    VALUES (?, ?, ?, ?, ?, 1, 0.0)
  `);

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (business_id, name, description)
    VALUES (?, ?, ?)
  `);

  const insertCustomer = db.prepare(`
    INSERT OR IGNORE INTO customers (business_id, name, phone, email, address, is_default)
    VALUES (?, 'Walk-in Customer', '', '', 'In-store', 1)
  `);

  db.transaction(() => {
    // Seed standard chart of accounts
    for (const acc of STANDARD_ACCOUNTS) {
      insertAccount.run(businessId, acc.code, acc.name, acc.type, acc.sub_type);
    }

    // Seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      insertCategory.run(businessId, cat, `Standard ${cat} category`);
    }

    // Seed default walk-in customer
    const existingWalkIn = db.prepare('SELECT id FROM customers WHERE business_id = ? AND is_default = 1').get(businessId);
    if (!existingWalkIn) {
      insertCustomer.run(businessId);
    }
  })();
}

module.exports = { seedBusinessDefaults, STANDARD_ACCOUNTS };
