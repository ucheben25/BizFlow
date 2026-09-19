/**
 * BizBook Subscription & Plan Management Component
 * Requirements 9, 10, 31, 32, 33, 34
 */

async function renderSubscription() {
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Subscription & Billing';

  container.innerHTML = `
    <div id="subscription-content">
      <div style="text-align: center; padding: 40px; color: var(--blue-primary);">Loading subscription status...</div>
    </div>
  `;

  loadSubscriptionDetails();
}

async function loadSubscriptionDetails() {
  const container = document.getElementById('subscription-content');
  if (!container) return;

  try {
    const subRes = await API.get('/subscriptions/current');
    const plansRes = await API.get('/subscriptions/plans');

    const s = subRes.subscription;
    const plans = plansRes.plans || [];

    container.innerHTML = `
      <!-- Active Subscription Overview Card -->
      <div class="card" style="margin-bottom: 28px;">
        <div class="card-header">
          <div>
            <div class="card-title">Current Subscription Plan</div>
            <div class="card-subtitle">Active tier, billing cycle, and seat quota for your business</div>
          </div>
          <span class="badge ${s.status === 'active' ? 'badge-success' : (s.status === 'pending' ? 'badge-warning' : 'badge-danger')}" style="font-size: 0.85rem; padding: 6px 14px;">
            ${s.status ? s.status.toUpperCase() : 'NO PLAN'}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
          <div style="padding: 16px; background: var(--bg-app); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Plan Tier</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--navy-dark); margin-top: 4px;">${s.planName || 'None'}</div>
            <div style="font-size: 0.82rem; color: var(--blue-primary); font-weight: 600;">₦${Number(s.amount || 0).toLocaleString()} / month</div>
          </div>

          <div style="padding: 16px; background: var(--bg-app); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Team Seat Allocation</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: ${s.activeMembers >= s.maxUsers ? 'var(--color-warning)' : 'var(--navy-dark)'}; margin-top: 4px;">
              ${s.activeMembers} / ${s.maxUsers} Seats
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary);">
              ${s.maxUsers - s.activeMembers} seats remaining
            </div>
          </div>

          <div style="padding: 16px; background: var(--bg-app); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Billing Period</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--navy-dark); margin-top: 4px;">
              ${s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : 'N/A'}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Renewal Date</div>
          </div>

          <div style="padding: 16px; background: var(--bg-app); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Payment Reference</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--navy-dark); margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${s.providerReference || 'Direct/Seed'}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Paystack Gateway</div>
          </div>
        </div>

        ${s.status === 'active' ? `
          <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="confirmCancelSubscription()">
              Cancel Subscription
            </button>
          </div>
        ` : `
          <div style="padding: 14px; background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; color: #92400E; font-weight: 600;">
              Your subscription is inactive or expired. Select a plan below to activate your business.
            </span>
          </div>
        `}
      </div>

      <!-- Upgrade / Change Plan Cards -->
      <h3 style="font-size: 1.25rem; font-weight: 850; color: var(--navy-dark); margin-bottom: 16px;">
        Available Subscription Tiers
      </h3>

      <div class="pricing-grid" style="max-width: 100%;">
        ${plans.map(p => {
          const isCurrent = s.planId === p.id && s.status === 'active';
          return `
            <div class="pricing-card ${p.slug === 'business' ? 'featured' : ''}">
              ${p.slug === 'business' ? '<div class="popular-badge">Recommended</div>' : ''}
              <div class="plan-name">${p.name}</div>
              <div class="plan-desc">${p.description}</div>
              <div class="plan-price-box">
                <span class="plan-amount">₦${Number(p.price).toLocaleString()}</span>
                <span class="plan-interval">/ month</span>
              </div>
              <div class="plan-seats-badge">Up to ${p.max_users} Active Users</div>

              <ul class="plan-features-list">
                ${p.features.map(f => `
                  <li>
                    <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    ${f}
                  </li>
                `).join('')}
              </ul>

              ${isCurrent ? `
                <button class="btn btn-secondary btn-block" disabled style="padding: 12px; font-weight: 800;">
                  ✓ Current Active Plan
                </button>
              ` : `
                <button class="btn btn-primary btn-block" onclick="startPlanCheckout(${p.id}, '${p.name}', ${p.price})" style="padding: 12px;">
                  ${s.planId ? (p.price > (s.amount || 0) ? 'Upgrade to ' + p.name : 'Switch to ' + p.name) : 'Subscribe to ' + p.name}
                </button>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--color-danger);">${err.message}</div>`;
  }
}

async function startPlanCheckout(planId, planName, planPrice) {
  try {
    showToast('Initializing secure checkout...', 'info');

    const initRes = await API.post('/subscriptions/initialize', { plan_id: planId });

    if (initRes.authorizationUrl) {
      // Live Paystack Redirect URL
      window.location.href = initRes.authorizationUrl;
      return;
    }

    // Modal Simulation / Test Verification Checkout
    const content = `
      <div style="text-align: center; padding: 10px 0;">
        <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--blue-subtle); color: var(--blue-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
          Paystack Secure Checkout
        </h3>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px;">
          Subscribing to <strong>${planName}</strong> for <strong>₦${Number(planPrice).toLocaleString()} / month</strong>.
        </p>

        <div style="padding: 14px; background: #F8FAFC; border-radius: 8px; border: 1px solid var(--border-color); text-align: left; font-size: 0.85rem; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748B;">Transaction Ref:</span>
            <span style="font-weight: 700; color: var(--navy-dark);">${initRes.reference}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748B;">Billing Interval:</span>
            <span style="font-weight: 700;">Monthly Recurring</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Gateway Status:</span>
            <span class="badge badge-success">Ready</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block btn-lg" onclick="verifyPlanPayment('${initRes.reference}')" style="padding: 12px;">
          Authorize & Complete Payment (₦${Number(planPrice).toLocaleString()})
        </button>
      </div>
    `;

    openModal('Checkout with Paystack', content, '');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function verifyPlanPayment(reference) {
  try {
    showToast('Verifying payment with gateway...', 'info');

    const res = await API.post('/subscriptions/verify', { reference });
    showToast(res.message || 'Subscription successfully activated!', 'success');
    closeModal();
    loadSubscriptionDetails();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmCancelSubscription() {
  if (!confirm('Are you sure you want to cancel your subscription? Your business records and historical financial data will remain completely safe, but active operational billing access will be suspended.')) {
    return;
  }

  try {
    const res = await API.post('/subscriptions/cancel');
    showToast(res.message, 'info');
    loadSubscriptionDetails();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showSubscriptionGatedModal(statusMessage) {
  const content = `
    <div style="text-align: center; padding: 16px 0;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: #FFFBEB; color: #D97706; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        <svg style="width: 28px; height: 28px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <h3 style="font-size: 1.3rem; font-weight: 850; color: var(--navy-dark); margin-bottom: 8px;">
        Subscription Activation Required
      </h3>
      <p style="font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
        ${statusMessage || 'An active BizBook subscription is required to access POS, sales, inventory, and financial operations. Please activate or renew your subscription.'}
      </p>

      <button class="btn btn-primary btn-block btn-lg" onclick="closeModal(); State.setView('subscription');">
        Manage Subscription & Select Plan &rarr;
      </button>
    </div>
  `;

  openModal('Subscription Required', content, '');
}
