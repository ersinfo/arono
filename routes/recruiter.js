// routes/recruiter.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const RecruiterProfile = require('../models/RecruiterProfile');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  }
});
const fileFilter = (req, file, cb) => {
  const ok = /image\/(png|jpe?g|webp|gif)/i.test(file.mimetype);
  cb(ok ? null : new Error('Only image uploads are allowed'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// Create/Update profile
router.post('/recruiter/profile', upload.single('companyLogo'), async (req, res, next) => {
  try {
    // DEV ONLY: jab tak JWT nahi hai
    const recruiterId = req.headers['x-recruiter-id'];
    if (!recruiterId) return res.status(401).json({ error: 'Login required' });

    const requiredMissing = [];
    if (!req.body.companyName) requiredMissing.push('companyName');
    if (!req.body.designation) requiredMissing.push('designation');
    if (requiredMissing.length) {
      return res.status(400).json({ error: `Missing: ${requiredMissing.join(', ')}` });
    }

    const doc = {
      userId: recruiterId,
      companyName: (req.body.companyName || '').trim(),
      companyWebsite: (req.body.companyWebsite || '').trim(),
      companySize: req.body.companySize || '',
      industryType: req.body.industryType || '',
      headquarters: req.body.headquarters || '',
      companyDescription: req.body.companyDescription || '',
      designation: (req.body.designation || '').trim(),
      linkedin: req.body.linkedin || '',
      department: req.body.department || '',
      govtBusinessId: req.body.govtBusinessId || '',
      profileComplete: true
    };
    if (req.file) doc.companyLogo = `/uploads/${req.file.filename}`;

    const profile = await RecruiterProfile.findOneAndUpdate(
      { userId: recruiterId },
      doc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Profile saved', profile });
  } catch (e) {
    next(e);
  }
});

// Check status (for guarding post-job page)
router.get('/recruiter/profile/status', async (req, res, next) => {
  try {
    const recruiterId = req.headers['x-recruiter-id']; // DEV ONLY
    if (!recruiterId) return res.status(401).json({ error: 'Login required' });

    const profile = await RecruiterProfile.findOne({ userId: recruiterId }).lean();
    res.json({ profileComplete: !!profile?.profileComplete });
  } catch (e) {
    next(e);
  }
});

// Return current recruiter's profile
router.get('/recruiter/profile/me', async (req, res, next) => {
  try {
    const recruiterId = req.headers['x-recruiter-id']; // DEV ONLY; replace with JWT later
    if (!recruiterId) return res.status(401).json({ error: 'Login required' });

    const profile = await RecruiterProfile.findOne({ userId: recruiterId }).lean();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    res.json(profile);
  } catch (e) { next(e); }
});

module.exports = router;
