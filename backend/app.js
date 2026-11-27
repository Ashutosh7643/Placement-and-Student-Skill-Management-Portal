const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const driveRoutes = require('./routes/driveRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { protectFrontendPages } = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  const sessionSecret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === 'test' ? 'test-session-secret-key' : null);

  if (!sessionSecret) {
    throw new Error(
      'SESSION_SECRET is not set in environment variables. Copy .env.example to .env and set SESSION_SECRET.'
    );
  }

  app.use(
    session({
      name: 'connect.sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.get('/api/health', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
      success: dbReady,
      status: dbReady ? 'ok' : 'degraded',
      database: dbReady ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/drives', driveRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  const frontendDir = path.join(__dirname, '..', 'frontend');

  // Guard protected Student and Admin HTML pages before static file serving
  app.use(protectFrontendPages);
  app.use(express.static(frontendDir));

  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDir, 'pages', 'index.html'));
  });

  app.use((req, res) => {
    res.status(404).sendFile(path.join(frontendDir, 'pages', 'index.html'));
  });

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
