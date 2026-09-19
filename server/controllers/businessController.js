const db = require('../config/database');
const { seedBusinessDefaults } = require('../database/seedAccounts');
const AuditService = require('../services/auditService');
const SubscriptionService = require('../services/subscriptionService');

class BusinessController {
  static createBusiness(req, res) {
    try {
      const {
        name,
        business_type,
        email,
        phone,
        address,
        city,
        state,
        country = 'Nigeria',
        currency = 'NGN',
        currency_symbol = '₦',
        tax_identification_number,
        allow_negative_stock = 0
      } = req.body;

      if (!name || !business_type) {
        return res.status(400).json({ success: false, error: 'Business name and business type are required.' });
      }

      let businessId;

      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO businesses (
            name, business_type, email, phone, address, city, state,
            country, currency, currency_symbol, tax_identification_number, allow_negative_stock
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          name.trim(),
          business_type.trim(),
          email ? email.trim() : null,
          phone ? phone.trim() : null,
          address ? address.trim() : null,
          city ? city.trim() : null,
          state ? state.trim() : null,
          country,
          currency.toUpperCase(),
          currency_symbol,
          tax_identification_number ? tax_identification_number.trim() : null,
          allow_negative_stock ? 1 : 0
        );

        businessId = result.lastInsertRowid;

        // Assign current user as owner
        db.prepare(`
          INSERT INTO business_members (business_id, user_id, role, permissions)
          VALUES (?, ?, 'owner', '["all"]')
        `).run(businessId, req.user.id);

        // Seed Chart of Accounts, default categories, and walk-in customer
        seedBusinessDefaults(businessId);

        // Create initial subscription for business (Requirement 9 & 11)
        const planId = req.body.plan_id || 1;
        const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) || db.prepare('SELECT * FROM plans LIMIT 1').get();
        const subStatus = req.body.subscription_status || 'pending';
        if (plan) {
          db.prepare(`
            INSERT INTO subscriptions (
              business_id, plan_id, status, amount, currency, max_users, billing_interval,
              provider, provider_reference, started_at, current_period_start, current_period_end
            ) VALUES (?, ?, ?, ?, ?, ?, 'monthly', 'paystack', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, datetime('now', '+30 days'))
          `).run(businessId, plan.id, subStatus, plan.price, plan.currency, plan.max_users, `INIT-${Date.now()}`);
        }

        // Audit log
        AuditService.log({
          businessId,
          userId: req.user.id,
          action: 'CREATE_BUSINESS',
          entity: 'BUSINESS',
          entityId: businessId,
          newValues: { name, business_type, currency },
          ipAddress: req.ip
        });
      })();

      const created = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
      const subscription = SubscriptionService.getCurrentSubscription(businessId);

      return res.status(201).json({
        success: true,
        message: 'Business created and initialized successfully.',
        business: created,
        subscription
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to create business: ' + err.message });
    }
  }

  static getBusinesses(req, res) {
    try {
      const businesses = db.prepare(`
        SELECT b.*, bm.role as user_role,
               COALESCE(s.status, 'none') as subscription_status,
               s.plan_id,
               p.name as plan_name
        FROM business_members bm
        JOIN businesses b ON bm.business_id = b.id
        LEFT JOIN subscriptions s ON b.id = s.business_id
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE bm.user_id = ?
        ORDER BY b.id ASC
      `).all(req.user.id);

      return res.json({ success: true, businesses });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch businesses: ' + err.message });
    }
  }

  static getBusinessDetails(req, res) {
    try {
      const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.business.id);
      const subscription = SubscriptionService.getCurrentSubscription(req.business.id);
      const members = db.prepare(`
        SELECT bm.id, bm.role, bm.created_at, u.id as user_id, u.full_name, u.email, u.phone
        FROM business_members bm
        JOIN users u ON bm.user_id = u.id
        WHERE bm.business_id = ?
        ORDER BY bm.id ASC
      `).all(req.business.id);

      return res.json({ success: true, business, subscription, members });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch business details: ' + err.message });
    }
  }

  static updateBusiness(req, res) {
    try {
      const {
        name,
        business_type,
        email,
        phone,
        address,
        city,
        state,
        country,
        currency,
        currency_symbol,
        tax_identification_number,
        allow_negative_stock,
        reorder_warning_enabled
      } = req.body;

      const current = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.business.id);

      db.prepare(`
        UPDATE businesses
        SET name = COALESCE(?, name),
            business_type = COALESCE(?, business_type),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            country = COALESCE(?, country),
            currency = COALESCE(?, currency),
            currency_symbol = COALESCE(?, currency_symbol),
            tax_identification_number = COALESCE(?, tax_identification_number),
            allow_negative_stock = COALESCE(?, allow_negative_stock),
            reorder_warning_enabled = COALESCE(?, reorder_warning_enabled),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name, business_type, email, phone, address, city, state, country,
        currency, currency_symbol, tax_identification_number,
        allow_negative_stock !== undefined ? (allow_negative_stock ? 1 : 0) : null,
        reorder_warning_enabled !== undefined ? (reorder_warning_enabled ? 1 : 0) : null,
        req.business.id
      );

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'UPDATE_BUSINESS',
        entity: 'BUSINESS',
        entityId: req.business.id,
        oldValues: current,
        newValues: req.body,
        ipAddress: req.ip
      });

      const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.business.id);
      return res.json({ success: true, message: 'Business settings updated.', business: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Update failed: ' + err.message });
    }
  }

  static addMember(req, res) {
    try {
      const { email, role = 'staff' } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'User email is required to add a team member.' });
      }

      const validRoles = ['admin', 'manager', 'accountant', 'cashier', 'staff'];
      if (!validRoles.includes(role.toLowerCase())) {
        return res.status(400).json({ success: false, error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
      }

      const user = db.prepare('SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
      if (!user) {
        return res.status(404).json({ success: false, error: 'No user registered with this email address.' });
      }

      const existingMember = db.prepare('SELECT id FROM business_members WHERE business_id = ? AND user_id = ?').get(req.business.id, user.id);
      if (existingMember) {
        return res.status(409).json({ success: false, error: 'This user is already a member of this business.' });
      }

      // Enforce subscription plan seat limit (Requirement 32)
      const limitCheck = SubscriptionService.checkMemberLimit(req.business.id);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: limitCheck.message,
          limitReached: true,
          maxUsers: limitCheck.maxUsers,
          memberCount: limitCheck.memberCount
        });
      }

      db.prepare(`
        INSERT INTO business_members (business_id, user_id, role, permissions)
        VALUES (?, ?, ?, ?)
      `).run(req.business.id, user.id, role.toLowerCase(), JSON.stringify([]));

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'ADD_MEMBER',
        entity: 'BUSINESS_MEMBER',
        entityId: user.id,
        newValues: { email, role },
        ipAddress: req.ip
      });

      return res.status(201).json({ success: true, message: `Added ${user.full_name} as ${role}.` });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to add member: ' + err.message });
    }
  }

  static updateMemberRole(req, res) {
    try {
      const { memberId } = req.params;
      const { role } = req.body;

      const validRoles = ['admin', 'manager', 'accountant', 'cashier', 'staff'];
      if (!validRoles.includes(role.toLowerCase())) {
        return res.status(400).json({ success: false, error: 'Invalid role.' });
      }

      const member = db.prepare('SELECT * FROM business_members WHERE id = ? AND business_id = ?').get(memberId, req.business.id);
      if (!member) {
        return res.status(404).json({ success: false, error: 'Member not found.' });
      }

      if (member.role === 'owner') {
        return res.status(400).json({ success: false, error: 'Cannot change owner role.' });
      }

      db.prepare('UPDATE business_members SET role = ? WHERE id = ?').run(role.toLowerCase(), memberId);

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'UPDATE_MEMBER_ROLE',
        entity: 'BUSINESS_MEMBER',
        entityId: memberId,
        oldValues: { role: member.role },
        newValues: { role },
        ipAddress: req.ip
      });

      return res.json({ success: true, message: 'Member role updated.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update member: ' + err.message });
    }
  }

  static removeMember(req, res) {
    try {
      const { memberId } = req.params;

      const member = db.prepare('SELECT * FROM business_members WHERE id = ? AND business_id = ?').get(memberId, req.business.id);
      if (!member) {
        return res.status(404).json({ success: false, error: 'Member not found.' });
      }

      if (member.role === 'owner') {
        return res.status(400).json({ success: false, error: 'Cannot remove the business owner.' });
      }

      db.prepare('DELETE FROM business_members WHERE id = ?').run(memberId);

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'REMOVE_MEMBER',
        entity: 'BUSINESS_MEMBER',
        entityId: memberId,
        ipAddress: req.ip
      });

      return res.json({ success: true, message: 'Member removed from business.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to remove member: ' + err.message });
    }
  }
}

module.exports = BusinessController;
