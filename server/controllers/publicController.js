const db = require('../config/database');
const SubscriptionService = require('../services/subscriptionService');

class PublicController {
  /**
   * Publicly accessible plans for marketing & pricing pages
   */
  static getPlans(req, res) {
    try {
      const plans = SubscriptionService.getAllPlans();
      return res.json({ success: true, plans });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch plans: ' + err.message });
    }
  }

  /**
   * Submit Contact Form (Requirement 23)
   */
  static submitContact(req, res) {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Please provide your full name.' });
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }

      if (!message || message.trim().length < 5) {
        return res.status(400).json({ success: false, error: 'Please enter a message with at least 5 characters.' });
      }

      const stmt = db.prepare(`
        INSERT INTO contact_submissions (name, email, subject, message, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        name.trim(),
        email.trim(),
        subject ? subject.trim() : 'General Inquiry',
        message.trim(),
        req.ip || '127.0.0.1'
      );

      return res.status(201).json({
        success: true,
        message: 'Thank you for reaching out to BizFlow! Our support team has received your message and will respond promptly.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Contact submission failed: ' + err.message });
    }
  }
}

module.exports = PublicController;
