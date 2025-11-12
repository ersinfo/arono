// routes/jobs-list.js
const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// List all active jobs (newest first)
router.get('/jobs', async (req, res) => {
  try {
    const q = {};
    // by default only active jobs; pass ?active=false to disable filter
    if (typeof req.query.active === 'undefined' || req.query.active === 'true') {
      q.isActive = true;
    }

    const jobs = await Job.find(q).sort({ createdAt: -1 }).lean();
    res.json(jobs);
  } catch (err) {
    console.error('[GET /api/jobs] error:', err);
    res.status(500).json({ error: 'Failed to load jobs' });
  }
});

module.exports = router;
