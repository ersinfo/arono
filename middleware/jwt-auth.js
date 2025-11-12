// middleware/jwt-auth.js  (replace contents)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';

module.exports = function jwtAuth(req, res, next) {
 
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) {
      try {
        const payload = jwt.verify(m[1], JWT_SECRET);
        req.user = req.user || {};
        // accept common id field names
        req.user._id = payload.userId || payload.id || payload._id || req.user._id;
        req.user.role = payload.role || payload.userRole || payload.roles || req.user.role;
        // mark as authenticated for code that uses req.isAuthenticated()
        req.isAuthenticated = req.isAuthenticated || function(){ return true; };
      } catch (e) {
        // invalid token -> leave unauthenticated (downstream middleware will handle)
        // but don't crash
      }
    }
  } catch (e) {
    // defensive
  }

  // legacy header support (keep as before)
  if (!req.user || !req.user._id) {
    if (req.headers['x-candidate-id']) {
      req.user = req.user || {};
      req.user._id = req.headers['x-candidate-id'];
      req.user.role = req.user.role || 'candidate';
    } else if (req.headers['x-recruiter-id']) {
      req.user = req.user || {};
      req.user._id = req.headers['x-recruiter-id'];
      req.user.role = req.user.role || 'recruiter';
    }
  }

  // ensure req.isAuthenticated exists (returns false if not set)
  if (typeof req.isAuthenticated !== 'function') {
    req.isAuthenticated = function(){ return !!(req.user && req.user._id); };
  }

  next();
};
