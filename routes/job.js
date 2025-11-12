// aron/routes/job.js
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';

// ----------------------
// Page routes (serve HTML pages)
// ----------------------
router.get('/jobs', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'see-job.html'));
});

router.get('/post-job', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'post-job.html'));
});

router.get('/see-job-view.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'see-job-view.html'));
});

// ----------------------
// API routes for jobs
// ----------------------

// Support both query ?id=... and path /api/jobs/:id
router.get('/api/jobs/:id', async (req, res, next) => {
  // This handles /api/jobs/:id
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // If valid Mongo ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      const job = await Job.findById(id).lean().exec();
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json(job);
    }

    // fallback: search by custom jobId field if used
    const job = await Job.findOne({ jobId: id }).lean().exec();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json(job);
  } catch (err) {
    console.error('[GET /api/jobs/:id] error', err);
    return next(err);
  }
});

// Also handle query-based single fetch: /api/jobs?id=...
router.get('/api/jobs', async (req, res) => {
  try {
    // single job by query param ?id= or ?jobId=
    const singleId = req.query.id || req.query.jobId;
    if (singleId) {
      // reuse same logic as param route
      if (mongoose.Types.ObjectId.isValid(singleId)) {
        const job = await Job.findById(singleId).lean().exec();
        if (!job) return res.status(404).json({ error: 'Job not found' });
        return res.json(job);
      }
      const job = await Job.findOne({ jobId: singleId }).lean().exec();
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json(job);
    }

    // list behavior:
    // build query object
    const q = {};

    // active filter:
    // - if ?active is undefined -> default only active jobs
    // - if ?active=false or ?active=0 -> show only inactive
    // - if ?active=all or ?active='' -> don't filter by active
    const activeRaw = typeof req.query.active === 'undefined' ? 'true' : String(req.query.active).toLowerCase();

    if (activeRaw === 'true' || activeRaw === '1') {
      q.isActive = true;
    } else if (activeRaw === 'false' || activeRaw === '0') {
      q.isActive = false;
    } else if (activeRaw === 'all' || activeRaw === '') {
      // no filter on isActive
    } else {
      // default fallback: if undefined behavior, keep default active
      if (typeof req.query.active === 'undefined') q.isActive = true;
    }

    // text search param 'q' (optional)
    if (req.query.q) {
      const r = new RegExp(String(req.query.q).trim(), 'i');
      q.$or = [{ title: r }, { company: r }, { location: r }, { description: r }];
    }

    if (req.query.type) q.jobType = req.query.type;

    const jobs = await Job.find(q).sort({ createdAt: -1 }).lean().exec();
    return res.json(jobs);
  } catch (err) {
    console.error('[GET /api/jobs] error:', err);
    return res.status(500).json({ error: 'Failed to load jobs' });
  }
});

// POST /api/jobs  -> create job (recruiter only). JSON body expected.
router.post('/api/jobs', express.json(), async (req, res) => {
  try {
    // Auth: accept Bearer JWT or session-based req.user
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
      return res.status(403).json({ error: 'Only recruiters can post jobs' });
    }

    const { title, company, location, description, jobType } = req.body;
    if (!title || !company || !location || !description) {
      return res.status(400).json({ error: 'title, company, location, description are required' });
    }

    const jobData = {
      title: String(title).trim(),
      company: String(company).trim(),
      location: String(location).trim(),
      description: String(description).trim(),
      jobType: jobType || 'Full-time',
      recruiterId: userObj.id,
      isActive: typeof req.body.isActive === 'undefined' ? true : Boolean(req.body.isActive),
      createdAt: new Date()
    };

    // salaryRange
    if (req.body.salaryRange) {
      const sr = req.body.salaryRange;
      jobData.salaryRange = {};
      if (typeof sr.min !== 'undefined' && sr.min !== '') jobData.salaryRange.min = Number(sr.min);
      if (typeof sr.max !== 'undefined' && sr.max !== '') jobData.salaryRange.max = Number(sr.max);
    } else if (req.body.salary) {
      jobData.salary = String(req.body.salary).trim();
    }

    // requirements
    if (req.body.requirements) {
      if (Array.isArray(req.body.requirements)) {
        jobData.requirements = req.body.requirements.map(r => String(r).trim()).filter(Boolean);
      } else if (typeof req.body.requirements === 'string') {
        jobData.requirements = req.body.requirements.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // applicationDeadline (accept ISO string or date-like)
    if (req.body.applicationDeadline) {
      const d = new Date(req.body.applicationDeadline);
      if (!Number.isNaN(d.getTime())) jobData.applicationDeadline = d;
    }

    const job = new Job(jobData);
    await job.save();

    return res.status(201).json({ message: 'Job posted successfully', job });
  } catch (err) {
    console.error('[POST /api/jobs] error:', err);
    return res.status(500).json({ error: 'Server error while posting job' });
  }
});

module.exports = router;
