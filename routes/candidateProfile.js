// routes/candidateProfile.js  (replace or merge with your file)
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname||'')}`)
});

const fileFilter = (req,file,cb)=>{
  const ok = /image\/|pdf|msword|wordprocessingml/.test(file.mimetype.toLowerCase());
  cb(ok?null:new Error('Only images/pdf/doc/docx allowed'));
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// helper: get candidate id (header or req.user)
function getCandidateId(req) {
  if (req.headers && req.headers['x-candidate-id']) return String(req.headers['x-candidate-id']);
  if (req.user && (req.user._id || req.user.id)) return String(req.user._id || req.user.id);
  return null;
}

// POST /api/candidate/profile
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ error: 'Login required' });

    // cast to ObjectId if possible (mongoose will accept string in most places, but ensure valid)
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ error: 'Invalid candidate id' });
    }
    const userObjId = mongoose.Types.ObjectId(candidateId);

    const fullName = (req.body.fullName || req.body.fullname || req.body.firstName || '').trim();
    const currentDesignation = (req.body.currentDesignation || req.body.currentRole || req.body.designation || '').trim();

   if (!fullName || !currentDesignation) {
  const missing = [];
  if (!fullName) missing.push('fullName');
  if (!currentDesignation) missing.push('currentDesignation');
  return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
}

    const skillsRaw = (req.body.skills || '').trim();
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const doc = {
      user: userObjId,
      fullName,
      email: (req.body.email || '').trim() || undefined,
      phone: (req.body.phone || '').trim() || undefined,
      dob: req.body.dob ? new Date(req.body.dob) : undefined,
      currentDesignation,
      experienceYears: (req.body.experienceYears || '').trim() || undefined,
      location: (req.body.location || '').trim() || undefined,
      education: (req.body.education || '').trim() || undefined,
      skills,
      linkedin: (req.body.linkedin || '').trim() || undefined,
      profileComplete: true,
      updatedAt: new Date()
    };

    if (req.file) {
      doc.resumeUrl = `/uploads/${req.file.filename}`;
    }

    Object.keys(doc).forEach(k=>{ if(doc[k]===undefined||doc[k]==='') delete doc[k]; });

    const profile = await CandidateProfile.findOneAndUpdate(
      { user: userObjId },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // optional: mark User.isProfileComplete if you use that flag
    try { await User.findByIdAndUpdate(userObjId, { isProfileComplete: true }).exec(); } catch(e){}

    return res.status(201).json({ message: 'Profile saved', profile });
  } catch (err) {
    console.error('candidateProfile POST error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/candidate/profile/me
router.get('/me', async (req, res) => {
  try {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ error: 'Login required' });
    if (!mongoose.Types.ObjectId.isValid(candidateId)) return res.status(400).json({ error: 'Invalid candidate id' });

    const p = await CandidateProfile.findOne({ user: mongoose.Types.ObjectId(candidateId) }).lean();
    if (!p) return res.status(404).json({ error: 'Profile not found' });
    return res.json(p);
  } catch (err) {
    console.error('candidateProfile me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/candidate/profile/status
router.get('/status', async (req, res) => {
  try {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ error: 'Login required' });
    if (!mongoose.Types.ObjectId.isValid(candidateId)) return res.status(400).json({ error: 'Invalid candidate id' });

    const p = await CandidateProfile.findOne({ user: mongoose.Types.ObjectId(candidateId) }).lean();
    return res.json({ profileComplete: !!p?.profileComplete });
  } catch (err) {
    console.error('candidateProfile status error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
