// config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const MAX_FAILED = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

passport.use(new LocalStrategy({ usernameField: 'email', passReqToCallback: true },
  async (req, email, password, done) => {
    try {
      const emailNorm = typeof email === 'string' ? email.toLowerCase().trim() : '';
      const roleFromForm = req.body && req.body.role ? String(req.body.role).toLowerCase().trim() : null;

      // Debug (temporary) - remove or comment out in production
      console.log('[passport] login attempt:', { email: emailNorm, roleFromForm });

      const user = await User.findOne({ email: emailNorm });
      console.log('[passport] found user?:', !!user, user ? { id: user._id, role: user.role } : null);

      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      if (roleFromForm && user.role && String(user.role).toLowerCase().trim() !== roleFromForm) {
        return done(null, false, { message: 'No account found for this role. Choose correct role.' });
      }

      if (user.lockUntil && user.lockUntil > Date.now()) {
        const retryTime = new Date(user.lockUntil).toLocaleString();
        return done(null, false, { message: `Account locked. Try again after ${retryTime}` });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= MAX_FAILED) {
          user.lockUntil = Date.now() + LOCK_TIME;
          user.failedLoginAttempts = 0;
        }
        try { await user.save(); } catch (e) { console.error('save err after failed login', e); }
        return done(null, false, { message: 'Invalid email or password' });
      }

      // successful login — reset counters and set lastLogin
      let needSave = false;
      if (user.failedLoginAttempts && user.failedLoginAttempts !== 0) { user.failedLoginAttempts = 0; needSave = true; }
      if (user.lockUntil) { user.lockUntil = null; needSave = true; }
      user.lastLogin = new Date();
      needSave = true;
      if (needSave) {
        try { await user.save(); } catch (e) { console.error('save err after success login', e); }
      }

      return done(null, user);
    } catch (err) {
      console.error('Passport local strategy error:', err);
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
