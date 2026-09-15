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
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.business || !req.business.role) {
      return res.status(403).json({ success: false, error: 'Forbidden: No business context established' });
    }

    const userRole = req.business.role.toLowerCase();

    // Owner always has access
    if (userRole === 'owner') {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Action requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${userRole}`
    });
  };
}

module.exports = { requireRoles, ROLE_HIERARCHY };
