// routes/internshipapplication.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const Internship = require('../models/Internship');
const InternshipApplication = require('../models/InternshipApplication');
const Notification = require('../models/Notification');
const jwtAuth = require('../middleware/jwt-auth');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth-gate');

router.use(jwtAuth);

// helper to get candidate user id (header fallback)
function getCandidateId(req) {
  return req.headers['x-candidate-id'] || (req.user && (req.user._id || req.user.id));
}

// --- Improved recruiter profile finder ---
// replace existing findRecruiterProfile with this
async function findRecruiterProfile(req, internship) {
  try {
    const headerRid = req.header('x-recruiter-id');
    const userId = req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : null;

    console.log('findRecruiterProfile: internship.recruiterId=', internship && internship.recruiterId);
    console.log('findRecruiterProfile: req.userId=', userId, 'headerRid=', headerRid);

    try { const cnt = await RecruiterProfile.countDocuments({}).catch(()=>-1); console.log('RecruiterProfile count=', cnt); } catch(e){}

    if (internship && internship.recruiterId) {
      const rid = String(internship.recruiterId);

      // Try 1: if recruiterId is actually a User id stored earlier, check userId field
      try {
        console.log('Try 1: findOne({ userId: rid }) with rid=', rid);
        const p1 = await RecruiterProfile.findOne({ userId: rid }).lean().exec();
        console.log('Try1 result:', !!p1, p1 && String(p1._id));
        if (p1) return p1;
      } catch(e){ console.error('Try1 error', e && e.message); }

      // Try 2: treat rid as ObjectId for userId
      try {
        if (mongoose.Types.ObjectId.isValid(rid)) {
          const oid = new mongoose.Types.ObjectId(rid);
          console.log('Try 2: findOne({ userId: ObjectId(rid) }) with oid=', String(oid));
          const p2 = await RecruiterProfile.findOne({ userId: oid }).lean().exec();
          console.log('Try2 result:', !!p2, p2 && String(p2._id));
          if (p2) return p2;
        }
      } catch(e){ console.error('Try2 error', e && e.message); }

      // Try 3: maybe recruiterId already is profile _id
      try {
        if (mongoose.Types.ObjectId.isValid(rid)) {
          const oid = new mongoose.Types.ObjectId(rid);
          console.log('Try 3: findById(rid) with oid=', String(oid));
          const p3 = await RecruiterProfile.findById(oid).lean().exec();
          console.log('Try3 result:', !!p3, p3 && String(p3._id));
          if (p3) return p3;
        }
      } catch(e){ console.error('Try3 error', e && e.message); }
    }

    // Try 4/5: use logged-in user id as recruiter.userId (string then ObjectId)
    if (userId) {
      try {
        console.log('Try 4: findOne({ userId: userId }) with userId=', userId);
        const p4 = await RecruiterProfile.findOne({ userId: userId }).lean().exec();
        console.log('Try4 result:', !!p4, p4 && String(p4._id));
        if (p4) return p4;
      } catch(e){ console.error('Try4 error', e && e.message); }

      try {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          const oid = new mongoose.Types.ObjectId(userId);
          console.log('Try 5: findOne({ userId: ObjectId(userId) }) with oid=', String(oid));
          const p5 = await RecruiterProfile.findOne({ userId: oid }).lean().exec();
          console.log('Try5 result:', !!p5, p5 && String(p5._id));
          if (p5) return p5;
        }
      } catch(e){ console.error('Try5 error', e && e.message); }
    }

    // Try 6/7: header x-recruiter-id
    if (headerRid) {
      try {
        console.log('Try 6: findOne({ userId: headerRid }) with headerRid=', headerRid);
        const p6 = await RecruiterProfile.findOne({ userId: headerRid }).lean().exec();
        console.log('Try6 result:', !!p6, p6 && String(p6._id));
        if (p6) return p6;
      } catch(e){ console.error('Try6 error', e && e.message); }

      try {
        if (mongoose.Types.ObjectId.isValid(headerRid)) {
          const oid = new mongoose.Types.ObjectId(headerRid);
          console.log('Try 7: findById(headerRid) with oid=', String(oid));
          const p7 = await RecruiterProfile.findById(oid).lean().exec();
          console.log('Try7 result:', !!p7, p7 && String(p7._id));
          if (p7) return p7;
        }
      } catch(e){ console.error('Try7 error', e && e.message); }
    }

    console.log('findRecruiterProfile: NOT FOUND');
    return null;
  } catch (err) {
    console.error('findRecruiterProfile outer error', err && err.message);
    return null;
  }
}



// POST /api/application/internship
// POST /api/application/internship
router.post('/internship', async (req, res) => {
  console.log('REQ.user =', req.user);
  console.log('internshipId from body =', req.body.internshipId);
  try {
    console.log('POST /api/application/internship headers:', {
      auth: req.header('authorization'),
      'x-candidate-id': req.header('x-candidate-id')
    });

    const candidateUserId = getCandidateId(req);
    if (!candidateUserId) return res.status(401).json({ error: 'Login required' });

    const { internshipId, experienceYears, resumeUrl } = req.body;
    if (!internshipId) return res.status(400).json({ error: 'internshipId required' });

    // load internship
    const internship = await Internship.findById(internshipId).lean();
    console.log('internship =', internship && { _id: internship._id, recruiterId: internship.recruiterId });
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    // load candidate profile
    const candidateProfile = await CandidateProfile.findOne({ user: candidateUserId });
    console.log('candidateProfile=', candidateProfile ? String(candidateProfile._id) : null);
    if (!candidateProfile) return res.status(404).json({ error: 'Candidate profile not found' });

    // find recruiter profile (multiple fallbacks)
    let recruiterProfile = await findRecruiterProfile(req, internship);
    console.log('findRecruiterProfile initial result=', recruiterProfile ? String(recruiterProfile._id) : null);

    // If not found via findRecruiterProfile, try sensible fallbacks using internship.recruiterId
    if (!recruiterProfile && internship && internship.recruiterId) {
      try {
        const ridStr = String(internship.recruiterId);
        console.log('Fallback: try RecruiterProfile.findOne({ userId: internship.recruiterId }) with', ridStr);
        recruiterProfile = await RecruiterProfile.findOne({ userId: ridStr }).lean().exec();
        if (!recruiterProfile && mongoose.Types.ObjectId.isValid(ridStr)) {
          // maybe recruiterId actually stores profile _id
          recruiterProfile = await RecruiterProfile.findById(ridStr).lean().exec();
        }
        console.log('Fallback result=', recruiterProfile ? String(recruiterProfile._id) : null);
      } catch (e) {
        console.error('Fallback recruiter lookup failed', e && e.message);
      }
    }

    // If still not found, return clear error (schema requires recruiter). Do not attempt create with null recruiter.
    if (!recruiterProfile) {
      console.warn('Recruiter profile not found for internship', String(internship._id), 'recruiterId=', String(internship.recruiterId));
      return res.status(404).json({ error: 'Recruiter profile not found for this internship. Contact admin.' });
    }

    // prepare fields for create
    const recruiterRef = recruiterProfile._id;
    const recruiterName = recruiterProfile.companyName || recruiterProfile.fullName || internship.company || 'Unknown Recruiter';

    console.log('About to create application:', {
      candidateProfile: String(candidateProfile._id),
      internship: String(internship._id),
      recruiterRef: String(recruiterRef),
      recruiterName
    });

    // create application
    const application = await InternshipApplication.create({
      candidate: candidateProfile._id,
      candidateName: candidateProfile.fullName || '',
      internship: internship._id,
      recruiter: recruiterRef,
      recruiterName,
      experienceYears: experienceYears || '',
      resumeUrl: resumeUrl || '',
      status: 'applied',
      createdAt: new Date()
    });

    console.log('Application created id=', String(application._id));

    // notification to candidate
    await Notification.create({
      user: candidateUserId,
      type: 'internship_applied',
      message: `You applied for "${internship.title}"`,
      data: { internshipId, applicationId: application._id }
    });

    // notify recruiter (use recruiterProfile.userId if present)
    let notifyTo = null;
    if (recruiterProfile && recruiterProfile.userId) notifyTo = recruiterProfile.userId;
    else if (internship && internship.recruiterId) notifyTo = internship.recruiterId;
    if (notifyTo && req.app && req.app.get('io')) {
      req.app.get('io').to(String(notifyTo)).emit('newApplication', { applicationId: application._id });
    }

    return res.status(201).json({ message: 'Applied', applicationId: application._id });
  } catch (err) {
    console.error('apply error', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/application/my-applications
router.get('/my-applications', async (req, res) => {
  try {
    const candidateUserId = getCandidateId(req);
    if (!candidateUserId) return res.status(401).json({ error: 'Login required' });

    const candidateProfile = await CandidateProfile.findOne({ user: candidateUserId });
    if (!candidateProfile) return res.status(404).json({ error: 'Candidate profile not found' });

    const applications = await InternshipApplication.find({ candidate: candidateProfile._id })
      .populate({ path: 'internship', select: 'title company location internshipType' })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = applications.map(app => ({
      internshipId: app.internship?._id,
      title: app.internship?.title,
      company: app.internship?.company,
      location: app.internship?.location,
      type: app.internship?.internshipType,
      status: app.status,
      experienceYears: app.experienceYears,
      resumeUrl: app.resumeUrl || '',
      appliedAt: app.createdAt
    }));

    return res.json({ applications: formatted });
  } catch (err) {
    console.error('Fetch applications error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/application/received-applications
// GET /api/application/received-applications
router.get('/received-applications', ensureAuthenticated, ensureRole('recruiter'), async (req, res) => {
  try {
    console.log('REQ HEADERS x-recruiter-id=', req.header('x-recruiter-id'));
    console.log('REQ.user=', req.user && (req.user._id || req.user.id), req.user && req.user.role);

    // find recruiter profile (uses existing helper)
    const recruiterProfile = await findRecruiterProfile(req);
    console.log('DEBUG: recruiterProfile=', recruiterProfile ? String(recruiterProfile._id) : null, 'recruiterProfile.userId=', recruiterProfile ? String(recruiterProfile.userId || '') : null);

    // fallback: if findRecruiterProfile didn't find, try fallback to req.user id
    const recruiterProfileId = recruiterProfile ? recruiterProfile._id : (req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : null);

    // safe check: if still null, return clear error
    if (!recruiterProfileId) {
      console.warn('received-applications: could not resolve recruiter profile id for user', req.user && (req.user._id || req.user.id));
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    // debug counts and sample
    const appsCount = await InternshipApplication.countDocuments({ recruiter: recruiterProfile ? recruiterProfile._id : recruiterProfileId }).catch(e => { console.error('count error', e); return -1; });
    console.log('DEBUG: applications count for recruiterProfile:', appsCount);
    const sampleApps = await InternshipApplication.find({ recruiter: recruiterProfile ? recruiterProfile._id : recruiterProfileId }).limit(5).lean().catch(e => { console.error('find sample error', e); return []; });
    console.log('DEBUG: sampleApps (first 5):', sampleApps.map(a => ({ _id: a._id, candidate: a.candidate, candidateName: a.candidateName, internship: a.internship, status: a.status })));

    // fetch full applications
    const apps = await InternshipApplication.find({ recruiter: recruiterProfile ? recruiterProfile._id : recruiterProfileId })
      .populate({ path: 'candidate', select: 'fullName user' })
      .populate({ path: 'recruiter', select: 'companyName fullName userId' })
      .populate({ path: 'internship', select: 'title company location internshipType recruiterId' })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = apps.map(a => ({
      id: a._id,
      candidateProfileId: a.candidate?._id,
      candidateName: a.candidateName || (a.candidate && a.candidate.fullName) || '',
      candidateUserId: a.candidate && a.candidate.user ? a.candidate.user : null,
      internshipId: a.internship?._id,
      internshipTitle: a.internship?.title || '',
      company: (a.recruiter && a.recruiter.companyName)
        || a.recruiterName
        || (a.internship && a.internship.company)
        || '',
      location: a.internship?.location || '',
      type: a.internship?.internshipType || a.type || '',
      experienceYears: a.experienceYears || '',
      resumeUrl: a.resumeUrl || '',
      status: a.status,
      appliedAt: a.createdAt
    }));

    return res.json({ applications: formatted });
  } catch (err) {
    console.error('received-applications error', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/application/:applicationId
// GET /api/application/:applicationId
router.get('/:applicationId', ensureAuthenticated, async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) return res.status(400).json({ error: 'Invalid id' });

    // load application with populated refs
    const app = await InternshipApplication.findById(applicationId)
      .populate({ path: 'candidate', select: 'fullName user' })
      .populate({ path: 'recruiter', select: 'companyName user userId' })
      .populate({ path: 'internship', select: 'title company location' })
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
      const rp = await findRecruiterProfile(req, app.internship || null);
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

    const application = await InternshipApplication.findById(applicationId)
      .populate({ path: 'candidate', select: 'user fullName' })
      .populate({ path: 'internship', select: 'title' });

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
    const internshipTitle = application.internship ? (application.internship.title || '') : '';

    await Notification.create({
      user: candidateUserId || application.candidate,
      type: 'application_status_update',
      message: `Your application for "${internshipTitle}" is now "${status}"`,
      data: { applicationId: application._id, status }
    });

    const io = req.app.get('io');
    if (io && candidateUserId) {
      io.to(String(candidateUserId)).emit('applicationStatusUpdated', {
        applicationId: application._id,
        status,
        internshipTitle
      });
    }

    return res.json({ message: 'Status updated', application });
  } catch (err) {
    console.error('update-status error', err && (err.stack || err));
    return res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
