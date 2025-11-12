const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// POST Job – only Recruiter
router.post('/post-job', async (req, res) => {
  const { role, title, company, location, description } = req.body;

  if (role !== 'Recruiter') {
    return res.status(403).json({ error: 'Only recruiters can post jobs' });
  }

  try {
    const job = new Job({ title, company, location, description });
    await job.save();
    res.status(201).json({ message: 'Job posted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post job' });
  }
});

module.exports = router;
