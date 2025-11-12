// aron/routes/internship.js
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Internship = require('../models/Internship');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';

// Page routes
// router.get('/internships', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', 'public', 'see-internship.html'));
// });

// router.get('/post-internship', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', 'public', 'post-internship.html'));
// });

// router.get('/see-internship-view.html', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', 'public', 'see-internship-view.html'));
// });

// API: GET /api/internships/:id
router.get('/internships/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    if (mongoose.Types.ObjectId.isValid(id)) {
      const intern = await Internship.findById(id).lean().exec();
      if (!intern) return res.status(404).json({ error: 'Internship not found' });
      return res.json(intern);
    }

    const intern = await Internship.findOne({ internshipId: id }).lean().exec();
    if (!intern) return res.status(404).json({ error: 'Internship not found' });
    return res.json(intern);
  } catch (err) {
    console.error('[GET /internships/:id] error', err);
    return next(err);
  }
});

// API: GET /api/internships  (also supports ?id=... single fetch)
router.get('/internships', async (req, res) => {
  try {
    const singleId = req.query.id || req.query.internshipId;
    if (singleId) {
      if (mongoose.Types.ObjectId.isValid(singleId)) {
        const intern = await Internship.findById(singleId).lean().exec();
        if (!intern) return res.status(404).json({ error: 'Internship not found' });
        return res.json(intern);
      }
      const intern = await Internship.findOne({ internshipId: singleId }).lean().exec();
      if (!intern) return res.status(404).json({ error: 'Internship not found' });
      return res.json(intern);
    }

    const q = {};
    const activeRaw = typeof req.query.active === 'undefined' ? 'true' : String(req.query.active).toLowerCase();

    if (activeRaw === 'true' || activeRaw === '1') {
      q.isActive = true;
    } else if (activeRaw === 'false' || activeRaw === '0') {
      q.isActive = false;
    } else if (activeRaw === 'all' || activeRaw === '') {
      // no filter
    } else {
      if (typeof req.query.active === 'undefined') q.isActive = true;
    }

    if (req.query.q) {
      const r = new RegExp(String(req.query.q).trim(), 'i');
      q.$or = [{ title: r }, { company: r }, { location: r }, { description: r }];
    }

    if (req.query.type) q.internshipType = req.query.type;

    const internships = await Internship.find(q).sort({ createdAt: -1 }).lean().exec();
    return res.json(internships);
  } catch (err) {
    console.error('[GET /internships] error:', err);
    return res.status(500).json({ error: 'Failed to load internships' });
  }
});

// POST /api/internships  -> create internship (recruiter only)
router.post('/internships', express.json(), async (req, res) => {
  try {
    // Auth
    let userObj = null;
    const auth = req.headers.authorization || '';
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice(7).trim();
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        userObj = {
          id: payload.id || payload._id || payload.userId,
          role: payload.role || (payload.user && payload.user.role)
        };
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } else if (req.user) {
      userObj = { id: req.user.id || req.user._id, role: req.user.role };
    } else {
      return res.status(401).json({ error: 'Authorization required' });
    }

    if (!userObj || (String(userObj.role).toLowerCase() !== 'recruiter')) {
      return res.status(403).json({ error: 'Only recruiters can post internships' });
    }

    const { title, company, location, description, internshipType } = req.body;
    if (!title || !company || !location || !description) {
      return res.status(400).json({ error: 'title, company, location, description are required' });
    }

    const internData = {
      title: String(title).trim(),
      company: String(company).trim(),
      location: String(location).trim(),
      description: String(description).trim(),
      internshipType: internshipType || 'Internship',
      recruiterId: userObj.id,
      isActive: typeof req.body.isActive === 'undefined' ? true : Boolean(req.body.isActive),
      createdAt: new Date()
    };

    if (req.body.salaryRange) {
      const sr = req.body.salaryRange;
      internData.salaryRange = {};
      if (typeof sr.min !== 'undefined' && sr.min !== '') internData.salaryRange.min = Number(sr.min);
      if (typeof sr.max !== 'undefined' && sr.max !== '') internData.salaryRange.max = Number(sr.max);
    } else if (req.body.stipend) {
      internData.stipend = String(req.body.stipend).trim();
    }

    if (req.body.requirements) {
      if (Array.isArray(req.body.requirements)) {
        internData.requirements = req.body.requirements.map(r => String(r).trim()).filter(Boolean);
      } else if (typeof req.body.requirements === 'string') {
        internData.requirements = req.body.requirements.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (req.body.applicationDeadline) {
      const d = new Date(req.body.applicationDeadline);
      if (!Number.isNaN(d.getTime())) internData.applicationDeadline = d;
    }

    if (req.body.duration) internData.duration = String(req.body.duration).trim();

    const internship = new Internship(internData);
    await internship.save();

    return res.status(201).json({ message: 'Internship posted successfully', internship });
  } catch (err) {
    console.error('[POST /internships] error:', err);
    return res.status(500).json({ error: 'Server error while posting internship' });
  }
});

module.exports = router;
