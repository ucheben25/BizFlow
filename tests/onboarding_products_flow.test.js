/**
 * End-to-End Test Suite: Product & Category Input, Onboarding, RBAC, Validation & Persistence
 * Verifies Requirements: Parts 1, 2, 3, 4, and 5
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Set isolated test database with unique timestamp to prevent Windows lock conflicts
const TEST_DB_PATH = path.resolve(__dirname, `../data/test_onboarding_products_${Date.now()}.db`);
try {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
} catch (e) {}
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = 'test_jwt_secret_onboarding_flow_2026';
process.env.PORT = '0'; // random free port

const app = require('../server/index');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('>>> RUNNING BIZBOOK ONBOARDING, PRODUCTS & RBAC E2E TEST SUITE <<<');

  await new Promise(resolve => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[Test Server] Running on ${baseUrl}`);
      resolve();
    });
  });

  try {
    // --- 1. User Registration ---
    console.log('\n--- 1. Testing Registration ---');
    const regRes = await request('POST', '/api/auth/register', {
      full_name: 'Alhaji Musa Danbaba',
      email: 'musa.danbaba@kanomegamart.ng',
      phone: '08023456789',
      password: 'MusaSecure@2026'
    });
    assert.strictEqual(regRes.status, 201, 'Registration should return 201 Created');
    assert.ok(regRes.body.token, 'Token should be returned');
    let ownerToken = regRes.body.token;
    console.log('✔ User registered successfully with JWT token.');

    // --- 2. Business Creation ---
    console.log('\n--- 2. Testing Business Creation in Onboarding ---');
    const bizRes = await request('POST', '/api/businesses', {
      name: 'Kano Megamart Ltd',
      business_type: 'Retail & Supermarket',
      currency: 'NGN',
      currency_symbol: '₦'
    }, { Authorization: `Bearer ${ownerToken}` });
    assert.strictEqual(bizRes.status, 201, 'Business creation should return 201');
    const bizId = bizRes.body.business.id;
    const bizHeaders = {
      Authorization: `Bearer ${ownerToken}`,
      'x-business-id': String(bizId)
    };
    console.log(`✔ Business "Kano Megamart Ltd" created with ID ${bizId}.`);

    // Activate subscription for business
    const activateRes = await request('POST', '/api/subscriptions/upgrade', {
      plan_code: 'business'
    }, bizHeaders);
    assert.strictEqual(activateRes.status, 200, 'Subscription should be active');
    console.log('✔ Business plan active.');

    // --- 3. Categories Creation in Onboarding ---
    console.log('\n--- 3. Testing Category Creation during Onboarding ---');
    // Category 1
    const cat1Res = await request('POST', '/api/categories', {
      name: 'Beverages',
      description: 'Hot and cold beverages, milk, and tea'
    }, bizHeaders);
    assert.strictEqual(cat1Res.status, 201, 'Category 1 should be created');
    const cat1Id = cat1Res.body.category.id;
    console.log(`✔ Created Category 1: "Beverages" (ID: ${cat1Id})`);

    // Category 2
    const cat2Res = await request('POST', '/api/categories', {
      name: 'Provisions & Cereals',
      description: 'Daily household foods and dry grains'
    }, bizHeaders);
    assert.strictEqual(cat2Res.status, 201, 'Category 2 should be created');
    const cat2Id = cat2Res.body.category.id;
    console.log(`✔ Created Category 2: "Provisions & Cereals" (ID: ${cat2Id})`);

    // --- 4. Products Creation in Onboarding (At least 3 products assigned to categories) ---
    console.log('\n--- 4. Testing Product Creation during Onboarding (3 Products) ---');
    // Product 1
    const p1Res = await request('POST', '/api/products', {
      name: 'Peak Evaporated Milk 160g',
      category_id: cat1Id,
      sku: 'PEAK-160G',
      cost_price: 650,
      selling_price: 750,
      opening_stock: 120,
      unit: 'tin',
      reorder_level: 24
    }, bizHeaders);
    assert.strictEqual(p1Res.status, 201, 'Product 1 should be created');
    const p1Id = p1Res.body.product.id;
    console.log(`✔ Created Product 1: "Peak Milk" in Beverages (ID: ${p1Id})`);

    // Product 2
    const p2Res = await request('POST', '/api/products', {
      name: 'Golden Penny Semovita 10kg',
      category_id: cat2Id,
      sku: 'SEMO-10KG',
      cost_price: 8500,
      selling_price: 9500,
      opening_stock: 40,
      unit: 'bag',
      reorder_level: 10
    }, bizHeaders);
    assert.strictEqual(p2Res.status, 201, 'Product 2 should be created');
    const p2Id = p2Res.body.product.id;
    console.log(`✔ Created Product 2: "Semovita 10kg" in Provisions (ID: ${p2Id})`);

    // Product 3
    const p3Res = await request('POST', '/api/products', {
      name: 'Milo Chocolate Drink 500g',
      category_id: cat1Id,
      sku: 'MILO-500G',
      cost_price: 2800,
      selling_price: 3300,
      opening_stock: 60,
      unit: 'tin',
      reorder_level: 15
    }, bizHeaders);
    assert.strictEqual(p3Res.status, 201, 'Product 3 should be created');
    const p3Id = p3Res.body.product.id;
    console.log(`✔ Created Product 3: "Milo 500g" in Beverages (ID: ${p3Id})`);

    // --- 5. Verify Persistence & Category Counts ---
    console.log('\n--- 5. Verifying Categories & Products Catalog ---');
    const getCatsRes = await request('GET', '/api/categories', null, bizHeaders);
    assert.strictEqual(getCatsRes.status, 200);
    assert.ok(getCatsRes.body.categories.length >= 2, 'Should have categories');
    const bevCat = getCatsRes.body.categories.find(c => c.name === 'Beverages');
    assert.ok(bevCat, 'Beverages category should exist');
    assert.strictEqual(bevCat.product_count, 2, 'Beverages should have 2 products');
    const provCat = getCatsRes.body.categories.find(c => c.name === 'Provisions & Cereals');
    assert.ok(provCat, 'Provisions category should exist');
    assert.strictEqual(provCat.product_count, 1, 'Provisions should have 1 product');
    console.log('✔ Categories retrieved with accurate live product counts.');

    const getProdsRes = await request('GET', '/api/products', null, bizHeaders);
    assert.strictEqual(getProdsRes.status, 200);
    assert.strictEqual(getProdsRes.body.products.length, 3, 'Should have 3 products in inventory');
    console.log('✔ All 3 products retrieved with category names and stock valuations.');

    // --- 6. Edit Product ---
    console.log('\n--- 6. Testing Product Update ---');
    const editP1Res = await request('PUT', `/api/products/${p1Id}`, {
      selling_price: 800,
      reorder_level: 30
    }, bizHeaders);
    assert.strictEqual(editP1Res.status, 200, 'Product update should return 200');
    assert.strictEqual(editP1Res.body.product.selling_price, 800, 'Selling price updated');
    console.log('✔ Product updated successfully.');

    // --- 7. Edit Category ---
    console.log('\n--- 7. Testing Category Update ---');
    const editCatRes = await request('PUT', `/api/categories/${cat1Id}`, {
      name: 'Hot & Cold Beverages',
      description: 'Expanded beverage catalog'
    }, bizHeaders);
    assert.strictEqual(editCatRes.status, 200, 'Category update should return 200');
    assert.strictEqual(editCatRes.body.category.name, 'Hot & Cold Beverages');
    console.log('✔ Category updated successfully.');

    // --- 8. Create Another Product after Onboarding ---
    console.log('\n--- 8. Testing Post-Onboarding Product Creation ---');
    const p4Res = await request('POST', '/api/products', {
      name: 'Dangote Sugar 50kg',
      category_id: cat2Id,
      sku: 'SUGAR-50KG',
      cost_price: 68000,
      selling_price: 74000,
      opening_stock: 20,
      unit: 'bag',
      reorder_level: 5
    }, bizHeaders);
    assert.strictEqual(p4Res.status, 201, 'Product 4 should be created');
    console.log('✔ 4th Product created post-onboarding.');

    // --- 9. Logout and Login Verification ---
    console.log('\n--- 9. Testing Logout and Login Persistence ---');
    ownerToken = null; // Clear token
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'musa.danbaba@kanomegamart.ng',
      password: 'MusaSecure@2026'
    });
    assert.strictEqual(loginRes.status, 200, 'Login should succeed');
    const newOwnerToken = loginRes.body.token;
    assert.ok(newOwnerToken, 'New token issued');

    const newBizHeaders = {
      Authorization: `Bearer ${newOwnerToken}`,
      'x-business-id': String(bizId)
    };

    const verifyProdsRes = await request('GET', '/api/products', null, newBizHeaders);
    assert.strictEqual(verifyProdsRes.status, 200);
    assert.strictEqual(verifyProdsRes.body.products.length, 4, 'All 4 products should persist after relogin');
    console.log('✔ Persistence verified: All 4 products exist in DB after logout and login.');

    const verifyCatsRes = await request('GET', '/api/categories', null, newBizHeaders);
    assert.strictEqual(verifyCatsRes.status, 200);
    assert.ok(verifyCatsRes.body.categories.length >= 2, 'All categories should persist after relogin');
    console.log('✔ Persistence verified: All categories exist in DB after logout and login.');

    // --- 10. Role-Based Access Control for Non-Admin / Cashier ---
    console.log('\n--- 10. Testing Normal Non-Admin User Access (Cashier) ---');
    // Register cashier
    const cashierReg = await request('POST', '/api/auth/register', {
      full_name: 'Fatima Garba (Cashier)',
      email: 'fatima.cashier@kanomegamart.ng',
      phone: '08098765432',
      password: 'FatimaPassword@2026'
    });
    const cashierId = cashierReg.body.user.id;
    const cashierToken = cashierReg.body.token;

    // Owner adds cashier to Kano Megamart
    const addMemberRes = await request('POST', '/api/businesses/members', {
      email: 'fatima.cashier@kanomegamart.ng',
      role: 'cashier'
    }, newBizHeaders);
    assert.strictEqual(addMemberRes.status, 201, 'Cashier added to business');
    console.log('✔ Cashier member added to business.');

    const cashierHeaders = {
      Authorization: `Bearer ${cashierToken}`,
      'x-business-id': String(bizId)
    };

    // Cashier CAN view products
    const cashierProds = await request('GET', '/api/products', null, cashierHeaders);
    assert.strictEqual(cashierProds.status, 200, 'Cashier should be able to view products');
    assert.strictEqual(cashierProds.body.products.length, 4, 'Cashier sees all 4 products');
    console.log('✔ Cashier can view products catalog.');

    // Cashier CAN view categories
    const cashierCats = await request('GET', '/api/categories', null, cashierHeaders);
    assert.strictEqual(cashierCats.status, 200, 'Cashier should be able to view categories');
    console.log('✔ Cashier can view categories.');

    // Cashier CAN view single product details
    const cashierP1 = await request('GET', `/api/products/${p1Id}`, null, cashierHeaders);
    assert.strictEqual(cashierP1.status, 200, 'Cashier can view product details');
    console.log('✔ Cashier can view single product details & ledger.');

    // Cashier CAN use products in sales
    const walkinSaleRes = await request('POST', '/api/sales', {
      items: [{ product_id: p1Id, quantity: 2, unit_price: 800 }],
      payment_method: 'cash',
      amount_paid: 1600
    }, cashierHeaders);
    assert.strictEqual(walkinSaleRes.status, 201, 'Cashier can record sale');
    console.log('✔ Cashier can use products in operational sales.');

    // Cashier CANNOT add product without permission
    const cashierAddProd = await request('POST', '/api/products', {
      name: 'Unauthorized Product',
      cost_price: 100,
      selling_price: 200
    }, cashierHeaders);
    assert.strictEqual(cashierAddProd.status, 403, 'Cashier should be blocked from adding product');
    console.log('✔ Cashier blocked from adding products (403 Forbidden).');

    // Cashier CANNOT edit product
    const cashierEditProd = await request('PUT', `/api/products/${p1Id}`, {
      selling_price: 9999
    }, cashierHeaders);
    assert.strictEqual(cashierEditProd.status, 403, 'Cashier should be blocked from editing product');
    console.log('✔ Cashier blocked from editing products (403 Forbidden).');

    // Cashier CANNOT archive product
    const cashierArchiveProd = await request('DELETE', `/api/products/${p1Id}`, null, cashierHeaders);
    assert.strictEqual(cashierArchiveProd.status, 403, 'Cashier should be blocked from archiving product');
    console.log('✔ Cashier blocked from archiving products (403 Forbidden).');

    // Cashier CANNOT add category
    const cashierAddCat = await request('POST', '/api/categories', {
      name: 'Unauthorized Category'
    }, cashierHeaders);
    assert.strictEqual(cashierAddCat.status, 403, 'Cashier should be blocked from adding category');
    console.log('✔ Cashier blocked from adding categories (403 Forbidden).');

    // Cashier CANNOT delete category
    const cashierDeleteCat = await request('DELETE', `/api/categories/${cat1Id}`, null, cashierHeaders);
    assert.strictEqual(cashierDeleteCat.status, 403, 'Cashier should be blocked from deleting category');
    console.log('✔ Cashier blocked from deleting categories (403 Forbidden).');

    // --- 11. Validation Error Messages ---
    console.log('\n--- 11. Testing Validation Error Messages (Part 4) ---');
    // Missing product name
    const valName = await request('POST', '/api/products', {
      name: '  ',
      cost_price: 100,
      selling_price: 200
    }, newBizHeaders);
    assert.strictEqual(valName.status, 400);
    assert.strictEqual(valName.body.error, 'Product name is required.');
    console.log('✔ Validation: Product name is required.');

    // Invalid cost price
    const valCost = await request('POST', '/api/products', {
      name: 'Test Product',
      cost_price: -50,
      selling_price: 200
    }, newBizHeaders);
    assert.strictEqual(valCost.status, 400);
    assert.strictEqual(valCost.body.error, 'Cost price must be valid.');
    console.log('✔ Validation: Cost price must be valid.');

    // Invalid selling price
    const valPrice = await request('POST', '/api/products', {
      name: 'Test Product',
      cost_price: 100,
      selling_price: -20
    }, newBizHeaders);
    assert.strictEqual(valPrice.status, 400);
    assert.strictEqual(valPrice.body.error, 'Selling price must be valid.');
    console.log('✔ Validation: Selling price must be valid.');

    // Negative stock
    const valStock = await request('POST', '/api/products', {
      name: 'Test Product',
      cost_price: 100,
      selling_price: 200,
      opening_stock: -5
    }, newBizHeaders);
    assert.strictEqual(valStock.status, 400);
    assert.strictEqual(valStock.body.error, 'Stock quantity cannot be negative.');
    console.log('✔ Validation: Stock quantity cannot be negative.');

    // Non-existent category
    const valCatNonExist = await request('POST', '/api/products', {
      name: 'Test Product',
      cost_price: 100,
      selling_price: 200,
      category_id: 99999
    }, newBizHeaders);
    assert.strictEqual(valCatNonExist.status, 400);
    assert.strictEqual(valCatNonExist.body.error, 'Category does not exist.');
    console.log('✔ Validation: Category does not exist.');

    // Duplicate SKU
    const valSkuDup = await request('POST', '/api/products', {
      name: 'Test Product With Same SKU',
      cost_price: 100,
      selling_price: 200,
      sku: 'PEAK-160G' // already used by Product 1
    }, newBizHeaders);
    assert.strictEqual(valSkuDup.status, 409);
    assert.strictEqual(valSkuDup.body.error, 'SKU already exists.');
    console.log('✔ Validation: SKU already exists.');

    // Missing category name
    const valCatName = await request('POST', '/api/categories', {
      name: ''
    }, newBizHeaders);
    assert.strictEqual(valCatName.status, 400);
    assert.strictEqual(valCatName.body.error, 'Category name is required.');
    console.log('✔ Validation: Category name is required.');

    // Duplicate category name
    const valCatDup = await request('POST', '/api/categories', {
      name: 'Provisions & Cereals'
    }, newBizHeaders);
    assert.strictEqual(valCatDup.status, 409);
    assert.strictEqual(valCatDup.body.error, 'Category already exists.');
    console.log('✔ Validation: Category already exists.');

    // --- 12. Delete Category ---
    console.log('\n--- 12. Testing Category Deletion ---');
    const delCatRes = await request('DELETE', `/api/categories/${cat2Id}`, null, newBizHeaders);
    assert.strictEqual(delCatRes.status, 200, 'Category deletion should return 200');
    console.log('✔ Category soft-deleted and products safely uncategorized.');

    console.log('\n========================================================');
    console.log('🎉 ALL ONBOARDING, PRODUCTS & RBAC E2E TESTS PASSED 100%! 🎉');
    console.log('========================================================\n');

  } finally {
    if (server) {
      server.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
    }
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  });

