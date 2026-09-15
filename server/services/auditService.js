const db = require('../config/database');

class AuditService {
  static log({
    businessId,
    userId,
    action,
    entity,
    entityId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null
  }) {
    try {
      const insert = db.prepare(`
        INSERT INTO audit_logs (
          business_id, user_id, action, entity, entity_id,
          old_values, new_values, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        businessId,
        userId,
        action,
        entity,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress
      );
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err.message);
    }
  }

  static getLogs(businessId, limit = 100, offset = 0) {
    return db.prepare(`
      SELECT a.*, u.full_name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.business_id = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(businessId, limit, offset);
  }
}

module.exports = AuditService;
