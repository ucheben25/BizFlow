const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'bizflow_super_secure_jwt_production_secret_key_2026_98371928471';

function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, full_name, phone, role, is_active FROM users WHERE id = ?').get(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'User account not found or disabled.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session. Please login again.' });
  }
}

/**
 * Middleware ensuring user has verified access to the active business.
 * NEVER trusts client-provided business ID without database verification.
 */
function requireBusiness(req, res, next) {
  try {
    const requestedBizId = req.headers['x-business-id'] || req.query.business_id || req.body.business_id;

    let memberQuery = `
      SELECT bm.business_id, bm.role, bm.permissions,
             b.name, b.business_type, b.currency, b.currency_symbol, b.allow_negative_stock
      FROM business_members bm
      JOIN businesses b ON bm.business_id = b.id
      WHERE bm.user_id = ?
    `;

    let member;
    if (requestedBizId) {
      member = db.prepare(memberQuery + ' AND bm.business_id = ?').get(req.user.id, requestedBizId);
    } else {
      // Default to first business membership
      member = db.prepare(memberQuery + ' ORDER BY bm.id ASC LIMIT 1').get(req.user.id);
    }

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not belong to this business or no business was found.'
      });
    }

    req.business = {
      id: member.business_id,
      name: member.name,
      businessType: member.business_type,
      currency: member.currency,
      currencySymbol: member.currency_symbol,
      allowNegativeStock: !!member.allow_negative_stock,
      role: member.role,
      permissions: member.permissions ? JSON.parse(member.permissions) : []
    };

    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to resolve business context: ' + err.message });
  }
}

module.exports = { authenticate, requireBusiness, JWT_SECRET };
