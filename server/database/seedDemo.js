const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { runMigrations } = require('./migrations');
const { seedBusinessDefaults } = require('./seedAccounts');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');

function seedDemoData() {
  console.log('[Seed] Seeding demo business data...');
  runMigrations();

  // Create demo owner
  const email = 'demo@bizflow.ng';
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('bizflow123', salt);
    const res = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone)
      VALUES (?, ?, 'Babajide Adeleke', '+234 803 123 4567')
    `).run(email, hash);
    user = { id: res.lastInsertRowid };
  }

  // Create demo business
  let biz = db.prepare("SELECT id FROM businesses WHERE name = 'Adeleke Mega Provisions'").get();
  if (!biz) {
    const res = db.prepare(`
      INSERT INTO businesses (
        name, business_type, email, phone, address, city, state, country, currency, currency_symbol, allow_negative_stock
      ) VALUES (
        'Adeleke Mega Provisions', 'Supermarket & FMCG Retail', 'info@adelekemega.com', '+234 803 123 4567',
        '14 Broad Street, Marina', 'Lagos', 'Lagos State', 'Nigeria', 'NGN', '₦', 0
      )
    `).run();
    biz = { id: res.lastInsertRowid };

    // Link user as owner
    db.prepare(`
      INSERT OR IGNORE INTO business_members (business_id, user_id, role, permissions)
      VALUES (?, ?, 'owner', '["all"]')
    `).run(biz.id, user.id);

    seedBusinessDefaults(biz.id);

    // Seed realistic products
    const demoProducts = [
      { name: 'Golden Penny Semovita 10kg', category: 'Provisions & Food', cost: 7200, price: 8500, stock: 45, reorder: 15, unit: 'bag' },
      { name: 'Dangote Granulated Sugar 50kg', category: 'Provisions & Food', cost: 68000, price: 74000, stock: 20, reorder: 5, unit: 'bag' },
      { name: 'Peak Milk Refill 850g (Pack of 6)', category: 'Provisions & Food', cost: 18500, price: 21500, stock: 12, reorder: 10, unit: 'pack' },
      { name: 'Milo Refill 1kg (Carton)', category: 'Provisions & Food', cost: 32000, price: 36500, stock: 8, reorder: 10, unit: 'carton' },
      { name: 'Sunlight Detergent 900g (Pack of 12)', category: 'General Goods', cost: 14200, price: 16500, stock: 30, reorder: 8, unit: 'pack' },
      { name: 'Mamador Vegetable Oil 3.8L', category: 'Provisions & Food', cost: 9500, price: 11000, stock: 25, reorder: 10, unit: 'keg' },
      { name: 'Indomie Instant Noodles Onion 70g (Carton)', category: 'Provisions & Food', cost: 7800, price: 9000, stock: 60, reorder: 20, unit: 'carton' },
      { name: 'Rechargeable LED Emergency Lamp', category: 'Electronics & Gadgets', cost: 5500, price: 7500, stock: 18, reorder: 5, unit: 'pcs' },
      { name: 'Thermal Receipt Paper 80x80 (Box of 50)', category: 'General Goods', cost: 22000, price: 26000, stock: 5, reorder: 8, unit: 'box' },
      { name: 'Starlink Gen 3 Standard Kit', category: 'Electronics & Gadgets', cost: 380000, price: 440000, stock: 3, reorder: 2, unit: 'set' }
    ];

    for (const p of demoProducts) {
      const cat = db.prepare('SELECT id FROM categories WHERE business_id = ? AND name = ?').get(biz.id, p.category);
      const catId = cat ? cat.id : null;

      const pRes = db.prepare(`
        INSERT INTO products (
          business_id, category_id, name, unit, cost_price, selling_price, current_stock, opening_stock, reorder_level
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(biz.id, catId, p.name, p.unit, p.cost, p.price, p.stock, p.reorder);

      const pId = pRes.lastInsertRowid;

      // Inward movement & double entry
      InventoryService.recordMovement({
        businessId: biz.id,
        productId: pId,
        transactionType: 'opening_stock',
        quantity: p.stock,
        unitCost: p.cost,
        referenceType: 'product_init',
        referenceId: pId,
        notes: 'Initial inventory onboarding',
        userId: user.id
      });

      const totalVal = p.stock * p.cost;
      AccountingService.recordJournalEntry({
        businessId: biz.id,
        referenceType: 'opening_stock',
        referenceId: pId,
        description: `Opening stock for ${p.name}`,
        userId: user.id,
        lines: [
          { accountCode: '1200', debit: totalVal, credit: 0 },
          { accountCode: '3010', debit: 0, credit: totalVal }
        ]
      });
    }

    // Seed Suppliers
    const supRes1 = db.prepare(`
      INSERT INTO suppliers (business_id, name, contact_person, phone, email, address)
      VALUES (?, 'Flour Mills of Nigeria Plc', 'Engr. Kenneth Obi', '+234 802 345 6789', 'fmn@supplies.ng', 'Wharf Road, Apapa, Lagos')
    `).run(biz.id);

    const supRes2 = db.prepare(`
      INSERT INTO suppliers (business_id, name, contact_person, phone, email, address)
      VALUES (?, 'Nestle Nigeria Distribution', 'Mrs. Funke Ajayi', '+234 809 876 5432', 'lagos.orders@nestle.ng', 'Ilupeju Industrial Estate')
    `).run(biz.id);

    // Seed Customers
    const cust1 = db.prepare(`
      INSERT INTO customers (business_id, name, phone, email, address, outstanding_balance)
      VALUES (?, 'Mama Kazeem Stores', '+234 805 111 2233', 'mamakazeem@gmail.com', 'Shop 4B, Oyingbo Market', 35000)
    `).run(biz.id);

    const cust2 = db.prepare(`
      INSERT INTO customers (business_id, name, phone, email, address, outstanding_balance)
      VALUES (?, 'Divine Grace Eatery', '+234 803 444 5566', 'divinegrace.eat@yahoo.com', '22 Bode Thomas, Surulere', 0)
    `).run(biz.id);

    // Record initial A/R journal for existing debtor
    AccountingService.recordJournalEntry({
      businessId: biz.id,
      referenceType: 'customer_debt_init',
      referenceId: cust1.lastInsertRowid,
      description: 'Opening balance debtor: Mama Kazeem Stores',
      userId: user.id,
      lines: [
        { accountCode: '1100', debit: 35000, credit: 0 },
        { accountCode: '3010', debit: 0, credit: 35000 }
      ]
    });

    // Record some realistic sales
    const semo = db.prepare("SELECT * FROM products WHERE business_id = ? AND name LIKE '%Semovita%'").get(biz.id);
    const milk = db.prepare("SELECT * FROM products WHERE business_id = ? AND name LIKE '%Peak Milk%'").get(biz.id);

    // Sale 1: Cash sale to Walk-in Customer
    const walkIn = db.prepare('SELECT id FROM customers WHERE business_id = ? AND is_default = 1').get(biz.id);
    const sale1Total = (2 * semo.selling_price) + (1 * milk.selling_price); // 2*8500 + 21500 = 38,500
    const sale1Cost = (2 * semo.cost_price) + (1 * milk.cost_price); // 2*7200 + 18500 = 32,900

    const s1Res = db.prepare(`
      INSERT INTO sales (
        business_id, invoice_number, customer_id, user_id, subtotal, discount, tax, total_amount,
        paid_amount, balance_amount, payment_status, payment_method, notes
      ) VALUES (?, 'INV-2026-00001', ?, ?, ?, 0, 0, ?, ?, 0, 'paid', 'pos', 'Counter checkout')
    `).run(biz.id, walkIn.id, user.id, sale1Total, sale1Total, sale1Total);

    InventoryService.recordMovement({
      businessId: biz.id,
      productId: semo.id,
      transactionType: 'sale',
      quantity: -2,
      unitCost: semo.cost_price,
      referenceType: 'sale',
      referenceId: s1Res.lastInsertRowid,
      userId: user.id
    });
    InventoryService.recordMovement({
      businessId: biz.id,
      productId: milk.id,
      transactionType: 'sale',
      quantity: -1,
      unitCost: milk.cost_price,
      referenceType: 'sale',
      referenceId: s1Res.lastInsertRowid,
      userId: user.id
    });

    AccountingService.recordJournalEntry({
      businessId: biz.id,
      referenceType: 'sale',
      referenceId: s1Res.lastInsertRowid,
      description: 'Sale INV-2026-00001 (POS)',
      userId: user.id,
      lines: [
        { accountCode: '1030', debit: sale1Total, credit: 0 },
        { accountCode: '4010', debit: 0, credit: sale1Total },
        { accountCode: '5010', debit: sale1Cost, credit: 0 },
        { accountCode: '1200', debit: 0, credit: sale1Cost }
      ]
    });

    // Record some realistic expenses
    const expenses = [
      { cat: 'Transportation & Delivery', amt: 15000, desc: 'Truck haulage from factory' },
      { cat: 'Electricity & Utilities', amt: 25000, desc: 'EKEDC Commercial Prepaid Token' },
      { cat: 'Fuel & Generator', amt: 18000, desc: 'Diesel for backup generator' },
      { cat: 'Packaging & Supplies', amt: 6500, desc: 'Branded nylon bags and carton tape' }
    ];

    for (const exp of expenses) {
      const expRes = db.prepare(`
        INSERT INTO expenses (business_id, user_id, category, amount, payment_method, description)
        VALUES (?, ?, ?, ?, 'cash', ?)
      `).run(biz.id, user.id, exp.cat, exp.amt, exp.desc);

      const code = AccountingService.getExpenseAccountCode(exp.cat);
      AccountingService.recordJournalEntry({
        businessId: biz.id,
        referenceType: 'expense',
        referenceId: expRes.lastInsertRowid,
        description: `Expense: ${exp.cat}`,
        userId: user.id,
        lines: [
          { accountCode: code, debit: exp.amt, credit: 0 },
          { accountCode: '1010', debit: 0, credit: exp.amt }
        ]
      });
    }

    console.log('[Seed] Demo data successfully seeded!');
    console.log(`Demo login credentials:`);
    console.log(`Email: demo@bizflow.ng`);
    console.log(`Password: bizflow123`);
  } else {
    console.log('[Seed] Demo data already exists.');
  }
}

if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData };
