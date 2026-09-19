/**
 * BizBook Staff Management Component
 * Requirements 15, 20, 21
 */

let staffSearchTerm = '';
let staffStatusFilter = '';

async function renderStaff() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Staff Management';

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Employee Directory & Compensation</div>
          <div class="card-subtitle">Manage staff records, positions, departments, and basic salary structures</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="showAddStaffModal()">+ Add Employee</button>
      </div>

      <!-- Filters & Search Bar -->
      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 240px;">
          <input type="text" class="form-control" placeholder="Search by name, employee ID, position..." 
                 value="${staffSearchTerm}" oninput="handleStaffSearch(this.value)">
        </div>
        <div style="width: 180px;">
          <select class="form-control" onchange="handleStaffStatusFilter(this.value)">
            <option value="" ${staffStatusFilter === '' ? 'selected' : ''}>All Statuses</option>
            <option value="active" ${staffStatusFilter === 'active' ? 'selected' : ''}>Active</option>
            <option value="on_leave" ${staffStatusFilter === 'on_leave' ? 'selected' : ''}>On Leave</option>
            <option value="archived" ${staffStatusFilter === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
        </div>
      </div>

      <!-- Staff Table Container -->
      <div id="staff-table-container">
        <div style="text-align: center; padding: 40px; color: var(--blue-primary);">Loading staff directory...</div>
      </div>
    </div>
  `;

  loadStaffList();
}

function handleStaffSearch(val) {
  staffSearchTerm = val;
  loadStaffList();
}

function handleStaffStatusFilter(val) {
  staffStatusFilter = val;
  loadStaffList();
}

async function loadStaffList() {
  const container = document.getElementById('staff-table-container');
  if (!container) return;

  try {
    let url = `/staff?search=${encodeURIComponent(staffSearchTerm)}`;
    if (staffStatusFilter) url += `&status=${encodeURIComponent(staffStatusFilter)}`;

    const data = await API.get(url);
    const staffList = data.staff || [];

    if (staffList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div class="empty-state-title">No Staff Members Found</div>
          <div class="empty-state-desc">Add employees to track positions, assign monthly salaries, and manage company payroll.</div>
          <button class="btn btn-primary btn-sm" onclick="showAddStaffModal()">+ Add First Staff</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Full Name</th>
              <th>Position & Dept</th>
              <th>Contact Info</th>
              <th>Basic Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${staffList.map(s => `
              <tr>
                <td style="font-weight: 750; color: var(--blue-primary); font-size: 0.85rem;">${s.employee_id}</td>
                <td style="font-weight: 700; color: var(--navy-dark);">${s.full_name}</td>
                <td>
                  <div style="font-weight: 600;">${s.position}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${s.department || 'General'}</div>
                </td>
                <td>
                  <div style="font-size: 0.85rem;">${s.phone || '-'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${s.email || '-'}</div>
                </td>
                <td style="font-weight: 750; color: var(--navy-dark);">₦${Number(s.basic_salary).toLocaleString()}</td>
                <td>
                  <span class="badge ${s.employment_status === 'active' ? 'badge-success' : (s.employment_status === 'archived' ? 'badge-danger' : 'badge-neutral')}">
                    ${s.employment_status}
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" onclick="showEditStaffModal(${s.id})">Edit</button>
                    ${s.employment_status !== 'archived' ? `
                      <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="archiveStaffMember(${s.id}, '${s.full_name}')">Archive</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--color-danger);">${err.message}</div>`;
  }
}

function showAddStaffModal() {
  const content = `
    <form id="add-staff-form" onsubmit="event.preventDefault(); submitCreateStaff();">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input type="text" id="as-name" class="form-control" placeholder="e.g. Chidi Nwosu" required>
        </div>
        <div class="form-group">
          <label class="form-label">Employee ID (optional)</label>
          <input type="text" id="as-id" class="form-control" placeholder="Auto-generated if blank">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Position / Job Title *</label>
          <input type="text" id="as-position" class="form-control" placeholder="e.g. Sales Cashier, Store Keeper" required>
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <input type="text" id="as-dept" class="form-control" placeholder="e.g. Sales, Warehouse, Logistics">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" id="as-phone" class="form-control" placeholder="0803 123 4567">
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="as-email" class="form-control" placeholder="staff@business.com">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Basic Monthly Salary (₦) *</label>
          <input type="number" step="0.01" min="0" id="as-salary" class="form-control" placeholder="150000" required>
        </div>
        <div class="form-group">
          <label class="form-label">Employment Date</label>
          <input type="date" id="as-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Notes / Contract Details</label>
        <textarea id="as-notes" class="form-control" rows="2" placeholder="Guarantor details, probation terms..."></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitCreateStaff()">Save Employee</button>
  `;

  openModal('Add New Employee', content, footer);
}

async function submitCreateStaff() {
  const full_name = document.getElementById('as-name').value;
  const employee_id = document.getElementById('as-id').value;
  const position = document.getElementById('as-position').value;
  const department = document.getElementById('as-dept').value;
  const phone = document.getElementById('as-phone').value;
  const email = document.getElementById('as-email').value;
  const basic_salary = Number(document.getElementById('as-salary').value) || 0;
  const employment_date = document.getElementById('as-date').value;
  const notes = document.getElementById('as-notes').value;

  if (!full_name || !position) {
    showToast('Name and position are required.', 'error');
    return;
  }

  try {
    await API.post('/staff', {
      full_name,
      employee_id: employee_id || undefined,
      position,
      department,
      phone,
      email,
      basic_salary,
      employment_date,
      notes
    });

    showToast(`Staff member "${full_name}" registered!`, 'success');
    closeModal();
    loadStaffList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showEditStaffModal(staffId) {
  try {
    const data = await API.get(`/staff/${staffId}`);
    const s = data.staff;

    const content = `
      <form id="edit-staff-form" onsubmit="event.preventDefault(); submitUpdateStaff(${s.id});">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="es-name" class="form-control" value="${s.full_name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Position *</label>
            <input type="text" id="es-position" class="form-control" value="${s.position}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Department</label>
            <input type="text" id="es-dept" class="form-control" value="${s.department || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="es-status" class="form-control">
              <option value="active" ${s.employment_status === 'active' ? 'selected' : ''}>Active</option>
              <option value="on_leave" ${s.employment_status === 'on_leave' ? 'selected' : ''}>On Leave</option>
              <option value="archived" ${s.employment_status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" id="es-phone" class="form-control" value="${s.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="es-email" class="form-control" value="${s.email || ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Basic Salary (₦) *</label>
          <input type="number" step="0.01" min="0" id="es-salary" class="form-control" value="${s.basic_salary}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="es-notes" class="form-control" rows="2">${s.notes || ''}</textarea>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="submitUpdateStaff(${s.id})">Save Changes</button>
    `;

    openModal(`Edit Employee: ${s.full_name}`, content, footer);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitUpdateStaff(staffId) {
  const full_name = document.getElementById('es-name').value;
  const position = document.getElementById('es-position').value;
  const department = document.getElementById('es-dept').value;
  const employment_status = document.getElementById('es-status').value;
  const phone = document.getElementById('es-phone').value;
  const email = document.getElementById('es-email').value;
  const basic_salary = Number(document.getElementById('es-salary').value) || 0;
  const notes = document.getElementById('es-notes').value;

  try {
    await API.put(`/staff/${staffId}`, {
      full_name,
      position,
      department,
      employment_status,
      phone,
      email,
      basic_salary,
      notes
    });

    showToast('Employee details updated!', 'success');
    closeModal();
    loadStaffList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function archiveStaffMember(staffId, staffName) {
  if (!confirm(`Are you sure you want to archive ${staffName}? They will be marked as inactive and removed from active payroll calculations.`)) {
    return;
  }

  try {
    await API.delete(`/staff/${staffId}`);
    showToast(`${staffName} archived.`, 'info');
    loadStaffList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
