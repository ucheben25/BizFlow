/**
 * BizFlow Payroll Management Component
 * Requirements 16, 17, 18, 19, 21, 22
 */

let payrollSelectedPeriod = new Date().toISOString().substring(0, 7); // 'YYYY-MM'

async function renderPayroll() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Payroll Management';

  container.innerHTML = `
    <!-- Top Action & Period Selection Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <label style="font-weight: 700; color: var(--navy-dark); font-size: 0.92rem;">Pay Period:</label>
        <input type="month" id="payroll-period-input" class="form-control" style="width: 170px;" 
               value="${payrollSelectedPeriod}" onchange="handlePayrollPeriodChange(this.value)">
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" onclick="State.setView('staff')">Staff Directory</button>
        <button class="btn btn-primary btn-sm" onclick="showCreateSalaryModal()">+ Process Salary</button>
      </div>
    </div>

    <!-- Payroll Dashboard KPIs -->
    <div id="payroll-kpi-container" class="kpi-grid" style="margin-bottom: 24px;">
      <div style="text-align: center; padding: 20px; color: var(--blue-primary); grid-column: 1 / -1;">Loading payroll overview...</div>
    </div>

    <!-- Salary Records Table Card -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Salary Payments Ledger (${payrollSelectedPeriod})</div>
          <div class="card-subtitle">Verified salary calculations, allowances, deductions, and payment execution</div>
        </div>
      </div>

      <div id="payroll-records-container">
        <div style="text-align: center; padding: 40px; color: var(--blue-primary);">Loading salary records...</div>
      </div>
    </div>
  `;

  loadPayrollData();
}

function handlePayrollPeriodChange(val) {
  payrollSelectedPeriod = val;
  loadPayrollData();
}

async function loadPayrollData() {
  const kpiContainer = document.getElementById('payroll-kpi-container');
  const recordsContainer = document.getElementById('payroll-records-container');
  if (!kpiContainer || !recordsContainer) return;

  try {
    // 1. Fetch Dashboard KPI summary
    const dashRes = await API.get(`/payroll/dashboard?period=${encodeURIComponent(payrollSelectedPeriod)}`);
    const d = dashRes.dashboard;

    kpiContainer.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Active Staff</span>
          <div class="kpi-icon-wrapper" style="background: var(--blue-subtle); color: var(--blue-primary);">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          </div>
        </div>
        <div class="kpi-value">${d.activeStaff}</div>
        <div class="kpi-subtitle">${d.totalStaff} total employees registered</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Monthly Payroll</span>
          <div class="kpi-icon-wrapper" style="background: var(--blue-subtle); color: var(--blue-primary);">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </div>
        <div class="kpi-value">₦${Number(d.totalMonthlyPayroll).toLocaleString()}</div>
        <div class="kpi-subtitle">Active staff base payroll</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Paid Salaries</span>
          <div class="kpi-icon-wrapper" style="background: var(--color-success-bg); color: var(--color-success);">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--color-success);">₦${Number(d.paidAmount).toLocaleString()}</div>
        <div class="kpi-subtitle">${d.paidCount} staff paid for this period</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Pending Salaries</span>
          <div class="kpi-icon-wrapper" style="background: var(--color-warning-bg); color: var(--color-warning);">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--color-warning);">₦${Number(d.pendingAmount).toLocaleString()}</div>
        <div class="kpi-subtitle">${d.pendingCount} unpaid salary records</div>
      </div>
    `;

    // 2. Fetch period records
    const recordsRes = await API.get(`/payroll/records?pay_period=${encodeURIComponent(payrollSelectedPeriod)}`);
    const records = recordsRes.records || [];

    if (records.length === 0) {
      recordsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          </div>
          <div class="empty-state-title">No Salary Records for ${payrollSelectedPeriod}</div>
          <div class="empty-state-desc">Generate salary records for your staff to calculate allowances, deductions, and execute payouts.</div>
          <button class="btn btn-primary btn-sm" onclick="showCreateSalaryModal()">+ Process Salary Payout</button>
        </div>
      `;
      return;
    }

    recordsContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Position & Dept</th>
              <th>Basic Salary</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Net Payout</th>
              <th>Status</th>
              <th>Payment Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>
                  <div style="font-weight: 750; color: var(--navy-dark);">${r.staff_name}</div>
                  <div style="font-size: 0.75rem; color: var(--blue-primary);">${r.employee_id}</div>
                </td>
                <td>
                  <div style="font-weight: 600;">${r.position}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${r.department || 'General'}</div>
                </td>
                <td>₦${Number(r.basic_salary).toLocaleString()}</td>
                <td style="color: var(--color-success); font-weight: 600;">+ ₦${Number(r.allowances).toLocaleString()}</td>
                <td style="color: var(--color-danger); font-weight: 600;">- ₦${Number(r.deductions).toLocaleString()}</td>
                <td style="font-weight: 850; color: var(--navy-dark); font-size: 1rem;">
                  ₦${Number(r.net_salary).toLocaleString()}
                </td>
                <td>
                  <span class="badge ${r.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">
                    ${r.payment_status.toUpperCase()}
                  </span>
                </td>
                <td style="font-size: 0.8rem;">
                  ${r.payment_status === 'paid' ? `
                    <div style="font-weight: 600;">${r.payment_method.replace('_', ' ').toUpperCase()}</div>
                    <div style="color: var(--text-muted);">${formatDate(r.payment_date)}</div>
                  ` : '<span style="color: var(--text-muted);">Unpaid</span>'}
                </td>
                <td>
                  ${r.payment_status === 'pending' ? `
                    <button class="btn btn-primary btn-sm" onclick="showPaySalaryModal(${r.id}, '${r.staff_name}', ${r.net_salary})">
                      Pay Salary
                    </button>
                  ` : `
                    <span class="badge badge-neutral" title="Journal Entry #${r.journal_entry_id || '-'}">JE #${r.journal_entry_id || 'Recorded'}</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    recordsContainer.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--color-danger);">${err.message}</div>`;
  }
}

async function showCreateSalaryModal() {
  try {
    const staffRes = await API.get('/staff?status=active');
    const staffList = staffRes.staff || [];

    if (staffList.length === 0) {
      showToast('Please add active staff members first in the Staff Directory.', 'warning');
      State.setView('staff');
      return;
    }

    const content = `
      <form id="create-salary-form" onsubmit="event.preventDefault(); submitCreateSalary();">
        <div class="form-group">
          <label class="form-label">Select Staff Member *</label>
          <select id="cs-staff-id" class="form-control" onchange="updateSalaryFormWithStaff(this.value)" required>
            <option value="">-- Choose Employee --</option>
            ${staffList.map(s => `
              <option value="${s.id}" data-salary="${s.basic_salary}">
                ${s.full_name} (${s.employee_id}) • ₦${Number(s.basic_salary).toLocaleString()}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Pay Period (Month) *</label>
          <input type="month" id="cs-period" class="form-control" value="${payrollSelectedPeriod}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Basic Salary (₦) *</label>
            <input type="number" step="0.01" min="0" id="cs-basic" class="form-control" oninput="recalcSalaryNet()" required>
          </div>
          <div class="form-group">
            <label class="form-label">Allowances (₦)</label>
            <input type="number" step="0.01" min="0" id="cs-allowances" class="form-control" value="0" oninput="recalcSalaryNet()">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Deductions (₦)</label>
          <input type="number" step="0.01" min="0" id="cs-deductions" class="form-control" value="0" oninput="recalcSalaryNet()">
          <small style="color: var(--text-muted); font-size: 0.75rem;">Custom loan repayments, advances, or penalties.</small>
        </div>

        <div style="padding: 16px; background: var(--blue-subtle); border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--blue-light);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 750; color: var(--navy-dark);">Calculated Net Salary:</span>
            <span id="cs-net-display" style="font-size: 1.3rem; font-weight: 850; color: var(--blue-primary);">₦0.00</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
            Formula: Basic + Allowances - Deductions = Net Payout
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notes</label>
          <input type="text" id="cs-notes" class="form-control" placeholder="e.g. Performance bonus included">
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="submitCreateSalary()">Save Salary Record</button>
    `;

    openModal('Process Staff Salary', content, footer);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateSalaryFormWithStaff(staffId) {
  const select = document.getElementById('cs-staff-id');
  const selectedOption = select.options[select.selectedIndex];
  const salary = selectedOption.getAttribute('data-salary') || 0;
  const basicInput = document.getElementById('cs-basic');
  if (basicInput) {
    basicInput.value = salary;
    recalcSalaryNet();
  }
}

function recalcSalaryNet() {
  const basic = Number(document.getElementById('cs-basic')?.value) || 0;
  const allowances = Number(document.getElementById('cs-allowances')?.value) || 0;
  const deductions = Number(document.getElementById('cs-deductions')?.value) || 0;
  const net = Math.max(0, basic + allowances - deductions);

  const display = document.getElementById('cs-net-display');
  if (display) {
    display.textContent = `₦${net.toLocaleString()}`;
  }
}

async function submitCreateSalary() {
  const staff_id = document.getElementById('cs-staff-id').value;
  const pay_period = document.getElementById('cs-period').value;
  const basic_salary = Number(document.getElementById('cs-basic').value) || 0;
  const allowances = Number(document.getElementById('cs-allowances').value) || 0;
  const deductions = Number(document.getElementById('cs-deductions').value) || 0;
  const notes = document.getElementById('cs-notes').value;

  if (!staff_id || !pay_period) {
    showToast('Please select staff member and pay period.', 'error');
    return;
  }

  try {
    await API.post('/payroll/records', {
      staff_id,
      pay_period,
      basic_salary,
      allowances,
      deductions,
      notes
    });

    showToast('Salary record saved successfully!', 'success');
    closeModal();
    loadPayrollData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showPaySalaryModal(recordId, staffName, netSalary) {
  const content = `
    <form id="pay-salary-form" onsubmit="event.preventDefault(); submitPaySalary(${recordId});">
      <div style="padding: 16px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; margin-bottom: 18px;">
        <div style="font-size: 0.82rem; color: #166534; font-weight: 700; text-transform: uppercase;">Payment Summary</div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 6px;">
          <span style="font-weight: 800; font-size: 1.1rem; color: var(--navy-dark);">${staffName}</span>
          <span style="font-size: 1.4rem; font-weight: 850; color: var(--color-success);">₦${Number(netSalary).toLocaleString()}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method *</label>
        <select id="ps-method" class="form-control" required>
          <option value="bank_transfer">Bank Transfer (Account 1020)</option>
          <option value="cash">Cash on Hand (Account 1010)</option>
          <option value="pos">POS Account (Account 1030)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Reference / Transaction ID</label>
        <input type="text" id="ps-reference" class="form-control" placeholder="e.g. TRF-202609-001 or Cheque #">
      </div>

      <div class="form-group">
        <label class="form-label">Payment Date *</label>
        <input type="date" id="ps-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <input type="text" id="ps-notes" class="form-control" placeholder="Salary transfer note">
      </div>

      <!-- Financial Accounting Integration Notice (Requirement 22) -->
      <div style="padding: 12px; background: var(--blue-subtle); border-radius: 8px; font-size: 0.78rem; color: var(--navy-muted); border: 1px dashed var(--border-color);">
        <strong style="color: var(--blue-primary);">⚡ Double-Entry Accounting Notice:</strong><br>
        Executing this payment automatically records a journal entry debiting <strong>Salaries & Wages Expense (6040)</strong> and crediting your selected cash/bank asset account. This payout will immediately reflect on your Profit & Loss statement.
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitPaySalary(${recordId})">Confirm & Execute Payout</button>
  `;

  openModal('Execute Salary Payment', content, footer);
}

async function submitPaySalary(recordId) {
  const payment_method = document.getElementById('ps-method').value;
  const payment_reference = document.getElementById('ps-reference').value;
  const payment_date = document.getElementById('ps-date').value;
  const notes = document.getElementById('ps-notes').value;

  try {
    const res = await API.post(`/payroll/records/${recordId}/pay`, {
      payment_method,
      payment_reference,
      payment_date,
      notes
    });

    showToast(res.message || 'Salary payment executed successfully!', 'success');
    closeModal();
    loadPayrollData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
