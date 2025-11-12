// routes/candidate.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CandidateProfile = require('../models/CandidateProfile');
const mongoose = require('mongoose');
const router = express.Router();

const uploadRoot = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const fileFilter = (req, file, cb) => {
  const ok = /image\/(png|jpe?g|webp|gif)/i.test(file.mimetype) || /application\/pdf/i.test(file.mimetype);
  cb(ok ? null : new Error('Only images or pdf allowed'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

function getValidatedObjectId(raw) {
  if (!raw) return null;
  const s = String(raw);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
}

// Create/Update profile
router.post('/candidate/profile', upload.single('resume'), async (req, res, next) => {
  try {
    const candidateIdRaw = req.headers['x-candidate-id'] || (req.user && (req.user._id || req.user.id));
    const candidateId = getValidatedObjectId(candidateIdRaw);
    if (!candidateId) return res.status(400).json({ error: 'Invalid candidate id' });

    // accept multiple names
    const fullName = (req.body.fullName || req.body.fullname || `${(req.body.firstName||'').trim()} ${(req.body.lastName||'').trim()}` || '').trim();
    const currentDesignation = (req.body.currentDesignation || req.body.currentRole || req.body.designation || '').trim();

    const missing = [];
    if (!fullName) missing.push('fullName / firstName');
    if (!currentDesignation) missing.push('currentDesignation / currentRole / designation');
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });

    const skillsRaw = (req.body.skills || '').trim();
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Prepare update with $set and $setOnInsert to avoid replacing unique key on race
    const update = {
      $set: {
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
      },
      $setOnInsert: {
        user: candidateId,          // ensure unique key set only on insert
        createdAt: new Date()
      }
    };

    if (req.file) {
      update.$set.resumeUrl = `/uploads/${req.file.filename}`;
    }

    const filter = { user: candidateId }; // must match schema unique field 'user'

    const profile = await CandidateProfile.findOneAndUpdate(
      filter,
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return res.status(201).json({ message: 'Profile saved', profile });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate key error while saving profile. DB cleanup required.' });
    }
    return next(err);
  }
});

// status
router.get('/candidate/profile/status', async (req, res, next) => {
  try {
    const candidateId = getValidatedObjectId(req.headers['x-candidate-id'] || (req.user && (req.user._id || req.user.id)));
    if (!candidateId) return res.status(400).json({ error: 'Invalid candidate id' });
    const p = await CandidateProfile.findOne({ user: candidateId }).lean();
    res.json({ profileComplete: !!p?.profileComplete });
  } catch (e) { next(e); }
});

// me
router.get('/candidate/profile/me', async (req, res, next) => {
    console.log('GET /candidate/profile/me headers:', { auth: req.headers.authorization, xcid: req.headers['x-candidate-id'] });
  try {
    const candidateId = getValidatedObjectId(req.headers['x-candidate-id'] || (req.user && (req.user._id || req.user.id)));
    if (!candidateId) return res.status(400).json({ error: 'Invalid candidate id' });
    const p = await CandidateProfile.findOne({ user: candidateId }).lean();
    if (!p) return res.status(404).json({ error: 'Profile not found' });
    res.json(p);
  } catch (e) { next(e); }
});

module.exports = router;
