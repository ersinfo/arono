// routes/auth.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// helper
function sendValidationErrors(res, errorsArray) {
  return res.status(422).json({ errors: errorsArray.map(e => ({ param: e.param, msg: e.msg })) });
}

// Signup
router.post('/signup', [
  body('role').isIn(['candidate','recruiter']).withMessage('Invalid role'),
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone required'),
 body('gender').toLowerCase().isIn(['male','female','other']).withMessage('Gender required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('termsAgreed').custom(v => v === true).withMessage('Accept terms'),
  body('companyName').if(body('role').equals('recruiter')).trim().notEmpty().withMessage('Company required for recruiters')
], async (req,res,next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });

  const { role, firstName, lastName, email, phone, gender, password, companyName, termsAgreed, newsletterSubscribed } = req.body;
  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const userData = { role, firstName, lastName, email: email.toLowerCase().trim(), phone, gender, password: hashed, termsAgreed: !!termsAgreed, newsletterSubscribed: !!newsletterSubscribed };
    if (role === 'recruiter') userData.companyName = companyName;

    const user = new User(userData);
    await user.save();

    const userSafe = { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
    return res.status(201).json({ ok: true, user: userSafe });
  } catch (err) {
    console.error('Signup error:', err);
    return next(err);
  }
});

/* LOGOUT (session) */
router.post('/logout', (req, res, next) => {
  req.logout(function(err){
    if (err) return next(err);
    req.session?.destroy(() => {
      res.clearCookie('connect.sid', { path: '/' });
      return res.json({ ok: true });
    });
  });
});

module.exports = router;
