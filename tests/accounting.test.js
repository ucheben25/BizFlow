// Set test database path before loading app
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = './data/test_bizflow.db';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Clean test database if exists
const testDbPath = path.resolve(process.cwd(), './data/test_bizflow.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
// Clean WAL and SHM files
if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');

const db = require('../server/config/database');
const { runMigrations } = require('../server/database/migrations');
const { seedBusinessDefaults } = require('../server/database/seedAccounts');
const AccountingService = require('../server/services/accountingService');
const InventoryService = require('../server/services/inventoryService');

console.log('>>> RUNNING BIZFLOW FINANCIAL & ACCOUNTING SUITE <<<');

// 1. Initialize schema
runMigrations();

// 2. Create User
const userId = db.prepare(`
  INSERT INTO users (email, password_hash, full_name)
  VALUES ('owner@bizflow.ng', 'hashed_pw', 'Alhaji Musa')
`).run().lastInsertRowid;

// 3. Create Business
const bizId = db.prepare(`
  INSERT INTO businesses (name, business_type, currency, currency_symbol)
  VALUES ('Musa Building Supplies', 'Building Materials Retail', 'NGN', '₦')
`).run().lastInsertRowid;

// 4. Link User as Owner and seed Chart of Accounts
db.prepare(`
  INSERT INTO business_members (business_id, user_id, role, permissions)
  VALUES (?, ?, 'owner', '["all"]')
`).run(bizId, userId);

seedBusinessDefaults(bizId);

console.log('✔ Business and Chart of Accounts successfully initialized.');

// -------------------------------------------------------------
// REQUIREMENT 48: ACCOUNTING SCENARIO TEST
// -------------------------------------------------------------
console.log('\n--- Testing Requirement 48: Core Financial Reconciliation Scenario ---');

// STEP 1: Create product with Opening Stock: 100 units @ ₦8,500 each
const costPrice = 8500;
const sellingPrice = 9500;
const openingStock = 100;

const prodRes = db.prepare(`
  INSERT INTO products (
    business_id, name, unit, cost_price, selling_price, current_stock, opening_stock, reorder_level
  ) VALUES (?, 'Cement 50kg', 'bag', ?, ?, 0, ?, 20)
`).run(bizId, costPrice, sellingPrice, openingStock);

const productId = prodRes.lastInsertRowid;
const openingInventoryValue = openingStock * costPrice; // 850,000

// Record opening stock inventory movement & double entry
InventoryService.recordMovement({
  businessId: bizId,
  productId,
  transactionType: 'opening_stock',
  quantity: openingStock,
  unitCost: costPrice,
  referenceType: 'product_init',
  referenceId: productId,
  notes: 'Opening stock',
  userId
});

AccountingService.recordJournalEntry({
  businessId: bizId,
  referenceType: 'opening_stock',
  referenceId: productId,
  description: 'Initial opening inventory for Cement 50kg',
  userId,
  lines: [
    { accountCode: '1200', debit: openingInventoryValue, credit: 0 },
    { accountCode: '3010', debit: 0, credit: openingInventoryValue }
  ]
});

console.log(`✔ Step 1: Opening Stock created. 100 units @ ₦8,500 = ₦${openingInventoryValue.toLocaleString()}`);

// STEP 2: Purchase 50 units @ ₦8,500 (Paid in full with cash)
const purchaseQty = 50;
const purchaseUnitCost = 8500;
const purchaseTotal = purchaseQty * purchaseUnitCost; // 425,000

const purchaseRes = db.prepare(`
  INSERT INTO purchases (
    business_id, purchase_number, user_id, total_amount, paid_amount, balance_amount, payment_status, payment_method
  ) VALUES (?, 'PO-2026-00001', ?, ?, ?, 0, 'paid', 'cash')
`).run(bizId, userId, purchaseTotal, purchaseTotal);

const purchaseId = purchaseRes.lastInsertRowid;

InventoryService.recordMovement({
  businessId: bizId,
  productId,
  transactionType: 'purchase',
  quantity: purchaseQty,
  unitCost: purchaseUnitCost,
  referenceType: 'purchase',
  referenceId: purchaseId,
  notes: 'Purchase PO-2026-00001',
  userId
});

AccountingService.recordJournalEntry({
  businessId: bizId,
  referenceType: 'purchase',
  referenceId: purchaseId,
  description: 'Purchase PO-2026-00001',
  userId,
  lines: [
    { accountCode: '1200', debit: purchaseTotal, credit: 0 },
    { accountCode: '1010', debit: 0, credit: purchaseTotal }
  ]
});

console.log(`✔ Step 2: Purchase completed. 50 units @ ₦8,500 = ₦${purchaseTotal.toLocaleString()}`);

// Check inventory after purchase: should be 150 units
const afterPurchaseProduct = db.prepare('SELECT current_stock, cost_price FROM products WHERE id = ?').get(productId);
assert.strictEqual(afterPurchaseProduct.current_stock, 150, 'Units available must be 150');
assert.strictEqual(afterPurchaseProduct.cost_price, 8500, 'Weighted average cost must be 8500');
console.log('✔ Units available verified: 150 units');

// STEP 3: Customer buys 10 units @ ₦9,500. Customer pays ₦50,000 (Remaining balance = ₦45,000)
// Create customer
const custRes = db.prepare(`
  INSERT INTO customers (business_id, name, phone)
  VALUES (?, 'Chidi Enterprises', '08012345678')
`).run(bizId);
const customerId = custRes.lastInsertRowid;

const saleQty = 10;
const saleRevenue = saleQty * sellingPrice; // 95,000
const cogs = saleQty * costPrice; // 85,000
const customerPaid = 50000;
const customerBalance = saleRevenue - customerPaid; // 45,000

const saleRes = db.prepare(`
  INSERT INTO sales (
    business_id, invoice_number, customer_id, user_id, subtotal, discount, tax,
    total_amount, paid_amount, balance_amount, payment_status, payment_method
  ) VALUES (?, 'INV-2026-00001', ?, ?, ?, 0, 0, ?, ?, ?, 'partial', 'cash')
`).run(bizId, customerId, userId, saleRevenue, saleRevenue, customerPaid, customerBalance);
const saleId = saleRes.lastInsertRowid;

// Insert sale item
db.prepare(`
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_cost, total_price, total_cost)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(saleId, productId, saleQty, sellingPrice, costPrice, saleRevenue, cogs);

// Deduct inventory
InventoryService.recordMovement({
  businessId: bizId,
  productId,
  transactionType: 'sale',
  quantity: -saleQty,
  unitCost: costPrice,
  referenceType: 'sale',
  referenceId: saleId,
  notes: 'Sale INV-2026-00001',
  userId
});

// Update customer balance
db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?').run(customerBalance, customerId);

// Journal entry for sale
AccountingService.recordJournalEntry({
  businessId: bizId,
  referenceType: 'sale',
  referenceId: saleId,
  description: 'Sale INV-2026-00001',
  userId,
  lines: [
    { accountCode: '1010', debit: customerPaid, credit: 0 },    // Dr Cash 50,000
    { accountCode: '1100', debit: customerBalance, credit: 0 }, // Dr A/R 45,000
    { accountCode: '4010', debit: 0, credit: saleRevenue },      // Cr Sales 95,000
    { accountCode: '5010', debit: cogs, credit: 0 },             // Dr COGS 85,000
    { accountCode: '1200', debit: 0, credit: cogs }              // Cr Inventory 85,000
  ]
});

console.log(`✔ Step 3: Sale completed. 10 units sold for ₦${saleRevenue.toLocaleString()} (Paid: ₦${customerPaid.toLocaleString()}, Debt: ₦${customerBalance.toLocaleString()})`);

// STEP 4: Expense of ₦20,000 for Transportation
const expenseAmount = 20000;
const expRes = db.prepare(`
  INSERT INTO expenses (business_id, user_id, category, amount, payment_method, description)
  VALUES (?, ?, 'Transportation', ?, 'cash', 'Site delivery trip')
`).run(bizId, userId, expenseAmount);
const expenseId = expRes.lastInsertRowid;

AccountingService.recordJournalEntry({
  businessId: bizId,
  referenceType: 'expense',
  referenceId: expenseId,
  description: 'Transportation expense',
  userId,
  lines: [
    { accountCode: '6010', debit: expenseAmount, credit: 0 }, // Dr Transportation
    { accountCode: '1010', debit: 0, credit: expenseAmount }  // Cr Cash
  ]
});

console.log(`✔ Step 4: Expense recorded. ₦${expenseAmount.toLocaleString()} Transportation`);

// -------------------------------------------------------------
// VERIFICATION OF ALL REQUIRED FIGURES
// -------------------------------------------------------------
console.log('\n--- VERIFYING EXACT FINANCIAL RECONCILIATION ---');

// Check remaining stock
const finalProduct = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(productId);
assert.strictEqual(finalProduct.current_stock, 140, 'Remaining units must be 140');
console.log(`✔ Remaining units: ${finalProduct.current_stock} (Expected 140)`);

// Check customer balance
const finalCustomer = db.prepare('SELECT outstanding_balance FROM customers WHERE id = ?').get(customerId);
assert.strictEqual(finalCustomer.outstanding_balance, 45000, 'Customer balance must be ₦45,000');
console.log(`✔ Customer outstanding balance: ₦${finalCustomer.outstanding_balance.toLocaleString()} (Expected ₦45,000)`);

// Check Profit & Loss
const pnl = AccountingService.getProfitAndLoss(bizId);
assert.strictEqual(pnl.totalRevenue, 95000, 'Revenue must be ₦95,000');
console.log(`✔ Sales revenue: ₦${pnl.totalRevenue.toLocaleString()} (Expected ₦95,000)`);

assert.strictEqual(pnl.totalCOGS, 85000, 'COGS must be ₦85,000');
console.log(`✔ COGS: ₦${pnl.totalCOGS.toLocaleString()} (Expected ₦85,000)`);

assert.strictEqual(pnl.grossProfit, 10000, 'Gross profit must be ₦10,000');
console.log(`✔ Gross profit: ₦${pnl.grossProfit.toLocaleString()} (Expected ₦10,000)`);

assert.strictEqual(pnl.totalOperatingExpenses, 20000, 'Operating expenses must be ₦20,000');
console.log(`✔ Transportation expense: ₦${pnl.totalOperatingExpenses.toLocaleString()} (Expected ₦20,000)`);

assert.strictEqual(pnl.netProfit, -10000, 'Net profit must be -₦10,000');
console.log(`✔ Net profit: ₦${pnl.netProfit.toLocaleString()} (Expected -₦10,000)`);

// Check Trial Balance (Double Entry balance)
const trial = AccountingService.getTrialBalance(bizId);
console.log(`✔ Trial Balance: Total Debits = ₦${trial.sumDebit.toLocaleString()}, Total Credits = ₦${trial.sumCredit.toLocaleString()}`);
assert.strictEqual(trial.isBalanced, true, 'Trial balance must be balanced');
assert.strictEqual(trial.sumDebit, trial.sumCredit, 'Sum of debits must equal sum of credits');

// Check Balance Sheet
const bs = AccountingService.getBalanceSheet(bizId);
console.log(`✔ Balance Sheet: Total Assets = ₦${bs.totalAssets.toLocaleString()}, Liabilities + Equity = ₦${(bs.totalLiabilities + bs.totalEquity).toLocaleString()}`);
assert.strictEqual(bs.isBalanced, true, 'Balance sheet must balance: Assets = Liabilities + Equity');

console.log('\n========================================================');
console.log('🎉 ALL ACCOUNTING AND FINANCIAL SPEC TESTS PASSED 100%! 🎉');
console.log('========================================================\n');
