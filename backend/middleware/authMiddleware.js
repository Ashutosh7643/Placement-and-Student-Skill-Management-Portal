const User = require('../models/User');
const ApiError = require('../utils/apiError');

/**
 * Verifies that an authenticated session exists and loads the current active user.
 */
async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return next(new ApiError(401, 'Authentication required. Please log in to continue.'));
    }

    const user = await User.findById(req.session.userId).select('-passwordHash');
    if (!user) {
      req.session.destroy(() => {});
      return next(new ApiError(401, 'Session is no longer valid. Please log in again.'));
    }

    if (!user.isActive) {
      return next(new ApiError(403, 'Your account has been deactivated. Contact the placement cell.'));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Restricts route access to users with one of the permitted roles.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. This resource requires ${allowedRoles.join(' or ')} privileges.`)
      );
    }
    return next();
  };
}

/**
 * Protects role-specific HTML pages served by Express before static middleware.
 */
async function protectFrontendPages(req, res, next) {
  const path = req.path || '';
  const isStudentPage = path.startsWith('/pages/student-');
  const isAdminPage = path.startsWith('/pages/admin-') && path !== '/pages/admin-login.html';

  if (!isStudentPage && !isAdminPage) {
    return next();
  }

  if (!req.session || !req.session.userId) {
    const loginTarget = isAdminPage ? '/pages/admin-login.html' : '/pages/login.html';
    return res.redirect(`${loginTarget}?redirect=${encodeURIComponent(path)}`);
  }

  try {
    const user = await User.findById(req.session.userId).select('role isActive');
    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      return res.redirect('/pages/login.html');
    }

    if (isAdminPage && user.role !== 'admin') {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>403 Forbidden - DBUU Placement Portal</title>
        <link rel="stylesheet" href="/css/styles.css"></head>
        <body class="auth-body">
          <div class="auth-card" style="max-width:480px;text-align:center;">
            <h1 style="color:#991b1b;">403 - Access Denied</h1>
            <p class="muted-text" style="margin:12px 0 20px;">Student accounts cannot access Administrator pages.</p>
            <a class="btn btn-primary" href="/pages/student-dashboard.html">Return to Student Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    if (isStudentPage && user.role !== 'student') {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>403 Forbidden - DBUU Placement Portal</title>
        <link rel="stylesheet" href="/css/styles.css"></head>
        <body class="auth-body">
          <div class="auth-card" style="max-width:480px;text-align:center;">
            <h1 style="color:#991b1b;">403 - Access Denied</h1>
            <p class="muted-text" style="margin:12px 0 20px;">Administrator accounts cannot access Student-only pages.</p>
            <a class="btn btn-primary" href="/pages/admin-dashboard.html">Return to Admin Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireAuth,
  requireRole,
  protectFrontendPages,
};
