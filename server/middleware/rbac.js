/**
 * Role-Based Access Control Middleware
 * Roles: owner > admin > manager > accountant > cashier > staff
 */

const ROLE_HIERARCHY = {
  owner: 60,
  admin: 50,
  manager: 40,
  accountant: 30,
  cashier: 20,
  staff: 10
};

/**
 * Requires the user to have at least one of the allowed roles
 */
function requireRoles(...allowedRolesOrPerms) {
  return (req, res, next) => {
    if (!req.business || !req.business.role) {
      return res.status(403).json({ success: false, error: 'Forbidden: No business context established' });
    }

    const userRole = req.business.role.toLowerCase();
    const permissions = Array.isArray(req.business.permissions) ? req.business.permissions : [];

    // Owner always has access
    if (userRole === 'owner') {
      return next();
    }

    // Role check
    if (allowedRolesOrPerms.includes(userRole)) {
      return next();
    }

    // Explicit permission checks (e.g. 'all', or matching allowed role/permission)
    if (permissions.includes('all') || permissions.some(p => allowedRolesOrPerms.includes(p))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Action requires one of [${allowedRolesOrPerms.join(', ')}] permissions. Current role: ${userRole}`
    });
  };
}

module.exports = { requireRoles, ROLE_HIERARCHY };
