// routes/api-login.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "yoursecretkey";
const MAX_FAILED = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

// POST /api/login
router.post("/", async (req, res, next) => {
  try {
    // normalize
    const email = typeof req.body.email === "string" ? req.body.email.toLowerCase().trim() : "";
    const password = req.body.password;

    if (!email || !password) {
      return res.status(422).json({ errors: [{ param: "email/password", msg: "Email and password required" }] });
    }

    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // don't reveal whether email exists
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // check lock
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const retry = new Date(user.lockUntil).toLocaleString();
      return res.status(423).json({ message: `Account locked. Try again after ${retry}` });
    }

    // compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // increment failed attempts, possibly lock
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED) {
        user.lockUntil = Date.now() + LOCK_TIME;
        user.failedLoginAttempts = 0;
      }
      try { await user.save(); } catch (e) { console.error("save failed login:", e); }
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // success: reset counters & set lastLogin
    let needSave = false;
    if (user.failedLoginAttempts && user.failedLoginAttempts !== 0) { user.failedLoginAttempts = 0; needSave = true; }
    if (user.lockUntil) { user.lockUntil = null; needSave = true; }
    user.lastLogin = new Date(); needSave = true;
    if (needSave) {
      try { await user.save(); } catch (e) { console.error("save after success:", e); }
    }

    // Issue JWT
    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: "1d" });

    // Return user info including role
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return next(err);
  }
});

module.exports = router;
