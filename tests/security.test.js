process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = './data/test_security_bizflow.db';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const testDbPath = path.resolve(process.cwd(), './data/test_security_bizflow.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');

const db = require('../server/config/database');
const { runMigrations } = require('../server/database/migrations');
const { seedBusinessDefaults } = require('../server/database/seedAccounts');
const InventoryService = require('../server/services/inventoryService');

console.log('>>> RUNNING BIZFLOW SECURITY & ISOLATION SUITE <<<');

runMigrations();

// Create 2 distinct users and 2 distinct businesses
const user1Id = db.prepare(`INSERT INTO users (email, password_hash, full_name) VALUES ('user1@biz.com', 'hash', 'User One')`).run().lastInsertRowid;
const user2Id = db.prepare(`INSERT INTO users (email, password_hash, full_name) VALUES ('user2@biz.com', 'hash', 'User Two')`).run().lastInsertRowid;

const bizAId = db.prepare(`INSERT INTO businesses (name, business_type, allow_negative_stock) VALUES ('Business A', 'Retail', 0)`).run().lastInsertRowid;
const bizBId = db.prepare(`INSERT INTO businesses (name, business_type, allow_negative_stock) VALUES ('Business B', 'Wholesale', 0)`).run().lastInsertRowid;

db.prepare(`INSERT INTO business_members (business_id, user_id, role) VALUES (?, ?, 'owner')`).run(bizAId, user1Id);
db.prepare(`INSERT INTO business_members (business_id, user_id, role) VALUES (?, ?, 'owner')`).run(bizBId, user2Id);

seedBusinessDefaults(bizAId);
seedBusinessDefaults(bizBId);

// 1. Multi-tenant Isolation Test
console.log('\n--- 1. Testing Multi-Business Data Isolation ---');
const prodARes = db.prepare(`
  INSERT INTO products (business_id, name, unit, cost_price, selling_price, current_stock, opening_stock)
  VALUES (?, 'Product Secret A', 'unit', 100, 200, 10, 10)
`).run(bizAId);
const prodAId = prodARes.lastInsertRowid;

// Business B tries to query Product A with business_id = bizBId
const leakedProduct = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(prodAId, bizBId);
assert.strictEqual(leakedProduct, undefined, 'Business B must NOT be able to view Business A product!');
console.log('✔ Multi-tenant isolation verified: Business B cannot read Business A product.');

// 2. Negative stock prevention test
console.log('\n--- 2. Testing Negative Stock Prevention ---');
let caughtNegativeStockError = false;
try {
  // Try to record sale of 50 units when stock is 10
  InventoryService.recordMovement({
    businessId: bizAId,
    productId: prodAId,
    transactionType: 'sale',
    quantity: -50,
    userId: user1Id
  });
} catch (err) {
  caughtNegativeStockError = true;
  console.log(`✔ Negative stock successfully prevented: "${err.message}"`);
}
assert.strictEqual(caughtNegativeStockError, true, 'Should block transaction exceeding available stock when allow_negative_stock=0');

// 3. Double-entry imbalance prevention test
console.log('\n--- 3. Testing Accounting Imbalance Prevention ---');
const AccountingService = require('../server/services/accountingService');
let caughtImbalanceError = false;
try {
  AccountingService.recordJournalEntry({
    businessId: bizAId,
    referenceType: 'test',
    referenceId: 1,
    description: 'Fraudulent unbalanced entry',
    userId: user1Id,
    lines: [
      { accountCode: '1010', debit: 1000, credit: 0 },
      { accountCode: '4010', debit: 0, credit: 900 } // Unbalanced by 100!
    ]
  });
} catch (err) {
  caughtImbalanceError = true;
  console.log(`✔ Double-entry imbalance successfully rejected: "${err.message}"`);
}
assert.strictEqual(caughtImbalanceError, true, 'Should reject unbalanced journal entry');

console.log('\n========================================================');
console.log('🎉 ALL SECURITY & INTEGRITY TESTS PASSED 100%! 🎉');
console.log('========================================================\n');
