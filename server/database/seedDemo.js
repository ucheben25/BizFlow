/**
 * BizBook Comprehensive Demo Evaluation Seeder
 * Creates an authentic, end-to-end evaluation environment for:
 * Admin: demo@bizbook.app / BizBookDemo@2026
 * Business: BizBook Demo Business
 * Complete with 18 products, 5 categories, 10 customers, 5 suppliers,
 * 5 purchases, 12 sales, 8 operational expenses, 8 staff, 16 payroll records,
 * an active evaluation subscription, and 100% double-entry accounting integrity.
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { runMigrations } = require('./migrations');
const { seedBusinessDefaults } = require('./seedAccounts');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');

function seedDemoData() {
  console.log('[Seed] Initializing BizBook Demo Evaluation Environment...');
  runMigrations();

  // 1. Create or Update Demo Admin Account (Requirement 1)
  const demoEmail = 'demo@bizbook.app';
  const demoPasswordPlain = 'BizBookDemo@2026';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(demoPasswordPlain, salt);

  let user = db.prepare('SELECT id, email, full_name FROM users WHERE email = ?').get(demoEmail);
  if (!user) {
    const res = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone, role, is_active)
      VALUES (?, ?, 'Alhaji Babajide Adeleke', '+234 803 123 4567', 'admin', 1)
    `).run(demoEmail, passwordHash);
    user = { id: res.lastInsertRowid, email: demoEmail, full_name: 'Alhaji Babajide Adeleke' };
    console.log(`[Seed] Created Demo Admin User: ${demoEmail} (ID: ${user.id})`);
  } else {
    // Ensure password hash is always synchronized to BizBookDemo@2026
    db.prepare(`
      UPDATE users
      SET password_hash = ?, full_name = 'Alhaji Babajide Adeleke', phone = '+234 803 123 4567', is_active = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, user.id);
    console.log(`[Seed] Synchronized Demo Admin User: ${demoEmail} (ID: ${user.id})`);
  }

  // Also update legacy demo account if present to point to new password
  const legacyEmail = 'demo@bizflow.ng';
  const legacyUser = db.prepare('SELECT id FROM users WHERE email = ?').get(legacyEmail);
  if (legacyUser) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, legacyUser.id);
  }

  // 2. Create or Retrieve Demo Business (Requirement 1)
  const businessName = 'BizBook Demo Business';
  let biz = db.prepare('SELECT id, name FROM businesses WHERE name = ?').get(businessName);
  let isNewBusiness = false;

  if (!biz) {
    const res = db.prepare(`
      INSERT INTO businesses (
        name, business_type, email, phone, address, city, state, country,
        currency, currency_symbol, tax_identification_number, allow_negative_stock, reorder_warning_enabled
      ) VALUES (
        ?, 'Supermarket & FMCG Wholesale Distribution', 'admin@bizbook.app', '+234 803 123 4567',
        '14 Broad Street, Marina, Lagos Island', 'Lagos', 'Lagos State', 'Nigeria',
        'NGN', '₦', 'TIN-2026-98124578', 0, 1
      )
    `).run(businessName);
    biz = { id: res.lastInsertRowid, name: businessName };
    isNewBusiness = true;
    console.log(`[Seed] Created Demo Business: "${biz.name}" (ID: ${biz.id})`);
  } else {
    console.log(`[Seed] Found Existing Demo Business: "${biz.name}" (ID: ${biz.id})`);
  }

  // 3. Link Admin to Business as Owner (Requirement 1 & 2)
  db.prepare(`
    INSERT OR REPLACE INTO business_members (business_id, user_id, role, permissions)
    VALUES (?, ?, 'owner', '["all"]')
  `).run(biz.id, user.id);

  // 4. Configure Active Evaluation Subscription (Requirement 3)
  const businessPlan = db.prepare(`
    SELECT id, price, currency, max_users FROM plans
    WHERE slug = 'business' OR name LIKE '%Business%'
    ORDER BY id DESC LIMIT 1
  `).get() || { id: 2, price: 10000, currency: 'NGN', max_users: 10 };

  const existingSub = db.prepare('SELECT id FROM subscriptions WHERE business_id = ?').get(biz.id);
  if (existingSub) {
    db.prepare(`
      UPDATE subscriptions
      SET plan_id = ?, status = 'active', amount = ?, currency = ?, max_users = ?,
          billing_interval = 'monthly', provider = 'evaluation_demo',
          provider_reference = 'DEMO-EVAL-2026-BIZBOOK',
          current_period_end = datetime('now', '+365 days'),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(businessPlan.id, businessPlan.price, businessPlan.currency, 10, existingSub.id);
  } else {
    db.prepare(`
      INSERT INTO subscriptions (
        business_id, plan_id, status, amount, currency, max_users, billing_interval,
        provider, provider_reference, started_at, current_period_start, current_period_end
      ) VALUES (
        ?, ?, 'active', ?, ?, 10, 'monthly',
        'evaluation_demo', 'DEMO-EVAL-2026-BIZBOOK',
        datetime('now', '-30 days'), datetime('now', '-15 days'), datetime('now', '+365 days')
      )
    `).run(biz.id, businessPlan.id, businessPlan.price, businessPlan.currency);
  }
  console.log(`[Seed] Demo Evaluation Subscription Active (Plan: BizBook Business, 10 seats, Valid for 365 days).`);

  // 5. Seed Chart of Accounts & Defaults
  seedBusinessDefaults(biz.id);

  // Check if products and transactions are already seeded for this business
  const existingProductCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE business_id = ?').get(biz.id).count;
  if (existingProductCount > 0) {
    console.log(`[Seed] Demo Business already contains ${existingProductCount} products and operational data.`);
    console.log(`====================================================`);
    console.log(` BIZBOOK DEMO EVALUATION CREDENTIALS`);
    console.log(` Email:    demo@bizbook.app`);
    console.log(` Password: BizBookDemo@2026`);
    console.log(` Business: BizBook Demo Business`);
    console.log(` Role:     Business Owner / Super Admin`);
    console.log(`====================================================`);
    return;
  }

  // 6. Seed Realistic Categories (Requirement 4)
  const categoriesList = [
    { name: 'Provisions & Packaged Foods', desc: 'Flour, sugar, pasta, packaged grains, and baking essentials' },
    { name: 'Beverages & Soft Drinks', desc: 'Malted drinks, milk, juices, tea, coffee, and bottled water' },
    { name: 'Household & Cleaning Supplies', desc: 'Detergents, soaps, disinfectants, and surface cleaners' },
    { name: 'Electronics & Office Equipment', desc: 'POS receipt rolls, emergency lamps, and connectivity hardware' },
    { name: 'Personal Care & Toiletries', desc: 'Body care, soaps, antiseptic liquids, and oral hygiene' }
  ];

  const catMap = {};
  for (const cat of categoriesList) {
    const cRes = db.prepare(`
      INSERT OR IGNORE INTO categories (business_id, name, description)
      VALUES (?, ?, ?)
    `).run(biz.id, cat.name, cat.desc);
    const cId = cRes.lastInsertRowid || db.prepare('SELECT id FROM categories WHERE business_id = ? AND name = ?').get(biz.id, cat.name).id;
    catMap[cat.name] = cId;
  }

  // 7. Seed 18 Realistic Nigerian Products with Opening Stocks (Requirement 4)
  const productsData = [
    { name: 'Golden Penny Semovita 10kg', sku: 'PROV-SEMO-10KG', cat: 'Provisions & Packaged Foods', cost: 7500, price: 9000, stock: 80, reorder: 15, unit: 'bag' },
    { name: 'Dangote Granulated Sugar 50kg', sku: 'PROV-SUG-50KG', cat: 'Provisions & Packaged Foods', cost: 68000, price: 75000, stock: 25, reorder: 5, unit: 'bag' },
    { name: 'Peak Full Cream Milk 850g (Pack of 6)', sku: 'BEV-PEAK-850G', cat: 'Beverages & Soft Drinks', cost: 19500, price: 23000, stock: 40, reorder: 10, unit: 'carton' },
    { name: 'Milo Malt Drink Refill 1kg (Carton of 12)', sku: 'BEV-MILO-1KG', cat: 'Beverages & Soft Drinks', cost: 34000, price: 39500, stock: 22, reorder: 8, unit: 'carton' },
    { name: 'Sunlight Detergent Powder 900g (Pack of 12)', sku: 'HOU-SUN-900G', cat: 'Household & Cleaning Supplies', cost: 14500, price: 17200, stock: 35, reorder: 10, unit: 'carton' },
    { name: 'Mamador Pure Vegetable Oil 3.8L', sku: 'PROV-OIL-38L', cat: 'Provisions & Packaged Foods', cost: 9800, price: 11500, stock: 50, reorder: 12, unit: 'keg' },
    { name: 'Indomie Instant Noodles Onion 70g (Carton of 40)', sku: 'PROV-INDO-70G', cat: 'Provisions & Packaged Foods', cost: 8200, price: 9500, stock: 110, reorder: 25, unit: 'carton' },
    { name: 'Coca-Cola 50cl PET (Pack of 12)', sku: 'BEV-COKE-50CL', cat: 'Beverages & Soft Drinks', cost: 3800, price: 4600, stock: 65, reorder: 15, unit: 'pack' },
    { name: 'Eva Premium Table Water 75cl (Pack of 12)', sku: 'BEV-EVA-75CL', cat: 'Beverages & Soft Drinks', cost: 2200, price: 2800, stock: 90, reorder: 20, unit: 'pack' },
    { name: 'Gino Concentrated Tomato Paste 70g (Carton of 50)', sku: 'PROV-GINO-70G', cat: 'Provisions & Packaged Foods', cost: 16500, price: 19000, stock: 30, reorder: 8, unit: 'carton' },
    { name: 'Dettol Antiseptic Liquid 500ml (Pack of 6)', sku: 'HOU-DET-500ML', cat: 'Household & Cleaning Supplies', cost: 18000, price: 21500, stock: 18, reorder: 6, unit: 'pack' },
    { name: 'Rechargeable LED Emergency Lamp 30W', sku: 'ELEC-LED-30W', cat: 'Electronics & Office Equipment', cost: 6000, price: 8500, stock: 24, reorder: 5, unit: 'pcs' },
    { name: 'Thermal Receipt Paper Rolls 80x80 (Box of 50)', sku: 'ELEC-POS-8080', cat: 'Electronics & Office Equipment', cost: 24000, price: 28500, stock: 6, reorder: 10, unit: 'box' }, // Low stock item
    { name: 'Chivita 100% Real Apple Juice 1L (Pack of 10)', sku: 'BEV-CHIV-1L', cat: 'Beverages & Soft Drinks', cost: 15000, price: 17800, stock: 28, reorder: 8, unit: 'carton' },
    { name: 'Ariel Automatic Washing Powder 2kg (Pack of 6)', sku: 'HOU-ARI-2KG', cat: 'Household & Cleaning Supplies', cost: 21000, price: 25000, stock: 15, reorder: 5, unit: 'carton' },
    { name: 'Golden Penny Soya Vegetable Oil 5L', sku: 'PROV-GPOIL-5L', cat: 'Provisions & Packaged Foods', cost: 13500, price: 15800, stock: 32, reorder: 10, unit: 'keg' },
    { name: 'Starlink Gen 3 Standard WiFi Kit', sku: 'ELEC-STAR-STD', cat: 'Electronics & Office Equipment', cost: 390000, price: 450000, stock: 4, reorder: 2, unit: 'set' },
    { name: 'Honeywell Wheat Meal 5kg (Pack of 4)', sku: 'PROV-HON-5KG', cat: 'Provisions & Packaged Foods', cost: 17200, price: 20000, stock: 45, reorder: 12, unit: 'carton' }
  ];

  const prodMap = {};
  for (const p of productsData) {
    const catId = catMap[p.cat] || null;
    const pRes = db.prepare(`
      INSERT INTO products (
        business_id, category_id, name, sku, unit, cost_price, selling_price,
        current_stock, opening_stock, reorder_level, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)
    `).run(biz.id, catId, p.name, p.sku, p.unit, p.cost, p.price, p.stock, p.reorder);

    const pId = pRes.lastInsertRowid;
    prodMap[p.sku] = { id: pId, ...p };

    // Record initial inventory inward movement
    InventoryService.recordMovement({
      businessId: biz.id,
      productId: pId,
      transactionType: 'opening_stock',
      quantity: p.stock,
      unitCost: p.cost,
      referenceType: 'product_init',
      referenceId: pId,
      notes: `Opening inventory for ${p.name}`,
      userId: user.id
    });

    // Double-entry: Debit 1200 Inventory Asset, Credit 3010 Owner's Equity
    const totalVal = p.stock * p.cost;
    AccountingService.recordJournalEntry({
      businessId: biz.id,
      referenceType: 'opening_stock',
      referenceId: pId,
      description: `Opening stock asset: ${p.name} (${p.stock} ${p.unit})`,
      userId: user.id,
      lines: [
        { accountCode: '1200', debit: totalVal, credit: 0 },
        { accountCode: '3010', debit: 0, credit: totalVal }
      ]
    });
  }
  console.log(`[Seed] Seeded ${productsData.length} products with opening stock & ledger valuations.`);

  // 8. Seed 10 Fictional Customers (Requirement 4)
  const customersData = [
    { name: 'Walk-in Counter Customer', phone: '08000000000', email: null, address: 'In-store retail counter', bal: 0, is_default: 1 },
    { name: 'Mama Kazeem Stores', phone: '+234 805 111 2233', email: 'mamakazeem@gmail.com', address: 'Shop 4B, Oyingbo Modern Market, Lagos', bal: 45000, is_default: 0 },
    { name: 'Divine Grace Eatery & Catering', phone: '+234 803 444 5566', email: 'divinegrace.eat@yahoo.com', address: '22 Bode Thomas Street, Surulere, Lagos', bal: 0, is_default: 0 },
    { name: 'Alhaji Danjuma Wholesale Ventures', phone: '+234 802 333 4455', email: 'danjuma.wholesale@outlook.com', address: 'Warehouse 12, Mile 12 International Market, Lagos', bal: 75000, is_default: 0 },
    { name: 'Chioma Supermarket & Bakery', phone: '+234 806 777 8899', email: 'chioma.supermarket@gmail.com', address: '84 Allen Avenue, Ikeja, Lagos', bal: 0, is_default: 0 },
    { name: 'Uncle Ben Fast Food & Grills', phone: '+234 809 222 3344', email: 'uncleben.grills@gmail.com', address: '15 Commercial Avenue, Yaba, Lagos', bal: 15000, is_default: 0 },
    { name: 'Victoria Island Hospitality Ltd', phone: '+234 803 999 0011', email: 'procurement@vihospitality.ng', address: 'Plot 104 Ahmadu Bello Way, Victoria Island, Lagos', bal: 0, is_default: 0 },
    { name: 'Emeka & Sons General Merchandise', phone: '+234 807 888 9900', email: 'emeka.sons@gmail.com', address: 'Block C, Trade Fair Complex, Badagry Expressway, Lagos', bal: 30000, is_default: 0 },
    { name: 'Mrs. Adeyemi Provision Store', phone: '+234 805 666 7788', email: 'adeyemi.provisions@gmail.com', address: 'Shop 18, Admiralty Way, Lekki Phase 1, Lagos', bal: 0, is_default: 0 },
    { name: 'Goodness & Mercy Canteen', phone: '+234 808 111 2244', email: 'goodnessmercy.canteen@yahoo.com', address: '5 Oshodi-Apapa Expressway, Oshodi, Lagos', bal: 10000, is_default: 0 }
  ];

  const custMap = {};
  for (const c of customersData) {
    let existingCust = db.prepare('SELECT id FROM customers WHERE business_id = ? AND name = ?').get(biz.id, c.name);
    let cId;
    if (!existingCust) {
      const cRes = db.prepare(`
        INSERT INTO customers (business_id, name, phone, email, address, outstanding_balance, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(biz.id, c.name, c.phone, c.email, c.address, c.bal, c.is_default);
      cId = cRes.lastInsertRowid;
    } else {
      cId = existingCust.id;
    }
    custMap[c.name] = cId;

    // Record initial Accounts Receivable entry for opening balance debtors
    if (c.bal > 0) {
      AccountingService.recordJournalEntry({
        businessId: biz.id,
        referenceType: 'customer_debt_init',
        referenceId: cId,
        description: `Opening debtor balance: ${c.name}`,
        userId: user.id,
        lines: [
          { accountCode: '1100', debit: c.bal, credit: 0 },
          { accountCode: '3010', debit: 0, credit: c.bal }
        ]
      });
    }
  }
  console.log(`[Seed] Seeded ${customersData.length} customer records with debtor balances.`);

  // 9. Seed 5 Fictional Suppliers (Requirement 4)
  const suppliersData = [
    { name: 'Flour Mills of Nigeria Plc', contact: 'Engr. Kenneth Obi', phone: '+234 802 345 6789', email: 'orders@fmnplc.ng', address: 'Wharf Road, Apapa Industrial Port, Lagos' },
    { name: 'Nestle Nigeria Distribution Ltd', contact: 'Mrs. Funke Ajayi', phone: '+234 809 876 5432', email: 'sales@nestle.ng', address: '22 Industrial Avenue, Ilupeju, Lagos' },
    { name: 'Dangote Consumer Goods Distribution', contact: 'Alhaji Ibrahim Garba', phone: '+234 803 555 6677', email: 'distributors@dangote.com', address: 'Union Marble House, 1 Alfred Rewane Road, Ikoyi, Lagos' },
    { name: 'Unilever Nigeria Operations', contact: 'Ms. Grace Okafor', phone: '+234 807 444 3322', email: 'commercial@unilever.ng', address: '1 Billings Way, Oregun Industrial Estate, Ikeja, Lagos' },
    { name: 'Seven-Up Bottling Company Plc', contact: 'Mr. Tunde Bakare', phone: '+234 802 999 8877', email: 'distribution@7up.ng', address: '247 Moshood Abiola Way, Ijora, Lagos' }
  ];

  const supMap = {};
  for (const s of suppliersData) {
    let existingSup = db.prepare('SELECT id FROM suppliers WHERE business_id = ? AND name = ?').get(biz.id, s.name);
    let sId;
    if (!existingSup) {
      const sRes = db.prepare(`
        INSERT INTO suppliers (business_id, name, contact_person, phone, email, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(biz.id, s.name, s.contact, s.phone, s.email, s.address);
      sId = sRes.lastInsertRowid;
    } else {
      sId = existingSup.id;
    }
    supMap[s.name] = sId;
  }
  console.log(`[Seed] Seeded ${suppliersData.length} verified suppliers.`);

  // 10. Seed Purchases from Suppliers (Requirement 4)
  const purchasesData = [
    {
      num: 'PO-2026-00001',
      supplier: 'Flour Mills of Nigeria Plc',
      items: [{ sku: 'PROV-SEMO-10KG', qty: 20, cost: 7500 }],
      method: 'bank_transfer',
      paid: 150000,
      total: 150000,
      status: 'paid'
    },
    {
      num: 'PO-2026-00002',
      supplier: 'Nestle Nigeria Distribution Ltd',
      items: [{ sku: 'BEV-PEAK-850G', qty: 15, cost: 19500 }],
      method: 'bank_transfer',
      paid: 292500,
      total: 292500,
      status: 'paid'
    },
    {
      num: 'PO-2026-00003',
      supplier: 'Dangote Consumer Goods Distribution',
      items: [{ sku: 'PROV-SUG-50KG', qty: 10, cost: 68000 }],
      method: 'credit',
      paid: 0,
      total: 680000,
      status: 'unpaid' // Accounts Payable
    },
    {
      num: 'PO-2026-00004',
      supplier: 'Unilever Nigeria Operations',
      items: [{ sku: 'HOU-SUN-900G', qty: 10, cost: 14500 }],
      method: 'bank_transfer',
      paid: 145000,
      total: 145000,
      status: 'paid'
    },
    {
      num: 'PO-2026-00005',
      supplier: 'Seven-Up Bottling Company Plc',
      items: [{ sku: 'BEV-COKE-50CL', qty: 30, cost: 3800 }],
      method: 'cash',
      paid: 114000,
      total: 114000,
      status: 'paid'
    }
  ];

  for (const po of purchasesData) {
    const supId = supMap[po.supplier];
    const balance = po.total - po.paid;
    const poRes = db.prepare(`
      INSERT INTO purchases (
        business_id, purchase_number, supplier_id, user_id, total_amount, paid_amount,
        balance_amount, payment_status, payment_method, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'Wholesale replenishment')
    `).run(biz.id, po.num, supId, user.id, po.total, po.paid, balance, po.status, po.method);

    if (balance > 0) {
      db.prepare('UPDATE suppliers SET outstanding_balance = outstanding_balance + ? WHERE id = ?').run(balance, supId);
    }

    const poId = poRes.lastInsertRowid;

    for (const item of po.items) {
      const prod = prodMap[item.sku];
      db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total_cost)
        VALUES (?, ?, ?, ?, ?)
      `).run(poId, prod.id, item.qty, item.cost, item.qty * item.cost);

      // Inward movement
      InventoryService.recordMovement({
        businessId: biz.id,
        productId: prod.id,
        transactionType: 'purchase',
        quantity: item.qty,
        unitCost: item.cost,
        referenceType: 'purchase',
        referenceId: poId,
        notes: `Replenishment from ${po.supplier}`,
        userId: user.id
      });
    }

    // Double-entry: Debit 1200 Inventory Asset, Credit Payment Account or 2010 A/P
    const creditAccount = po.status === 'unpaid' ? '2010' : (po.method === 'cash' ? '1010' : '1020');
    AccountingService.recordJournalEntry({
      businessId: biz.id,
      referenceType: 'purchase',
      referenceId: poId,
      description: `Purchase order ${po.num} from ${po.supplier}`,
      userId: user.id,
      lines: [
        { accountCode: '1200', debit: po.total, credit: 0 },
        { accountCode: creditAccount, debit: 0, credit: po.total }
      ]
    });
  }
  console.log(`[Seed] Seeded ${purchasesData.length} purchase orders & accounts payable records.`);

  // 11. Seed 12 Realistic Sales Transactions (Requirement 4 & 5)
  const salesData = [
    {
      inv: 'INV-2026-00001',
      cust: 'Walk-in Counter Customer',
      method: 'cash',
      items: [
        { sku: 'PROV-SEMO-10KG', qty: 2 },
        { sku: 'BEV-PEAK-850G', qty: 1 }
      ]
    },
    {
      inv: 'INV-2026-00002',
      cust: 'Divine Grace Eatery & Catering',
      method: 'bank_transfer',
      items: [
        { sku: 'PROV-SUG-50KG', qty: 1 },
        { sku: 'PROV-OIL-38L', qty: 2 }
      ]
    },
    {
      inv: 'INV-2026-00003',
      cust: 'Walk-in Counter Customer',
      method: 'pos',
      items: [
        { sku: 'PROV-INDO-70G', qty: 3 },
        { sku: 'BEV-COKE-50CL', qty: 2 }
      ]
    },
    {
      inv: 'INV-2026-00004',
      cust: 'Mama Kazeem Stores',
      method: 'pos',
      items: [
        { sku: 'PROV-SEMO-10KG', qty: 5 },
        { sku: 'BEV-PEAK-850G', qty: 3 }
      ],
      partialPaid: 50000 // Credit sale with partial payment
    },
    {
      inv: 'INV-2026-00005',
      cust: 'Chioma Supermarket & Bakery',
      method: 'pos',
      items: [
        { sku: 'BEV-MILO-1KG', qty: 2 },
        { sku: 'BEV-CHIV-1L', qty: 2 }
      ]
    },
    {
      inv: 'INV-2026-00006',
      cust: 'Uncle Ben Fast Food & Grills',
      method: 'cash',
      items: [
        { sku: 'PROV-OIL-38L', qty: 2 },
        { sku: 'BEV-EVA-75CL', qty: 5 }
      ]
    },
    {
      inv: 'INV-2026-00007',
      cust: 'Walk-in Counter Customer',
      method: 'pos',
      items: [
        { sku: 'ELEC-LED-30W', qty: 1 },
        { sku: 'ELEC-POS-8080', qty: 1 }
      ]
    },
    {
      inv: 'INV-2026-00008',
      cust: 'Victoria Island Hospitality Ltd',
      method: 'bank_transfer',
      items: [
        { sku: 'ELEC-STAR-STD', qty: 1 },
        { sku: 'PROV-SEMO-10KG', qty: 2 }
      ]
    },
    {
      inv: 'INV-2026-00009',
      cust: 'Alhaji Danjuma Wholesale Ventures',
      method: 'bank_transfer',
      items: [
        { sku: 'PROV-SUG-50KG', qty: 2 },
        { sku: 'PROV-INDO-70G', qty: 4 }
      ],
      partialPaid: 100000 // Partial credit sale
    },
    {
      inv: 'INV-2026-00010',
      cust: 'Walk-in Counter Customer',
      method: 'cash',
      items: [
        { sku: 'HOU-SUN-900G', qty: 2 },
        { sku: 'HOU-DET-500ML', qty: 1 }
      ]
    },
    {
      inv: 'INV-2026-00011',
      cust: 'Mrs. Adeyemi Provision Store',
      method: 'bank_transfer',
      items: [
        { sku: 'PROV-HON-5KG', qty: 3 },
        { sku: 'BEV-CHIV-1L', qty: 2 }
      ]
    },
    {
      inv: 'INV-2026-00012',
      cust: 'Goodness & Mercy Canteen',
      method: 'cash',
      items: [
        { sku: 'PROV-GINO-70G', qty: 2 },
        { sku: 'BEV-COKE-50CL', qty: 3 }
      ]
    }
  ];

  for (const s of salesData) {
    const custId = custMap[s.cust] || custMap['Walk-in Counter Customer'];

    let saleTotal = 0;
    let saleCost = 0;
    const computedItems = [];

    for (const item of s.items) {
      const prod = prodMap[item.sku];
      const itemPriceTotal = prod.price * item.qty;
      const itemCostTotal = prod.cost * item.qty;
      saleTotal += itemPriceTotal;
      saleCost += itemCostTotal;
      computedItems.push({ prod, qty: item.qty, price: prod.price, cost: prod.cost, itemPriceTotal, itemCostTotal });
    }

    const paidAmount = s.partialPaid !== undefined ? s.partialPaid : saleTotal;
    const balanceAmount = saleTotal - paidAmount;
    const paymentStatus = balanceAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

    const sRes = db.prepare(`
      INSERT INTO sales (
        business_id, invoice_number, customer_id, user_id, subtotal, discount, tax,
        total_amount, paid_amount, balance_amount, payment_status, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, 'Commercial transaction')
    `).run(biz.id, s.inv, custId, user.id, saleTotal, saleTotal, paidAmount, balanceAmount, paymentStatus, s.method);

    const saleId = sRes.lastInsertRowid;

    for (const ci of computedItems) {
      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_cost, total_price, total_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(saleId, ci.prod.id, ci.qty, ci.price, ci.cost, ci.itemPriceTotal, ci.itemCostTotal);

      // Outward inventory movement
      InventoryService.recordMovement({
        businessId: biz.id,
        productId: ci.prod.id,
        transactionType: 'sale',
        quantity: -ci.qty,
        unitCost: ci.cost,
        referenceType: 'sale',
        referenceId: saleId,
        notes: `Sale ${s.inv}`,
        userId: user.id
      });
    }

    // Double-entry accounting entry:
    // Revenue entry: Debit Cash/Bank/POS for paid, Debit 1100 AR for balance, Credit 4010 Sales Revenue
    // COGS entry: Debit 5010 COGS, Credit 1200 Inventory Asset
    const paymentAccount = AccountingService.getPaymentAccountCode(s.method);
    const journalLines = [];

    if (paidAmount > 0) {
      journalLines.push({ accountCode: paymentAccount, debit: paidAmount, credit: 0 });
    }
    if (balanceAmount > 0) {
      journalLines.push({ accountCode: '1100', debit: balanceAmount, credit: 0 }); // Accounts Receivable
    }
    journalLines.push({ accountCode: '4010', debit: 0, credit: saleTotal }); // Sales Revenue

    // COGS
    journalLines.push({ accountCode: '5010', debit: saleCost, credit: 0 }); // COGS
    journalLines.push({ accountCode: '1200', debit: 0, credit: saleCost }); // Inventory reduction

    AccountingService.recordJournalEntry({
      businessId: biz.id,
      referenceType: 'sale',
      referenceId: saleId,
      description: `Sale ${s.inv} (${s.cust})`,
      userId: user.id,
      lines: journalLines
    });
  }
  console.log(`[Seed] Seeded ${salesData.length} sales orders with revenue, COGS, and receivables.`);

  // 12. Seed 8 Realistic Operating Expenses (Requirement 4)
  const expensesData = [
    { cat: 'Rent', amt: 350000, method: 'bank_transfer', desc: 'Shop & Warehouse lease quarterly installment' },
    { cat: 'Electricity & Utilities', amt: 65000, method: 'bank_transfer', desc: 'EKEDC Commercial 3-Phase Prepaid Token' },
    { cat: 'Transportation & Delivery', amt: 45000, method: 'bank_transfer', desc: 'Inter-state logistics truck delivery from factory' },
    { cat: 'Fuel & Generator', amt: 75000, method: 'bank_transfer', desc: '200L Diesel for backup generator' },
    { cat: 'Internet & Phone', amt: 35000, method: 'bank_transfer', desc: 'Fibre broadband monthly corporate subscription' },
    { cat: 'Packaging & Supplies', amt: 18500, method: 'cash', desc: 'Thermal rolls, branded packaging nylon, and tape' },
    { cat: 'Repairs & Maintenance', amt: 28000, method: 'cash', desc: 'Routine generator servicing, oil filter replacement' },
    { cat: 'Advertising & Marketing', amt: 40000, method: 'bank_transfer', desc: 'Targeted local digital promo & store banner printing' }
  ];

  for (const exp of expensesData) {
    const expRes = db.prepare(`
      INSERT INTO expenses (business_id, user_id, category, amount, payment_method, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(biz.id, user.id, exp.cat, exp.amt, exp.method, exp.desc);

    const expAccount = AccountingService.getExpenseAccountCode(exp.cat);
    const payAccount = AccountingService.getPaymentAccountCode(exp.method);

    AccountingService.recordJournalEntry({
      businessId: biz.id,
      referenceType: 'expense',
      referenceId: expRes.lastInsertRowid,
      description: `Operating expense: ${exp.desc}`,
      userId: user.id,
      lines: [
        { accountCode: expAccount, debit: exp.amt, credit: 0 },
        { accountCode: payAccount, debit: 0, credit: exp.amt }
      ]
    });
  }
  console.log(`[Seed] Seeded ${expensesData.length} operating expenses.`);

  // 13. Seed 8 Fictional Staff Members (Requirement 4)
  const staffData = [
    { name: 'Chidi Nwosu', empId: 'EMP-0001', pos: 'Operations Manager', dept: 'Management', salary: 350000, phone: '+234 802 111 0001', email: 'chidi.nwosu@bizbook.app' },
    { name: 'Amina Bello', empId: 'EMP-0002', pos: 'Head Cashier', dept: 'Sales & POS', salary: 180000, phone: '+234 803 222 0002', email: 'amina.bello@bizbook.app' },
    { name: 'Oluwaseun Adeleke', empId: 'EMP-0003', pos: 'Inventory & Warehouse Lead', dept: 'Logistics', salary: 220000, phone: '+234 805 333 0003', email: 'seun.adeleke@bizbook.app' },
    { name: 'Blessing Okon', empId: 'EMP-0004', pos: 'Counter Sales Clerk', dept: 'Sales & POS', salary: 130000, phone: '+234 806 444 0004', email: 'blessing.okon@bizbook.app' },
    { name: 'Ibrahim Musa', empId: 'EMP-0005', pos: 'Security & Loss Prevention', dept: 'Security', salary: 110000, phone: '+234 807 555 0005', email: 'ibrahim.musa@bizbook.app' },
    { name: 'Ngozi Eze', empId: 'EMP-0006', pos: 'Senior Accountant', dept: 'Finance & Accounts', salary: 280000, phone: '+234 809 666 0006', email: 'ngozi.eze@bizbook.app' },
    { name: 'Tunde Adeyemi', empId: 'EMP-0007', pos: 'Delivery & Logistics Driver', dept: 'Logistics', salary: 140000, phone: '+234 808 777 0007', email: 'tunde.adeyemi@bizbook.app' },
    { name: 'Fatimah Yusuf', empId: 'EMP-0008', pos: 'Customer Relations Lead', dept: 'Customer Support', salary: 125000, phone: '+234 802 888 0008', email: 'fatimah.yusuf@bizbook.app' }
  ];

  const staffMap = {};
  for (const s of staffData) {
    let existingStaff = db.prepare('SELECT id FROM staff WHERE business_id = ? AND employee_id = ?').get(biz.id, s.empId);
    let stId;
    if (!existingStaff) {
      const sRes = db.prepare(`
        INSERT INTO staff (
          business_id, employee_id, full_name, email, phone, position,
          department, employment_date, employment_status, basic_salary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '2025-06-01', 'active', ?)
      `).run(biz.id, s.empId, s.name, s.email, s.phone, s.pos, s.dept, s.salary);
      stId = sRes.lastInsertRowid;
    } else {
      stId = existingStaff.id;
    }
    staffMap[s.empId] = { id: stId, ...s };
  }
  console.log(`[Seed] Seeded ${staffData.length} full-time staff directory records.`);

  // 14. Seed Payroll Records for 2 Months (Requirement 4 & 5)
  // Pay Period 1: Previous Month (2026-08) - ALL PAID
  // Pay Period 2: Current Month (2026-09) - 4 PAID, 4 PENDING (for evaluator testing)
  const payPeriods = [
    { period: '2026-08', paidCount: 8 },
    { period: '2026-09', paidCount: 4 }
  ];

  for (const pp of payPeriods) {
    let count = 0;
    for (const s of staffData) {
      count++;
      const isPaid = count <= pp.paidCount;
      const allowance = Math.round(s.salary * 0.1); // 10% allowance
      const deduction = Math.round(s.salary * 0.05); // 5% deduction
      const netSalary = s.salary + allowance - deduction;

      const salRes = db.prepare(`
        INSERT INTO salary_records (
          business_id, staff_id, pay_period, basic_salary, allowances, deductions,
          net_salary, payment_status, payment_date, payment_method, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        biz.id,
        staffMap[s.empId].id,
        pp.period,
        s.salary,
        allowance,
        deduction,
        netSalary,
        isPaid ? 'paid' : 'pending',
        isPaid ? `${pp.period}-28 10:00:00` : null,
        isPaid ? 'bank_transfer' : null,
        isPaid ? `Automated payroll execution for ${pp.period}` : `Draft payroll for ${pp.period} pending approval`,
        user.id
      );

      const recordId = salRes.lastInsertRowid;

      if (isPaid) {
        // Record payment record & journal entry: Debit 6040 Salaries & Wages, Credit 1020 Bank Account
        db.prepare(`
          INSERT INTO payments (
            business_id, user_id, payment_type, entity_type, entity_id,
            reference_type, reference_id, amount, payment_method, payment_account_code, notes, payment_date
          ) VALUES (?, ?, 'outflow', 'staff', ?, 'salary_record', ?, ?, 'bank_transfer', '1020', ?, ?)
        `).run(biz.id, user.id, staffMap[s.empId].id, recordId, netSalary, `Salary payment for ${s.name} (${pp.period})`, `${pp.period}-28 10:00:00`);

        AccountingService.recordJournalEntry({
          businessId: biz.id,
          referenceType: 'payroll_payment',
          referenceId: recordId,
          description: `Salary Payment: ${s.name} (${s.empId}) - ${pp.period}`,
          userId: user.id,
          lines: [
            { accountCode: '6040', debit: netSalary, credit: 0 },
            { accountCode: '1020', debit: 0, credit: netSalary }
          ]
        });
      }
    }
  }
  console.log(`[Seed] Seeded 16 salary payroll records (12 paid with ledger entries, 4 pending).`);

  // 15. Verify Accounting Integrity (Requirement 6)
  const trialBalance = AccountingService.getTrialBalance(biz.id);
  console.log(`[Seed] Accounting Reconciliation Verification:`);
  console.log(`       Trial Balance Debits:  ₦${trialBalance.totalDebit.toLocaleString()}`);
  console.log(`       Trial Balance Credits: ₦${trialBalance.totalCredit.toLocaleString()}`);
  console.log(`       Balanced: ${trialBalance.isBalanced ? 'YES (100% Exact)' : 'NO'}`);

  const pnl = AccountingService.getProfitAndLoss(biz.id);
  console.log(`       Total Revenue:         ₦${pnl.totalRevenue.toLocaleString()}`);
  console.log(`       Cost of Goods Sold:    ₦${pnl.totalCOGS.toLocaleString()}`);
  console.log(`       Gross Profit:          ₦${pnl.grossProfit.toLocaleString()}`);
  console.log(`       Operating Expenses:    ₦${pnl.totalOperatingExpenses.toLocaleString()}`);
  console.log(`       Net Profit:            ₦${pnl.netProfit.toLocaleString()}`);

  console.log(`====================================================`);
  console.log(` BIZBOOK DEMO EVALUATION CREDENTIALS READY`);
  console.log(` Email:    ${demoEmail}`);
  console.log(` Password: ${demoPasswordPlain}`);
  console.log(` Business: ${biz.name}`);
  console.log(` Role:     Business Owner / Super Admin`);
  console.log(`====================================================`);
}

if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData };
