const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },          // Job title
  company:  { type: String, required: true, trim: true },        // Company name
  location:  { type: String, required: true, trim: true },       // Job location
  jobType: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Contract', 'Temporary'], required: true },
  salaryRange: {                                     // Salary range, optional
    min: Number,
    max: Number
  },
  description:  { type: String, required: true, trim: true },    // Job description
  requirements: { type: [String], default: []},                            // List of skills/requirements
  postedDate: { type: Date, default: Date.now },    // Job posting date
  applicationDeadline: { type: Date },               // Last date to apply
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Reference to recruiter user who posted job
  isActive: { type: Boolean, default: true }        // Job active or closed
}, 
{
  timestamps: true    // Automatic createdAt and updatedAt fields
});

module.exports = mongoose.model('Job', jobSchema);
