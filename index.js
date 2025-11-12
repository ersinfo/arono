// index.js — replace your existing file with this
require('dotenv').config();

const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport'); // ensure this exports configured passport
const PORT = process.env.PORT || 3009;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jobportal';
const jwtAuth = require('./middleware/jwt-auth');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: true, credentials: true } });

// connect to mongo
mongoose.connect(MONGO_URI, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB:', MONGO_URI);
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// express setup
app.use(jwtAuth);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// view engine (if you use ejs else keep or remove)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// simple request logger — early so it logs all requests
app.use((req, _, next) => {
  console.log('[REQ]', req.method, req.originalUrl);
  next();
});

// CORS — reflect origin (allows credentials). In production set explicit origin.
app.use(cors({
  origin: true,
  credentials: true
}));

// session (must come before passport.session())
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, ttl: 14 * 24 * 60 * 60 }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    secure: false
  }
}));

// passport (after session)
app.use(passport.initialize());
app.use(passport.session());

// make io available to routes via app.get('io')
app.set('io', io);

// socket.io handlers
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    if (!roomId) return;
    socket.join(String(roomId));
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// -- Route imports (keep requires as in your project) --
const jobRoutes = require('./routes/job');
const candidateRoutes = require('./routes/candidate');
const indexRoutes = require('./routes/index');
const loginRoutes = require('./routes/login');
const signupRoutes = require('./routes/signup');
const signUpFormRoutes = require('./routes/sign-up-form');
const authRoutes = require('./routes/auth'); // optional
const internshipRoutes = require('./routes/internship');
const jobbRoutes = require('./routes/jobb');
const recruiterRoutes = require('./routes/recruiter');
const jobsListRoutes = require('./routes/jobs-list');
const apiLoginRoute = require('./routes/api-login');
const candidateProfileRoutes = require('./routes/candidateProfile');
const recruiterProfileRoutes = require('./routes/recruiterProfile');
// const jwtAuth = require('./middleware/jwt-auth'); // keep but do not mount globally unless intended
const errorHandler = require('./middleware/error-handler');
const internshipApplicationRoutes = require('./routes/internshipApplication');
const jobApplicationRoutes = require('./routes/jobApplication');
const { attachUserFromHeader } = require('./middleware/auth-gate');
// -- Mount routes --
// Note: avoid mounting same routes twice. Keep these in logical order.
app.use('/', jobRoutes);
app.use('/', candidateRoutes);
app.use('/', indexRoutes);
app.use('/', loginRoutes);
app.use('/', signupRoutes);
app.use('/', signUpFormRoutes);
app.use(attachUserFromHeader);
// API namespace
app.use('/api', authRoutes); // auth endpoints
app.use('/api', internshipRoutes);
app.use('/api', jobbRoutes);
app.use('/api', recruiterRoutes);
app.use('/api', candidateRoutes);
app.use('/api', jobsListRoutes);
app.use('/api/login', apiLoginRoute);
app.use('/api/candidate/profile', candidateProfileRoutes);
app.use('/api/recruiter/profile', recruiterProfileRoutes);

// app.js — paste near top, before `app.use('/api', ...)` lines
app.use((req, _, next) => {
  console.log('APP-INCOMING =>', req.method, req.originalUrl);
  next();
});


// application API
app.use('/api/application/internship', internshipApplicationRoutes);
app.use('/api/application/job', jobApplicationRoutes);

// 404 handler
app.use((_, res) => res.status(404).send('Not Found'));

// error handler (last middleware)
app.use(errorHandler);

// start server using http server (so socket.io attaches correctly)
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
