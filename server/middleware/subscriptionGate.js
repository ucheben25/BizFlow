const SubscriptionService = require('../services/subscriptionService');

/**
 * Middleware ensuring the active business has an active subscription (Requirement 30 & 31).
 * If subscription is pending, expired, or cancelled, blocks operational access while preserving data.
 */
function requireActiveSubscription(req, res, next) {
  try {
    if (!req.business || !req.business.id) {
      return res.status(403).json({ success: false, error: 'No business context provided.' });
    }

    const sub = SubscriptionService.getCurrentSubscription(req.business.id);

    if (!sub.canAccessApp) {
      return res.status(402).json({
        success: false,
        subscriptionRequired: true,
        status: sub.status,
        planName: sub.planName,
        isExpired: sub.isExpired,
        error: sub.isExpired
          ? 'Your BizFlow subscription has expired. Please renew your plan to continue accessing business tools.'
          : 'An active subscription is required to access this business. Please complete plan checkout.'
      });
    }

    req.subscription = sub;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Subscription check failed: ' + err.message });
  }
}

module.exports = { requireActiveSubscription };
