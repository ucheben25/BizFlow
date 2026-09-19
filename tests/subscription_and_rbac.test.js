const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Use isolated database for subscription and RBAC tests
const TEST_DB = path.join(__dirname, '../data/test_sub_rbac.db');
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
process.env.DATABASE_PATH = TEST_DB;
process.env.NODE_ENV = 'test';

const db = require('../server/config/database');
const app = require('../server/index');
const { runMigrations } = require('../server/database/migrations');
const { seedBusinessDefaults } = require('../server/database/seedAccounts');

async function runSubscriptionAndRBACTests() {
  console.log('>>> RUNNING BIZFLOW SUBSCRIPTION GATING & RBAC SECURITY SUITE <<<');
  runMigrations();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Test Public Website Endpoints (No Auth Needed)
    console.log('\n--- 1. Testing Public Website Endpoints ---');
    const plansRes = await fetch(`${baseUrl}/public/plans`);
    assert.strictEqual(plansRes.status, 200, 'Public plans should return 200');
    const plansData = await plansRes.json();
    assert.strictEqual(plansData.plans.length, 2, 'Should return 2 plans (Basic and Business)');
    console.log(`✔ Public plans verified: ${plansData.plans.map(p => `${p.name} (₦${p.price.toLocaleString()}, max ${p.max_users} users)`).join(', ')}`);

    const contactRes = await fetch(`${baseUrl}/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Olumide Jacobs',
        email: 'olumide@example.com',
        subject: 'Wholesale inquiry',
        message: 'Hello, does BizFlow support barcode printing for thermal receipt printers?'
      })
    });
    assert.strictEqual(contactRes.status, 201, 'Contact submission should return 201');
    const contactRow = db.prepare('SELECT * FROM contact_submissions WHERE email = ?').get('olumide@example.com');
    assert.ok(contactRow, 'Contact submission should be saved in database');
    console.log('✔ Public contact submission received and stored in database.');

    // 2. Register Owner and Create Business with Basic Plan (2 user limit)
    console.log('\n--- 2. Testing Owner Registration & Basic Plan Subscription ---');
    const ownerReg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Alhaji Musa Danjuma',
        email: 'danjuma@stores.ng',
        password: 'password123',
        phone: '08055556666'
      })
    });
    const ownerData = await ownerReg.json();
    const ownerToken = ownerData.token;

    const bizRes = await fetch(`${baseUrl}/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        name: 'Danjuma Provision Mart',
        business_type: 'Retail Supermarket',
        currency: 'NGN',
        currency_symbol: '₦',
        plan_id: 1 // Basic plan (max 2 users)
      })
    });
    const bizData = await bizRes.json();
    const bizId = bizData.business.id;

    // Activate Basic Plan subscription
    const initRes = await fetch(`${baseUrl}/subscriptions/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({ plan_id: 1 })
    });
    const initData = await initRes.json();

    const verifyRes = await fetch(`${baseUrl}/subscriptions/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({ reference: initData.reference })
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.subscription.status, 'active');
    assert.strictEqual(verifyData.subscription.maxUsers, 2);
    console.log(`✔ Business initialized on Basic Plan: max 2 active users (Owner + 1 staff).`);

    // 3. Test Plan User Limits (Requirement 32)
    console.log('\n--- 3. Testing Plan User Limits (Requirement 32) ---');
    // Register 2 staff users
    const staff1Reg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Bayo Cashier',
        email: 'bayo@danjuma.ng',
        password: 'password123'
      })
    });
    const staff1Data = await staff1Reg.json();

    const staff2Reg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Ibrahim Inventory',
        email: 'ibrahim@danjuma.ng',
        password: 'password123'
      })
    });

    // Add first staff member (Owner is #1, Bayo is #2 => 2/2 allowed)
    const add1Res = await fetch(`${baseUrl}/businesses/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({
        email: 'bayo@danjuma.ng',
        role: 'cashier'
      })
    });
    assert.strictEqual(add1Res.status, 201, 'Adding 2nd member should succeed');
    console.log('✔ Added 2nd team member (bayo@danjuma.ng as cashier). Active users: 2/2.');

    // Attempt to add second staff member (would be #3 => EXCEEDS 2 user limit!)
    const add2Res = await fetch(`${baseUrl}/businesses/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({
        email: 'ibrahim@danjuma.ng',
        role: 'staff'
      })
    });
    assert.strictEqual(add2Res.status, 403, 'Adding 3rd member on 2-user plan must be rejected with 403');
    const add2Data = await add2Res.json();
    assert.strictEqual(add2Data.limitReached, true, 'limitReached flag must be true');
    console.log(`✔ Server-side user limit enforced: "${add2Data.error}"`);

    // Upgrade to Business Plan (5 users)
    console.log('\n--- 4. Testing Plan Upgrade to Business (5 users) ---');
    const upgradeInit = await fetch(`${baseUrl}/subscriptions/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({ plan_id: 2 })
    });
    const upgradeInitData = await upgradeInit.json();

    const upgradeVerify = await fetch(`${baseUrl}/subscriptions/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({ reference: upgradeInitData.reference })
    });
    const upgradeVerifyData = await upgradeVerify.json();
    assert.strictEqual(upgradeVerifyData.subscription.maxUsers, 5, 'Max users should now be 5');
    console.log(`✔ Upgraded to Business Plan: max ${upgradeVerifyData.subscription.maxUsers} users.`);

    // Now adding 3rd member should succeed!
    const add3Res = await fetch(`${baseUrl}/businesses/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      },
      body: JSON.stringify({
        email: 'ibrahim@danjuma.ng',
        role: 'staff'
      })
    });
    assert.strictEqual(add3Res.status, 201, 'Adding 3rd member after upgrade should succeed');
    console.log('✔ Added 3rd team member (ibrahim@danjuma.ng as staff) after plan upgrade.');

    // 5. Test Regular User Role Restrictions (Requirement 13 & 35)
    console.log('\n--- 5. Testing Regular User Role Restrictions (Requirement 13 & 35) ---');
    const staffToken = staff1Data.token;

    // Staff tries to access Profit & Loss -> Forbidden
    const pnlRes = await fetch(`${baseUrl}/reports/pnl`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(pnlRes.status, 403, 'Regular staff must be denied access to P&L');
    console.log('✔ Regular staff blocked from P&L with 403 Forbidden.');

    // Staff tries to access Balance Sheet -> Forbidden
    const bsRes = await fetch(`${baseUrl}/reports/balance-sheet`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(bsRes.status, 403, 'Regular staff must be denied access to Balance Sheet');
    console.log('✔ Regular staff blocked from Balance Sheet with 403 Forbidden.');

    // Staff tries to access Cash Flow -> Forbidden
    const cfRes = await fetch(`${baseUrl}/reports/cash-flow`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(cfRes.status, 403, 'Regular staff must be denied access to Cash Flow');
    console.log('✔ Regular staff blocked from Cash Flow with 403 Forbidden.');

    // Staff tries to access Business Expenses -> Forbidden
    const expRes = await fetch(`${baseUrl}/expenses`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(expRes.status, 403, 'Regular staff must be denied access to Business Expenses');
    console.log('✔ Regular staff blocked from Business Expenses with 403 Forbidden.');

    // Staff tries to access Staff List -> Forbidden
    const staffDirRes = await fetch(`${baseUrl}/staff`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(staffDirRes.status, 403, 'Regular staff must be denied access to Staff Directory');
    console.log('✔ Regular staff blocked from Staff Directory with 403 Forbidden.');

    // Staff tries to access Payroll -> Forbidden
    const payrollRes = await fetch(`${baseUrl}/payroll/dashboard`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(payrollRes.status, 403, 'Regular staff must be denied access to Payroll');
    console.log('✔ Regular staff blocked from Payroll with 403 Forbidden.');

    // Staff views Dashboard -> Operational metrics only, zero profit figures!
    const dashRes = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.strictEqual(dashData.hasFinancialAccess, false, 'hasFinancialAccess flag must be false for regular staff');
    assert.strictEqual(dashData.summary.today.netProfit, undefined, 'Net profit must be undefined for regular staff');
    assert.strictEqual(dashData.summary.today.grossProfit, undefined, 'Gross profit must be undefined for regular staff');
    assert.strictEqual(dashData.summary.receivables, undefined, 'Debtors total must be undefined for regular staff');
    console.log('✔ Staff dashboard verified: Operational data only (hasFinancialAccess = false, zero profit metrics exposed).');

    // 6. Test Subscription Cancellation & Safe Data Preservation
    console.log('\n--- 6. Testing Subscription Cancellation & Data Preservation ---');
    const cancelRes = await fetch(`${baseUrl}/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(cancelRes.status, 200);
    console.log('✔ Subscription cancelled successfully.');

    // Now operational calls are blocked with 402
    const blockedProdRes = await fetch(`${baseUrl}/products`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'x-business-id': String(bizId)
      }
    });
    assert.strictEqual(blockedProdRes.status, 402, 'Operational route must return 402 on cancelled subscription');

    // Verify business data is still completely intact in database!
    const bizCheck = db.prepare('SELECT * FROM businesses WHERE id = ?').get(bizId);
    assert.strictEqual(bizCheck.name, 'Danjuma Provision Mart', 'Business data must remain safe and intact');
    console.log('✔ Business data safely preserved in database after subscription cancellation.');

    console.log('\n========================================================');
    console.log('🎉 ALL SUBSCRIPTION & RBAC SECURITY TESTS PASSED 100%! 🎉');
    console.log('========================================================\n');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runSubscriptionAndRBACTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

module.exports = { runSubscriptionAndRBACTests };
