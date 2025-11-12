const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const CandidateProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, trim: true },
    phone: { type: String },
     dob: { type: Date },
    currentDesignation: { type: String },
    experienceYears: { type: String },
    location: { type: String },
    education: { type: String },
    skills: { type: [String], default: [] },
    linkedin: { type: String, trim: true },
    resumeUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    profileComplete: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('CandidateProfile', CandidateProfileSchema);