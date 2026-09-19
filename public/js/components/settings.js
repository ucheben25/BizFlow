/**
 * BizBook Settings, Team Roles, and Audit Trail Component
 */

let activeSettingsTab = 'business';

async function renderSettings() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Settings & Team';

  container.innerHTML = `
    <div style="margin-bottom: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
      <button class="btn ${activeSettingsTab === 'business' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchSettingsTab('business')">Business Profile</button>
      <button class="btn ${activeSettingsTab === 'team' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchSettingsTab('team')">Team & Roles</button>
      <button class="btn ${activeSettingsTab === 'accounts' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchSettingsTab('accounts')">Chart of Accounts</button>
      <button class="btn ${activeSettingsTab === 'audit' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchSettingsTab('audit')">Audit Trail</button>
      <button class="btn ${activeSettingsTab === 'user' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchSettingsTab('user')">User Security</button>
    </div>

    <div id="settings-content-body">
      <!-- Active tab content -->
    </div>
  `;

  loadActiveSettingsContent();
}

function switchSettingsTab(tab) {
  activeSettingsTab = tab;
  renderSettings();
}

async function loadActiveSettingsContent() {
  const container = document.getElementById('settings-content-body');
  container.innerHTML = `<div style="text-align: center; padding: 40px; color: #0A58CA;">Loading settings...</div>`;

  try {
    if (activeSettingsTab === 'business') {
      const data = await API.get('/businesses/current');
      const b = data.business;

      container.innerHTML = `
        <div class="card" style="max-width: 800px;">
          <div class="card-header">
            <div>
              <div class="card-title">Business Information & Preferences</div>
              <div class="card-subtitle">Global settings applied to invoices and inventory controls</div>
            </div>
          </div>

          <form onsubmit="event.preventDefault(); submitBusinessUpdate();">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Business Name *</label>
                <input type="text" id="set-biz-name" class="form-control" value="${b.name || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Business Type / Industry *</label>
                <input type="text" id="set-biz-type" class="form-control" value="${b.business_type || ''}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Official Phone</label>
                <input type="tel" id="set-biz-phone" class="form-control" value="${b.phone || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Official Email</label>
                <input type="email" id="set-biz-email" class="form-control" value="${b.email || ''}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Physical Street Address</label>
              <input type="text" id="set-biz-address" class="form-control" value="${b.address || ''}">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">City / LGA</label>
                <input type="text" id="set-biz-city" class="form-control" value="${b.city || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">State</label>
                <input type="text" id="set-biz-state" class="form-control" value="${b.state || ''}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Base Currency</label>
                <select id="set-biz-currency" class="form-control">
                  <option value="NGN" ${b.currency === 'NGN' ? 'selected' : ''}>NGN - Nigerian Naira (₦)</option>
                  <option value="USD" ${b.currency === 'USD' ? 'selected' : ''}>USD - US Dollar ($)</option>
                  <option value="GBP" ${b.currency === 'GBP' ? 'selected' : ''}>GBP - British Pound (£)</option>
                  <option value="GHS" ${b.currency === 'GHS' ? 'selected' : ''}>GHS - Ghanaian Cedi (₵)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Inventory Policy</label>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                  <input type="checkbox" id="set-biz-neg-stock" style="width: 18px; height: 18px;" ${b.allow_negative_stock ? 'checked' : ''}>
                  <label for="set-biz-neg-stock" style="font-size: 0.88rem; font-weight: 600; cursor: pointer;">
                    Allow Negative Inventory (Sales when stock is 0)
                  </label>
                </div>
              </div>
            </div>

            <div style="margin-top: 20px;">
              <button type="submit" class="btn btn-primary">Save Business Settings</button>
            </div>
          </form>
        </div>
      `;
    } else if (activeSettingsTab === 'team') {
      const data = await API.get('/businesses/current');
      const members = data.members || [];

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Business Team & Role Permissions</div>
              <div class="card-subtitle">Owners, Managers, Accountants, Cashiers, and Staff</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="showAddTeamMemberModal()">+ Add Member</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${members.map(m => `
                  <tr>
                    <td style="font-weight: 750; color: var(--navy-dark);">${m.full_name}</td>
                    <td>${m.email}</td>
                    <td><span class="badge ${m.role === 'owner' ? 'badge-primary' : 'badge-neutral'}">${m.role}</span></td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">
                      ${m.role === 'owner' ? 'Full Access' : (m.role === 'cashier' ? 'POS Sales & Customer Payments' : 'Role-based Access')}
                    </td>
                    <td>${formatDate(m.created_at)}</td>
                    <td>
                      ${m.role !== 'owner' ? `
                        <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="removeTeamMember(${m.id}, '${m.full_name}')">Remove</button>
                      ` : '<span style="font-size: 0.78rem; color: var(--text-muted);">Primary Owner</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeSettingsTab === 'accounts') {
      const data = await API.get('/accounts');
      const accounts = data.accounts || [];

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Chart of Accounts (Double-Entry Engine)</div>
              <div class="card-subtitle">Standardized classification of assets, liabilities, equity, revenue, and expenses</div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th>Sub-type</th>
                  <th>System Managed</th>
                </tr>
              </thead>
              <tbody>
                ${accounts.map(a => `
                  <tr>
                    <td style="font-weight: 750; color: var(--blue-primary);">${a.code}</td>
                    <td style="font-weight: 600;">${a.name}</td>
                    <td style="text-transform: capitalize;"><span class="badge badge-info">${a.type}</span></td>
                    <td style="text-transform: capitalize;">${a.sub_type}</td>
                    <td><span class="badge badge-success">Permanent</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeSettingsTab === 'audit') {
      const data = await API.get('/audit?limit=100');
      const logs = data.logs || [];

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">System Audit Trail</div>
              <div class="card-subtitle">Permanent, tamper-evident record of all logins, transactions, stock adjustments, and configuration changes</div>
            </div>
          </div>

          ${logs.length === 0 ? `
            <p style="text-align: center; padding: 40px; color: var(--text-muted);">No audit events recorded yet.</p>
          ` : `
            <div class="table-responsive">
              <table class="data-table" style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${logs.map(l => `
                    <tr>
                      <td style="white-space: nowrap; font-size: 0.78rem;">${formatDate(l.created_at)}</td>
                      <td style="font-weight: 600;">${l.user_name || 'System'}</td>
                      <td><span class="badge badge-neutral">${l.action}</span></td>
                      <td style="font-weight: 600;">${l.entity}</td>
                      <td style="font-size: 0.78rem; color: var(--text-secondary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${l.new_values || '-'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    } else if (activeSettingsTab === 'user') {
      container.innerHTML = `
        <div class="card" style="max-width: 600px;">
          <div class="card-header">
            <div>
              <div class="card-title">User Profile & Password</div>
              <div class="card-subtitle">Manage your credentials and login security</div>
            </div>
          </div>

          <form onsubmit="event.preventDefault(); submitChangePassword();">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="usr-name" class="form-control" value="${State.user ? State.user.full_name : ''}">
            </div>

            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" id="usr-old-pw" class="form-control" placeholder="••••••••" required>
            </div>

            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" id="usr-new-pw" class="form-control" placeholder="At least 6 characters" required>
            </div>

            <button type="submit" class="btn btn-primary">Update Password</button>
          </form>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--color-danger); font-weight: 700;">Failed to load settings: ${err.message}</p>
      </div>
    `;
  }
}

async function submitBusinessUpdate() {
  const name = document.getElementById('set-biz-name').value;
  const business_type = document.getElementById('set-biz-type').value;
  const phone = document.getElementById('set-biz-phone').value;
  const email = document.getElementById('set-biz-email').value;
  const address = document.getElementById('set-biz-address').value;
  const city = document.getElementById('set-biz-city').value;
  const state = document.getElementById('set-biz-state').value;
  const currency = document.getElementById('set-biz-currency').value;
  const allow_negative_stock = document.getElementById('set-biz-neg-stock').checked;

  const symbolMap = { NGN: '₦', USD: '$', GBP: '£', GHS: '₵' };

  try {
    const res = await API.put('/businesses/current', {
      name,
      business_type,
      phone,
      email,
      address,
      city,
      state,
      currency,
      currency_symbol: symbolMap[currency] || '₦',
      allow_negative_stock
    });

    showToast('Business preferences updated successfully.', 'success');
    State.currentBusiness = res.business;
    renderAppShell();
    renderSettings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showAddTeamMemberModal() {
  const content = `
    <form id="add-member-form" onsubmit="event.preventDefault(); submitAddTeamMember();">
      <div class="form-group">
        <label class="form-label">Registered User Email *</label>
        <input type="email" id="team-email" class="form-control" placeholder="colleague@example.com" required>
        <small style="color: var(--text-muted); font-size: 0.75rem;">The user must have registered an account on BizBook first.</small>
      </div>

      <div class="form-group">
        <label class="form-label">Assigned Role</label>
        <select id="team-role" class="form-control">
          <option value="cashier">Cashier (Create sales & record customer payments)</option>
          <option value="manager">Manager (Sales, purchases, inventory, expenses)</option>
          <option value="accountant">Accountant (Reports, P&L, journal entries, expenses)</option>
          <option value="admin">Admin (Full operations except business ownership transfer)</option>
          <option value="staff">Staff (View catalog & create sales)</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitAddTeamMember()">Add Team Member</button>
  `;

  openModal('Add Team Member to Business', content, footer);
}

async function submitAddTeamMember() {
  const email = document.getElementById('team-email').value;
  const role = document.getElementById('team-role').value;

  try {
    await API.post('/businesses/members', { email, role });
    showToast(`Added ${email} to business.`, 'success');
    closeModal();
    loadActiveSettingsContent();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeTeamMember(memberId, name) {
  if (!confirm(`Are you sure you want to revoke business access for ${name}?`)) return;

  try {
    await API.delete(`/businesses/members/${memberId}`);
    showToast(`Removed ${name} from business.`, 'info');
    loadActiveSettingsContent();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitChangePassword() {
  const currentPassword = document.getElementById('usr-old-pw').value;
  const newPassword = document.getElementById('usr-new-pw').value;

  try {
    await API.put('/auth/password', { currentPassword, newPassword });
    showToast('Password changed successfully.', 'success');
    document.getElementById('usr-old-pw').value = '';
    document.getElementById('usr-new-pw').value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}
