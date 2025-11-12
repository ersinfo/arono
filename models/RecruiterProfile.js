// models/RecruiterProfile.js
const mongoose = require('mongoose');

const recruiterProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  companyName: { type: String, required: true, trim: true },
  companyWebsite: { type: String, trim: true },
  companyLogo: { type: String, trim: true }, // /uploads/<file>
  companySize: { type: String, trim: true },
  industryType: { type: String, trim: true },
  headquarters: { type: String, trim: true },
  companyDescription: { type: String, trim: true },
  designation: { type: String, required: true, trim: true },
  linkedin: { type: String, trim: true },
  department: { type: String, trim: true },
  govtBusinessId: { type: String, trim: true },
  profileComplete: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('RecruiterProfile', recruiterProfileSchema);
