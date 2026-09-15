const AuditService = require('../services/auditService');

class AuditController {
  static getLogs(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const logs = AuditService.getLogs(req.business.id, Number(limit), Number(offset));
      return res.json({ success: true, logs });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch audit logs: ' + err.message });
    }
  }
}

module.exports = AuditController;
