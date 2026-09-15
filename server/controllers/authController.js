const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const AuditService = require('../services/auditService');

class AuthController {
  static register(req, res) {
    try {
      const { email, password, full_name, phone } = req.body;

      if (!email || !password || !full_name) {
        return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
      if (existing) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      }

      const salt = bcrypt.genSaltSync(12);
      const password_hash = bcrypt.hashSync(password, salt);

      const result = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, phone)
        VALUES (?, ?, ?, ?)
      `).run(email.trim().toLowerCase(), password_hash, full_name.trim(), phone ? phone.trim() : null);

      const userId = result.lastInsertRowid;
      const user = { id: userId, email: email.trim().toLowerCase(), full_name: full_name.trim(), phone };

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        token,
        user,
        businesses: []
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
    }
  }

  static login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
      if (!user || !user.is_active) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      const isValid = bcrypt.compareSync(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      // Fetch businesses this user belongs to
      const businesses = db.prepare(`
        SELECT b.id, b.name, b.business_type, b.currency, b.currency_symbol, bm.role, bm.permissions
        FROM business_members bm
        JOIN businesses b ON bm.business_id = b.id
        WHERE bm.user_id = ?
        ORDER BY bm.id ASC
      `).all(user.id);

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      // Log login action
      if (businesses.length > 0) {
        AuditService.log({
          businessId: businesses[0].id,
          userId: user.id,
          action: 'LOGIN',
          entity: 'USER',
          entityId: user.id,
          ipAddress: req.ip
        });
      }

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role
        },
        businesses
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Login failed: ' + err.message });
    }
  }

  static me(req, res) {
    try {
      const user = db.prepare('SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
      const businesses = db.prepare(`
        SELECT b.id, b.name, b.business_type, b.currency, b.currency_symbol, bm.role, bm.permissions
        FROM business_members bm
        JOIN businesses b ON bm.business_id = b.id
        WHERE bm.user_id = ?
      `).all(req.user.id);

      return res.json({
        success: true,
        user,
        businesses
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve profile: ' + err.message });
    }
  }

  static updateProfile(req, res) {
    try {
      const { full_name, phone } = req.body;
      if (!full_name) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }

      db.prepare(`
        UPDATE users
        SET full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(full_name.trim(), phone ? phone.trim() : null, req.user.id);

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: { id: req.user.id, email: req.user.email, full_name, phone }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Profile update failed: ' + err.message });
    }
  }

  static changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Current and new password are required.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
      }

      const salt = bcrypt.genSaltSync(12);
      const newHash = bcrypt.hashSync(newPassword, salt);

      db.prepare(`
        UPDATE users
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newHash, req.user.id);

      return res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Password change failed: ' + err.message });
    }
  }
}

module.exports = AuthController;
