// aron/middleware/auth-gate.js
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();

    // Accept header-injected user for dev/test flows
  if (req.user) return next();
  
  const wantsJson = req.xhr
    || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1)
    || req.path.startsWith('/api/')
    || req.headers['x-requested-with'] === 'XMLHttpRequest';

  if (wantsJson) return res.status(401).json({ error: 'Unauthorized' });

  return res.redirect('/login.html');
}

function ensureRole(role) {
  return function(req,res,next){
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// dev helper: accept x-recruiter-id / x-candidate-id for API testing
function attachUserFromHeader(req, res, next) {
  const rid = req.header('x-recruiter-id');
  const cid = req.header('x-candidate-id');

  if (rid) {
    req.user = { _id: rid, role: 'recruiter' };
  } else if (cid) {
    req.user = { _id: cid, role: 'candidate' };
  }
  return next();
}

module.exports = {attachUserFromHeader, ensureAuthenticated, ensureRole };
