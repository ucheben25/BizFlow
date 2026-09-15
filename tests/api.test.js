process.env.NODE_ENV = 'test';
process.env.PORT = '5099';
process.env.DATABASE_PATH = './data/test_api_bizflow.db';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Clean test database if exists
const testDbPath = path.resolve(process.cwd(), './data/test_api_bizflow.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');

const app = require('../server/index');
const server = app.listen(5099);

async function runApiTests() {
  console.log('>>> RUNNING BIZFLOW HTTP REST API SUITE <<<');
  const baseUrl = 'http://localhost:5099/api';

  try {
    // 1. Register new user
    console.log('\n--- 1. Testing Registration ---');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Chief Obinna',
        email: 'obinna@superstores.ng',
        password: 'password123',
        phone: '+234 803 999 8888'
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');
    assert.ok(regData.token, 'Token should be returned');
    console.log('✔ User registered successfully with JWT token.');
    const token = regData.token;

    // 2. Login
    console.log('\n--- 2. Testing Login ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'obinna@superstores.ng',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, 'Login should return 200');
    assert.strictEqual(loginData.user.email, 'obinna@superstores.ng');
    console.log('✔ User logged in successfully.');

    // 3. Create Business
    console.log('\n--- 3. Testing Business Creation ---');
    const bizRes = await fetch(`${baseUrl}/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Obinna Superstores',
        business_type: 'FMCG Retail',
        currency: 'NGN',
        currency_symbol: '₦'
      })
    });
    const bizData = await bizRes.json();
    assert.strictEqual(bizRes.status, 201, 'Business creation should return 201');
    const bizId = bizData.business.id;
    console.log(`✔ Business "${bizData.business.name}" created with ID ${bizId}.`);

    // 4. Create Product with Opening Stock
    console.log('\n--- 4. Testing Product Creation with Opening Stock ---');
    const prodRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({
        name: 'Golden Penny Flour 50kg',
        unit: 'bag',
        cost_price: 38000,
        selling_price: 43000,
        opening_stock: 50,
        reorder_level: 10
      })
    });
    const prodData = await prodRes.json();
    assert.strictEqual(prodRes.status, 201, 'Product creation should return 201');
    const prodId = prodData.product.id;
    console.log(`✔ Product created with 50 units initial stock.`);

    // 5. Create POS Sale (Sell 5 units for ₦215,000; customer pays ₦150,000; balance ₦65,000)
    console.log('\n--- 5. Testing POS Sale Creation & Inventory Deduction ---');
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({
        items: [{ product_id: prodId, quantity: 5, unit_price: 43000 }],
        discount: 0,
        paid_amount: 150000,
        payment_method: 'pos'
      })
    });
    const saleData = await saleRes.json();
    assert.strictEqual(saleRes.status, 201, 'Sale creation should return 201');
    assert.strictEqual(saleData.sale.total_amount, 215000, 'Total should be 215000');
    assert.strictEqual(saleData.sale.paid_amount, 150000, 'Paid should be 150000');
    assert.strictEqual(saleData.sale.balance_amount, 65000, 'Balance should be 65000');
    console.log(`✔ Sale ${saleData.sale.invoice_number} recorded. Total: ₦215,000, Paid: ₦150,000, Debt: ₦65,000.`);

    // Check inventory stock after sale: 50 - 5 = 45 units
    const getProdRes = await fetch(`${baseUrl}/products/${prodId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-business-id': String(bizId)
      }
    });
    const getProdData = await getProdRes.json();
    assert.strictEqual(getProdData.product.current_stock, 45, 'Stock should be 45 units');
    console.log(`✔ Product stock reduced to ${getProdData.product.current_stock} units.`);

    // 6. Record Expense (Transportation: ₦15,000)
    console.log('\n--- 6. Testing Expense Recording ---');
    const expRes = await fetch(`${baseUrl}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({
        category: 'Transportation & Delivery',
        amount: 15000,
        payment_method: 'cash',
        description: 'Van delivery to shop'
      })
    });
    const expData = await expRes.json();
    assert.strictEqual(expRes.status, 201, 'Expense creation should return 201');
    console.log(`✔ Expense recorded: ₦15,000 Transportation.`);

    // 7. Verify Dashboard KPIs
    console.log('\n--- 7. Testing Dashboard Financial Summary ---');
    const dashRes = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-business-id': String(bizId)
      }
    });
    const dashData = await dashRes.json();
    assert.strictEqual(dashRes.status, 200, 'Dashboard should return 200');
    assert.strictEqual(dashData.summary.today.sales, 215000, 'Today sales must be ₦215,000');
    assert.strictEqual(dashData.summary.today.cogs, 190000, 'COGS must be 5 * 38000 = ₦190,000');
    assert.strictEqual(dashData.summary.today.grossProfit, 25000, 'Gross profit must be ₦25,000');
    assert.strictEqual(dashData.summary.today.netProfit, 10000, 'Net profit must be ₦25,000 - ₦15,000 = ₦10,000');
    console.log(`✔ Verified Dashboard KPIs: Sales = ₦${dashData.summary.today.sales.toLocaleString()}, COGS = ₦${dashData.summary.today.cogs.toLocaleString()}, Gross Profit = ₦${dashData.summary.today.grossProfit.toLocaleString()}, Net Profit = ₦${dashData.summary.today.netProfit.toLocaleString()}`);

    // 8. Test AI Financial Assistant
    console.log('\n--- 8. Testing AI Assistant Q&A ---');
    const aiRes = await fetch(`${baseUrl}/ai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({
        question: 'What were my sales this month?'
      })
    });
    const aiData = await aiRes.json();
    assert.strictEqual(aiRes.status, 200, 'AI response should return 200');
    assert.strictEqual(aiData.verified, true, 'AI response must be verified');
    assert.ok(aiData.answer.includes('215,000'), 'AI response must cite exact sales revenue ₦215,000');
    console.log(`✔ AI Assistant verified answer:\n${aiData.answer}`);

    console.log('\n========================================================');
    console.log('🎉 ALL REST API ENDPOINT TESTS PASSED 100%! 🎉');
    console.log('========================================================\n');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runApiTests();
