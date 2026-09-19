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
