const db = require('../config/database');
const SubscriptionService = require('../services/subscriptionService');

class SubscriptionController {
  static getPlans(req, res) {
    try {
      const plans = SubscriptionService.getAllPlans();
      return res.json({ success: true, plans });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch plans: ' + err.message });
    }
  }

  static getCurrentSubscription(req, res) {
    try {
      const subscription = SubscriptionService.getCurrentSubscription(req.business.id);
      return res.json({ success: true, subscription });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch subscription: ' + err.message });
    }
  }

  static async initializePayment(req, res) {
    try {
      const { plan_id } = req.body;
      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required.' });
      }

      const result = await SubscriptionService.initializeSubscription(
        req.business.id,
        req.user.id,
        plan_id,
        req.user.email
      );

      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async verifyPayment(req, res) {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ success: false, error: 'Reference is required.' });
      }

      const subscription = await SubscriptionService.verifySubscriptionPayment(
        req.business.id,
        req.user.id,
        reference
      );

      return res.json({
        success: true,
        message: 'Subscription successfully activated!',
        subscription
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async upgrade(req, res) {
    try {
      const { plan_id, plan_code } = req.body;
      let plan;
      if (plan_id) {
        plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id);
      } else if (plan_code) {
        plan = db.prepare('SELECT * FROM plans WHERE LOWER(slug) = LOWER(?) OR LOWER(name) LIKE ?').get(plan_code, `%${plan_code}%`);
      } else {
        plan = db.prepare('SELECT * FROM plans ORDER BY id DESC LIMIT 1').get();
      }

      if (!plan) {
        return res.status(404).json({ success: false, error: 'Plan not found.' });
      }

      // Update or insert subscription record
      let sub = db.prepare('SELECT * FROM subscriptions WHERE business_id = ? ORDER BY id DESC LIMIT 1').get(req.business.id);
      if (sub) {
        db.prepare(`
          UPDATE subscriptions
          SET plan_id = ?, amount = ?, max_users = ?, status = 'active',
              current_period_start = CURRENT_TIMESTAMP, current_period_end = datetime('now', '+30 days'),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(plan.id, plan.price, plan.max_users, sub.id);
      } else {
        db.prepare(`
          INSERT INTO subscriptions (
            business_id, plan_id, status, amount, currency, max_users, billing_interval,
            provider, provider_reference, started_at, current_period_start, current_period_end
          ) VALUES (?, ?, 'active', ?, ?, ?, 'monthly', 'evaluation', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, datetime('now', '+30 days'))
        `).run(req.business.id, plan.id, plan.price, plan.currency, plan.max_users, `UPG-${Date.now()}`);
      }

      const updatedSub = SubscriptionService.getCurrentSubscription(req.business.id);
      return res.json({
        success: true,
        message: `Plan updated to ${plan.name}.`,
        subscription: updatedSub
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update plan: ' + err.message });
    }
  }

  static cancel(req, res) {
    try {
      const result = SubscriptionService.cancelSubscription(req.business.id, req.user.id);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static webhook(req, res) {
    // Paystack Webhook Receiver
    try {
      const event = req.body;
      console.log('[Paystack Webhook] Received event:', event ? event.event : 'null');
      return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      return res.status(400).send('Webhook Error: ' + err.message);
    }
  }
}

module.exports = SubscriptionController;
