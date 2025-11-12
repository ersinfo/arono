// routes/jobApplication.js
console.log('ROUTE_FILE_LOADED: application routes file loaded');

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Notification = require('../models/Notification');
const jwtAuth = require('../middleware/jwt-auth');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth-gate');






// router.use(jwtAuth);


// robust candidate id resolver (replace existing getCandidateId)
function getCandidateId(req) {
  // Accept multiple header variants to avoid typos
  const headerCandidates = [
    'x-candidate-id',
    'xcandidate-id',
    'x_candidate_id',
    'xcandidateid',
    'x-candidateid'
  ];

  let raw = null;

  // check headers first (case-insensitive keys are normalized in Node)
  for (const key of headerCandidates) {
    if (req.headers && req.headers[key]) {
      raw = req.headers[key];
      console.log('getCandidateId: matched header key=', key, 'value=', raw);
      break;
    }
  }

  // fallback to explicit req.header getter (handles some frameworks)
  if (!raw) {
    for (const key of headerCandidates) {
      const v = req.header ? req.header(key) : null;
      if (v) {
        raw = v;
        console.log('getCandidateId: matched req.header(', key, ') =', v);
        break;
      }
    }
  }

  // other fallbacks: query, body, req.user
  if (!raw) raw = req.query?.candidateId || req.body?.candidateId || (req.user && (req.user._id || req.user.id));

  if (!raw) {
    console.log('getCandidateId: no candidate id found in headers/query/body/req.user');
    return null;
  }

  const id = String(raw).trim();
  return id.length ? id : null;
}



/**
 * Find recruiter profile using multiple fallbacks.
 * Tries job.recruiterId in different interpretations then req.user and header.
 * Returns profile object or null.
 */
async function findRecruiterProfile(req, job) {
  try {
    const headerRid = req.header('x-recruiter-id');
    const userId = req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : null;

    console.log('findRecruiterProfile: job.recruiterId=', job && job.recruiterId);
    console.log('findRecruiterProfile: req.userId=', userId, 'headerRid=', headerRid);

    // Helper to safely attempt a findOne by field
    const tryFind = async (query) => {
      try {
        const p = await RecruiterProfile.findOne(query).lean().exec();
        return p || null;
      } catch (e) {
        console.error('tryFind error', e && e.message);
        return null;
      }
    };

    // If job has recruiterId try several interpretations
    if (job && job.recruiterId) {
      const rid = String(job.recruiterId);

      // 1. recruiterId as userId string
      let p = await tryFind({ userId: rid });
      if (p) return p;

      // 2. recruiterId as ObjectId for userId
      if (mongoose.Types.ObjectId.isValid(rid)) {
        const oid = new mongoose.Types.ObjectId(rid);
        p = await tryFind({ userId: oid });
        if (p) return p;

        // 3. recruiterId as profile _id
        p = await RecruiterProfile.findById(oid).lean().exec().catch(e => { console.error('findById error', e && e.message); return null; });
        if (p) return p;
      }
    }

    // Try using logged-in user id (string then ObjectId)
    if (userId) {
      let p = await tryFind({ userId: userId });
      if (p) return p;

      if (mongoose.Types.ObjectId.isValid(userId)) {
        const oid = new mongoose.Types.ObjectId(userId);
        p = await tryFind({ userId: oid });
        if (p) return p;
      }
    }

    // Try header x-recruiter-id
    if (headerRid) {
      let p = await tryFind({ userId: headerRid });
      if (p) return p;

      if (mongoose.Types.ObjectId.isValid(headerRid)) {
        const oid = new mongoose.Types.ObjectId(headerRid);
        p = await RecruiterProfile.findById(oid).lean().exec().catch(e => { console.error('findById(headerRid) error', e && e.message); return null; });
        if (p) return p;
      }
    }

    console.log('findRecruiterProfile: NOT FOUND');
    return null;
  } catch (err) {
    console.error('findRecruiterProfile outer error', err && err.message);
    return null;
  }
}

/**
 * POST /api/application/job
 * Create a job application for a candidate.
 */
router.post('/job', async (req, res) => {
  console.log('POST /api/application/job - req.user =', req.user);
  try {
    console.log('POST headers:', {
      authorization: req.header('authorization'),
      'x-candidate-id': req.header('x-candidate-id')
    });

    const candidateUserId = getCandidateId(req);
    if (!candidateUserId) return res.status(401).json({ error: 'Login required' });
    console.log('NOTE: skipping strict ObjectId validation; will try DB lookups with sanitized/raw values');

    const { jobId, experienceYears, resumeUrl } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId required' });

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) return res.status(400).json({ error: 'Invalid jobId format' });

    // load job
    const job = await Job.findById(jobId).lean();
    console.log('job =', job ? { _id: job._id, recruiterId: job.recruiterId } : null);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // load candidate profile
    const candidateProfile = await CandidateProfile.findOne({ user: candidateUserId });
    console.log('candidateProfile=', candidateProfile ? String(candidateProfile._id) : null);
    if (!candidateProfile) return res.status(404).json({ error: 'Candidate profile not found' });

    // find recruiter profile
    let recruiterProfile = await findRecruiterProfile(req, job);
    console.log('findRecruiterProfile initial result=', recruiterProfile ? String(recruiterProfile._id) : null);

    // sensible fallback using job.recruiterId
    if (!recruiterProfile && job && job.recruiterId) {
      try {
        const ridStr = String(job.recruiterId);
        console.log('Fallback: try RecruiterProfile.findOne({ userId: job.recruiterId }) with', ridStr);
        recruiterProfile = await RecruiterProfile.findOne({ userId: ridStr }).lean().exec();
        if (!recruiterProfile && mongoose.Types.ObjectId.isValid(ridStr)) {
          recruiterProfile = await RecruiterProfile.findById(ridStr).lean().exec();
        }
        console.log('Fallback result=', recruiterProfile ? String(recruiterProfile._id) : null);
      } catch (e) {
        console.error('Fallback recruiter lookup failed', e && e.message);
      }
    }

    if (!recruiterProfile) {
      console.warn('Recruiter profile not found for job', String(job._id), 'recruiterId=', String(job.recruiterId));
      return res.status(404).json({ error: 'Recruiter profile not found for this job. Contact admin.' });
    }

    const recruiterRef = recruiterProfile._id;
    const recruiterName = recruiterProfile.companyName || recruiterProfile.fullName || job.company || 'Unknown Recruiter';

    console.log('About to create application:', {
      candidateProfile: String(candidateProfile._id),
      job: String(job._id),
      recruiterRef: String(recruiterRef),
      recruiterName
    });

    const application = await JobApplication.create({
      candidate: candidateProfile._id,
      candidateName: candidateProfile.fullName || '',
      job: job._id,
      recruiter: recruiterRef,
      recruiterName,
      experienceYears: experienceYears || '',
      resumeUrl: resumeUrl || '',
      status: 'applied',
      createdAt: new Date()
    });

    console.log('Application created id=', String(application._id));

    await Notification.create({
      user: candidateUserId,
      type: 'job_applied',
      message: `You applied for "${job.title}"`,
      data: { jobId, applicationId: application._id }
    });

    // emit socket if available
    let notifyTo = null;
    if (recruiterProfile && recruiterProfile.userId) notifyTo = recruiterProfile.userId;
    else if (job && job.recruiterId) notifyTo = job.recruiterId;
    if (notifyTo && req.app && req.app.get('io')) {
      req.app.get('io').to(String(notifyTo)).emit('newApplication', { applicationId: application._id });
    }

    return res.status(201).json({ message: 'Applied', applicationId: application._id });
  } catch (err) {
    console.error('apply error', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/application/my-job-applications
 * Return job applications for the candidate resolved from header/query/body or req.user
 */
// REPLACE the entire /my-job-applications handler with this tolerant version

router.get('/my-job-applications', async (req, res) => {
  console.log('GET /api/application/my-job-applications - headers:', req.headers);
  try {
  
    let rawHeader = req.headers['x-candidate-id'] || req.headers['xcandidate-id'] || req.query?.candidateId || req.body?.candidateId || (req.user && (req.user._id || req.user.id));
    console.log('RAW x-candidate-id resolved =>', JSON.stringify(rawHeader));
    if (!rawHeader) return res.status(401).json({ error: 'Login required' });

    let candidateUserId = String(rawHeader).trim().replace(/[^a-fA-F0-9]/g, '');
    console.log('SANITIZED candidateUserId =>', candidateUserId);

    const queries = [];
    if (mongoose.Types.ObjectId.isValid(candidateUserId) && candidateUserId.length === 24) {
      queries.push({ user: new mongoose.Types.ObjectId(candidateUserId) });
    }
    queries.push({ user: String(rawHeader).trim() });

    let candidateProfile = null;
    for (const q of queries) {
      try {
        console.log('Trying CandidateProfile.findOne with', q);
        candidateProfile = await CandidateProfile.findOne(q).lean().exec();
        if (candidateProfile) { console.log('Found candidateProfile id=', String(candidateProfile._id)); break; }
      } catch (e) { console.error('CandidateProfile lookup error', e && e.message); }
    }

    if (!candidateProfile) return res.status(404).json({ error: 'Candidate profile not found' });

    const applications = await JobApplication.find({ candidate: candidateProfile._id })
      .populate({ path: 'job', select: 'title company location jobType' })
      .sort({ createdAt: -1 }).lean();

    const formatted = applications.map(app => ({
      jobId: app.job?._id,
      title: app.job?.title,
      company: app.job?.company,
      location: app.job?.location,
      type: app.job?.jobType,
      status: app.status,
      experienceYears: app.experienceYears,
      resumeUrl: app.resumeUrl || '',
      appliedAt: app.createdAt
    }));

    return res.json({ applications: formatted });
  } catch (err) {
    console.error('Fetch applications error:', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/application/job/received-applications
router.get('/received-job-applications', ensureAuthenticated, ensureRole('recruiter'), async (req, res) => {
  try {
    console.log('REQ HEADERS x-recruiter-id =', req.header('x-recruiter-id'));
    console.log('REQ.user =', req.user && (req.user._id || req.user.id), req.user && req.user.role);

    // find recruiter profile (uses existing helper)
    const recruiterProfile = await findRecruiterProfile(req);
    console.log(
      'DEBUG: recruiterProfile =',
      recruiterProfile ? String(recruiterProfile._id) : null,
      'recruiterProfile.userId =',
      recruiterProfile ? String(recruiterProfile.userId || '') : null
    );

    // fallback if findRecruiterProfile fails
    const recruiterProfileId =
      recruiterProfile?._id ||
      (req.user && (req.user._id || req.user.id)
        ? String(req.user._id || req.user.id)
        : null);

    if (!recruiterProfileId) {
      console.warn(
        '/received-job-applications: recruiter profile not found for user',
        req.user && (req.user._id || req.user.id)
      );
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    // debug counts and sample
    const appsCount = await JobApplication.countDocuments({
      recruiter: recruiterProfile ? recruiterProfile._id : recruiterProfileId,
    }).catch((e) => {
      console.error('count error', e);
      return -1;
    });

    console.log('DEBUG: applications count for recruiterProfile:', appsCount);

    const sampleApps = await JobApplication.find({
      recruiter: recruiterProfile ? recruiterProfile._id : recruiterProfileId,
    })
      .limit(5)
      .lean()
      .catch((e) => {
        console.error('find sample error', e);
        return [];
      });

    console.log(
      'DEBUG: sampleApps (first 5):',
      sampleApps.map((a) => ({
        _id: a._id,
        candidate: a.candidate,
        candidateName: a.candidateName,
        job: a.job,
        status: a.status,
      }))
    );

    // fetch full applications with populate
    const apps = await JobApplication.find({
      recruiter: recruiterProfile ? recruiterProfile._id : recruiterProfileId,
    })
      .populate({ path: 'candidate', select: 'fullName user' })
      .populate({ path: 'recruiter', select: 'companyName fullName userId' })
      .populate({
        path: 'job',
        select: 'title company location jobType recruiterId',
      })
      .sort({ createdAt: -1 })
      .lean();

    // format response
    const formatted = apps.map((a) => ({
      id: a._id,
      candidateProfileId: a.candidate?._id,
      candidateName:
        a.candidateName || (a.candidate && a.candidate.fullName) || '',
      candidateUserId: a.candidate?.user || null,
      jobId: a.job?._id,
      jobTitle: a.job?.title || '',
      company:
        a.recruiter?.companyName ||
        a.recruiterName ||
        a.job?.company ||
        '',
      location: a.job?.location || '',
      type: a.job?.jobType || a.type || '',
      experienceYears: a.experienceYears || '',
      resumeUrl: a.resumeUrl || '',
      status: a.status,
      appliedAt: a.createdAt,
    }));

    return res.json({ applications: formatted });
  } catch (err) {
    console.error('/received-job-applications error', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/application/id/:applicationId
router.get('/:applicationId', ensureAuthenticated, async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) return res.status(400).json({ error: 'Invalid id' });

    // load application with populated refs
    const app = await JobApplication.findById(applicationId)
      .populate({ path: 'candidate', select: 'fullName user' })
      .populate({ path: 'recruiter', select: 'companyName user userId' })
      .populate({ path: 'job', select: 'title company location' })
      .lean();

    if (!app) return res.status(404).json({ error: 'Application not found' });

    // normalized ids from request and application
    const requesterUserId = req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : null;
    const candidateUserId = app.candidate && app.candidate.user ? String(app.candidate.user) : null;

    // recruiter may be a profile doc; it may expose user or userId, and has _id
    let applicationRecruiterProfileId = app.recruiter && app.recruiter._id ? String(app.recruiter._id) : null;
    let applicationRecruiterUserId = null;
    if (app.recruiter) {
      applicationRecruiterUserId = app.recruiter.user ? String(app.recruiter.user) : (app.recruiter.userId ? String(app.recruiter.userId) : null);
    }

    // try to resolve current user's recruiter profile id (fallback)
    let currentRecruiterProfileId = null;
    try {
      const rp = await findRecruiterProfile(req, app.job || null);
      if (rp) currentRecruiterProfileId = String(rp._id);
    } catch (e) {
      console.error('findRecruiterProfile in GET failed', e && e.message);
    }

    // authorization checks
    const isCandidate = requesterUserId && candidateUserId && requesterUserId === candidateUserId;
    const isRecruiterByUser = requesterUserId && applicationRecruiterUserId && requesterUserId === applicationRecruiterUserId;
    const isRecruiterByProfile = currentRecruiterProfileId && applicationRecruiterProfileId && currentRecruiterProfileId === applicationRecruiterProfileId;

    if (!isCandidate && !isRecruiterByUser && !isRecruiterByProfile) {
      console.log('DENY reason:', { requesterUserId, candidateUserId, applicationRecruiterUserId, applicationRecruiterProfileId, currentRecruiterProfileId });
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ application: app });
  } catch (err) {
    console.error('get-application error', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/application/:applicationId/status
router.put('/:applicationId/status', ensureAuthenticated, ensureRole('recruiter'), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['applied', 'reviewed', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    if (!mongoose.Types.ObjectId.isValid(applicationId)) return res.status(400).json({ error: 'Invalid id' });

    // resolve recruiter profile
    const recruiterProfile = await findRecruiterProfile(req);
    // fallback to req.user id if profile not found
    const recruiterProfileId = recruiterProfile ? String(recruiterProfile._id) : (req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : null);

    if (!recruiterProfileId) {
      console.warn('update-status: recruiter profile id could not be resolved for user', req.user && (req.user._id || req.user.id));
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    const application = await JobApplication.findById(applicationId)
      .populate({ path: 'candidate', select: 'user fullName' })
      .populate({ path: 'job', select: 'title' });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // ensure recruiter owns this application
    // application.recruiter may be ObjectId or string; normalize both sides to string
    if (String(application.recruiter) !== String(recruiterProfileId)) {
      return res.status(403).json({ error: 'Forbidden: you do not own this application' });
    }

    application.status = status;
    await application.save();

    const candidateProfile = application.candidate;
    const candidateUserId = candidateProfile && candidateProfile.user ? candidateProfile.user : null;
    const jobTitle = application.job ? (application.job.title || '') : '';

    await Notification.create({
      user: candidateUserId || application.candidate,
      type: 'application_status_update',
      message: `Your application for "${jobTitle}" is now "${status}"`,
      data: { applicationId: application._id, status }
    });

    const io = req.app.get('io');
    if (io && candidateUserId) {
      io.to(String(candidateUserId)).emit('applicationStatusUpdated', {
        applicationId: application._id,
        status,
        jobTitle
      });
    }

    return res.json({ message: 'Status updated', application });
  } catch (err) {
    console.error('update-status error', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
