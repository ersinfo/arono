const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InternshipApplicationSchema = new Schema({
  candidate: { type: Schema.Types.ObjectId, ref: 'CandidateProfile', required: true },
  candidateName: { type: String, required: true },       // Candidate का नाम
  internship: { type: Schema.Types.ObjectId, ref: 'Internship', required: true },
  recruiter: { type: Schema.Types.ObjectId, ref: 'RecruiterProfile', required: false }, // Recruiter का reference
  recruiterName: { type: String, required: false },       // Recruiter का नाम / company
  experienceYears: { type: String },
  resumeUrl: { type: String },
  status: { type: String, enum: ['applied', 'reviewed', 'accepted', 'rejected'], default: 'applied' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InternshipApplication', InternshipApplicationSchema);
