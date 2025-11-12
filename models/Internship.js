// models/Internship.js
const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  internshipType: { type: String, default: 'Internship' }, // e.g., Internship, Part-time, Remote
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  salaryRange: {
    min: { type: Number },
    max: { type: Number }
  },
  requirements: [String],
  applicationDeadline: { type: Date },
  createdAt: { type: Date, default: () => new Date() },
  // optional fields
  duration: { type: String }, // e.g., "3 months"
  stipend: { type: String }
});

module.exports = mongoose.model('Internship', InternshipSchema);
