const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Use an isolated test database
const TEST_DB = path.join(__dirname, '../data/test_payroll.db');
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
process.env.DATABASE_PATH = TEST_DB;
process.env.NODE_ENV = 'test';

const db = require('../server/config/database');
const { runMigrations } = require('../server/database/migrations');
const { seedBusinessDefaults } = require('../server/database/seedAccounts');
const PayrollService = require('../server/services/payrollService');
const AccountingService = require('../server/services/accountingService');

async function runPayrollTests() {
  console.log('>>> RUNNING BIZFLOW PAYROLL & ACCOUNTING INTEGRATION SUITE <<<');
  runMigrations();

  // Create test user and business
  const user = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, phone)
    VALUES ('owner@bizflow.ng', 'hashed', 'Emeka Okafor', '08012345678')
  `).run();
  const userId = user.lastInsertRowid;

  const biz = db.prepare(`
    INSERT INTO businesses (name, business_type, currency, currency_symbol)
    VALUES ('Okafor Logistics & Trading', 'Wholesale', 'NGN', '₦')
  `).run();
  const bizId = biz.lastInsertRowid;

  db.prepare(`
    INSERT INTO business_members (business_id, user_id, role, permissions)
    VALUES (?, ?, 'owner', '["all"]')
  `).run(bizId, userId);

  seedBusinessDefaults(bizId);

  // Seed active business subscription
  db.prepare(`
    INSERT INTO subscriptions (
      business_id, plan_id, status, amount, currency, max_users, billing_interval, provider, provider_reference, started_at, current_period_start, current_period_end
    ) VALUES (?, 2, 'active', 10000, 'NGN', 5, 'monthly', 'test', 'TEST-PAYROLL-SUB', datetime('now'), datetime('now'), datetime('now', '+30 days'))
  `).run(bizId);

  // 1. Create Staff Members
  console.log('\n--- 1. Testing Staff Creation & Directory ---');
  const staff1 = PayrollService.createStaff(bizId, userId, {
    full_name: 'Chidi Nwosu',
    email: 'chidi@okafor.ng',
    phone: '08022223333',
    position: 'Operations Manager',
    department: 'Operations',
    basic_salary: 250000,
    employment_status: 'active'
  });
  assert.strictEqual(staff1.full_name, 'Chidi Nwosu');
  assert.strictEqual(staff1.basic_salary, 250000);
  assert.ok(staff1.employee_id.startsWith('EMP-'), 'Should auto-generate employee ID');
  console.log(`✔ Staff created: ${staff1.full_name} (${staff1.employee_id}) - ₦${staff1.basic_salary.toLocaleString()}`);

  const staff2 = PayrollService.createStaff(bizId, userId, {
    full_name: 'Amina Bello',
    email: 'amina@okafor.ng',
    phone: '08033334444',
    position: 'Accountant',
    department: 'Finance',
    basic_salary: 180000,
    employment_status: 'active'
  });
  assert.strictEqual(staff2.full_name, 'Amina Bello');
  console.log(`✔ Staff created: ${staff2.full_name} (${staff2.employee_id}) - ₦${staff2.basic_salary.toLocaleString()}`);

  const list = PayrollService.getStaffList(bizId);
  assert.strictEqual(list.length, 2, 'Should list 2 staff members');
  console.log(`✔ Staff directory retrieved: ${list.length} active employees.`);

  // 2. Salary Record Calculation: Basic + Allowances - Deductions = Net Salary
  console.log('\n--- 2. Testing Salary Calculation (Requirement 18) ---');
  const record1 = PayrollService.createSalaryRecord(bizId, userId, {
    staff_id: staff1.id,
    pay_period: '2026-09',
    basic_salary: 250000,
    allowances: 30000, // Transport + Housing allowance
    deductions: 10000, // Loan deduction
    notes: 'September 2026 Salary'
  });

  // Expected: 250,000 + 30,000 - 10,000 = 270,000
  assert.strictEqual(record1.basic_salary, 250000);
  assert.strictEqual(record1.allowances, 30000);
  assert.strictEqual(record1.deductions, 10000);
  assert.strictEqual(record1.net_salary, 270000);
  assert.strictEqual(record1.payment_status, 'pending');
  console.log(`✔ Salary calculated accurately: ₦250k Basic + ₦30k Allowances - ₦10k Deductions = ₦${record1.net_salary.toLocaleString()} Net.`);

  const record2 = PayrollService.createSalaryRecord(bizId, userId, {
    staff_id: staff2.id,
    pay_period: '2026-09',
    basic_salary: 180000,
    allowances: 15000,
    deductions: 0
  });
  // Expected: 180,000 + 15,000 - 0 = 195,000
  assert.strictEqual(record2.net_salary, 195000);
  console.log(`✔ Salary calculated accurately: ₦180k Basic + ₦15k Allowances - ₦0 Deductions = ₦${record2.net_salary.toLocaleString()} Net.`);

  // 3. Payroll Dashboard Overview (Requirement 19)
  console.log('\n--- 3. Testing Payroll Dashboard KPIs ---');
  let dash = PayrollService.getPayrollDashboard(bizId, '2026-09');
  assert.strictEqual(dash.totalStaff, 2);
  assert.strictEqual(dash.activeStaff, 2);
  assert.strictEqual(dash.pendingAmount, 465000); // 270k + 195k
  assert.strictEqual(dash.paidAmount, 0);
  console.log(`✔ Dashboard KPIs verified: Total Staff: ${dash.totalStaff}, Pending: ₦${dash.pendingAmount.toLocaleString()}, Paid: ₦${dash.paidAmount.toLocaleString()}`);

  // 4. Financial Integration of Payroll Payment (Requirement 22)
  console.log('\n--- 4. Testing Salary Payment & Double-Entry Accounting Entry (Requirement 22) ---');
  // Record initial owner equity cash deposit so cash balance is positive
  AccountingService.recordJournalEntry({
    businessId: bizId,
    referenceType: 'capital_contribution',
    referenceId: 1,
    description: "Initial Owner's Capital Injection",
    userId,
    lines: [
      { accountCode: '1010', debit: 1000000, credit: 0 },
      { accountCode: '3010', debit: 0, credit: 1000000 }
    ]
  });

  // Execute payment for Staff 1: ₦270,000 via Cash (Account 1010)
  const payResult = PayrollService.recordSalaryPayment(bizId, userId, record1.id, {
    payment_method: 'cash',
    payment_reference: 'CASH-PAY-001',
    payment_date: '2026-09-19'
  });
  assert.strictEqual(payResult.success, true);
  assert.strictEqual(payResult.record.payment_status, 'paid');
  assert.ok(payResult.journalEntryId, 'Should link double-entry journal entry ID');
  console.log(`✔ Salary payment recorded: Status = PAID, Journal Entry = #${payResult.journalEntryId}.`);

  // Verify Double-Entry Journal Lines
  const journalLines = db.prepare(`
    SELECT jl.*, a.code, a.name
    FROM journal_lines jl
    JOIN accounts a ON jl.account_id = a.id
    WHERE jl.journal_entry_id = ?
    ORDER BY jl.debit DESC
  `).all(payResult.journalEntryId);

  assert.strictEqual(journalLines.length, 2, 'Should have 2 journal lines (Debit & Credit)');
  assert.strictEqual(journalLines[0].code, '6040', 'Debit line should be 6040 Salaries & Wages');
  assert.strictEqual(journalLines[0].debit, 270000, 'Debit amount should be ₦270,000');
  assert.strictEqual(journalLines[1].code, '1010', 'Credit line should be 1010 Cash on Hand');
  assert.strictEqual(journalLines[1].credit, 270000, 'Credit amount should be ₦270,000');
  console.log(`✔ Double-entry verified: DEBIT 6040 (Salaries & Wages) ₦270,000, CREDIT 1010 (Cash on Hand) ₦270,000.`);

  // 5. Verify Profit & Loss Reflection (Requirement 22 & 38 Test 13)
  console.log('\n--- 5. Testing Profit & Loss Statement Reflection ---');
  const pnl = AccountingService.getProfitAndLoss(bizId);
  const salaryExpense = pnl.expenseAccounts.find(e => e.code === '6040' || e.name.toLowerCase().includes('salar'));
  assert.ok(salaryExpense, 'Salary Expense must appear under Operating Expenses in P&L');
  assert.strictEqual(salaryExpense.total, 270000, 'Salary Expense amount must match paid salary ₦270,000');
  console.log(`✔ P&L Verified: "${salaryExpense.name}" reflected accurately as ₦${salaryExpense.total.toLocaleString()} operating expense.`);

  // 6. Verify Trial Balance Balance
  console.log('\n--- 6. Verifying Trial Balance Balance ---');
  const tb = AccountingService.getTrialBalance(bizId);
  assert.strictEqual(tb.isBalanced, true, 'Trial Balance must remain balanced');
  assert.strictEqual(tb.totalDebit, tb.totalCredit, 'Debits must equal Credits in Trial Balance');
  console.log(`✔ Trial Balance balanced: Debits ₦${tb.totalDebit.toLocaleString()} === Credits ₦${tb.totalCredit.toLocaleString()}`);

  console.log('\n========================================================');
  console.log('🎉 ALL PAYROLL & FINANCIAL INTEGRATION TESTS PASSED 100%! 🎉');
  console.log('========================================================\n');
}

if (require.main === module) {
  runPayrollTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

module.exports = { runPayrollTests };
