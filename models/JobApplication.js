const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobApplicationSchema = new Schema({
  candidate: { type: Schema.Types.ObjectId, ref: 'CandidateProfile', required: true },
  candidateName: { type: String, required: true },
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  recruiter: { type: Schema.Types.ObjectId, ref: 'RecruiterProfile', required: false },
  recruiterName: { type: String, required: false },
  experienceYears: { type: String },
  resumeUrl: { type: String },
  status: { type: String, enum: ['applied','reviewed','accepted','rejected'], default: 'applied' },
  createdAt: { type: Date, default: Date.now }
});

// prevent duplicate apply by same candidate for same job
JobApplicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
