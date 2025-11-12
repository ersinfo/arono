// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['candidate', 'recruiter'],
      required: true,
      lowercase: true,
      trim: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone:     { type: String, required: true, trim: true },

    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
      lowercase: true,
      trim: true
    },

    password:  { type: String, required: true }, // bcrypt-hashed
    termsAgreed: { type: Boolean, default: false },
    newsletterSubscribed: { type: Boolean, default: false },

    companyName: { type: String, trim: true },
    isActive: { type: Boolean, default: false },

    // security fields
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLogin: { type: Date, default: null }
  },
  { timestamps: true }
);

// Ensure unique index on email - create in DB once (watch duplicates)
// UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
