require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { validateEnvironment } = require('./config/env');
const { initializeDatabase } = require('./config/database');
const { runMigrations } = require('./database/migrations');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

// Validate environment variables on startup
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 5000;

let isDatabaseReady = false;
let dbInitPromise = null;

/**
 * Ensures the database driver is loaded, schema migrations are applied,
 * and preview seed data is created if running in ephemeral Vercel environments.
 */
async function ensureDatabaseReady() {
  if (isDatabaseReady) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    // 1. Initialize driver (native better-sqlite3 or fallback WebAssembly sql.js)
    await initializeDatabase();

    // 2. Initialize relational database schema
    runMigrations();

    // 3. Auto-seed demo data if demo user missing or on Vercel preview environments
    try {
      const db = require('./config/database');
      const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@bizbook.app');
      if (!demoUser || process.env.VERCEL) {
        const { seedDemoData } = require('./database/seedDemo');
        seedDemoData();
      }
    } catch (err) {
      console.warn('[Demo Seed Diagnostic]', err.message);
    }

    isDatabaseReady = true;
  })();

  return dbInitPromise;
}

// Immediate eager initialization for persistent servers
if (process.env.NODE_ENV !== 'test') {
  ensureDatabaseReady().catch(err => {
    console.error('[Startup Database Notice]', err.message);
  });
}

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows self-hosted modern frontend SPA assets
}));
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting for Auth Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});
app.use('/api/auth', authLimiter);

// Middleware: Ensure database is initialized before any API request executes
app.use('/api', async (req, res, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (err) {
    console.error('[Database Invocation Failure]', err);
    return res.status(500).json({
      success: false,
      error: 'Database initialization failed. Please check server logs for diagnostic details.'
    });
  }
});

// API Routes
app.use('/api', apiRoutes);

// Serve Frontend Static Assets for local Express environments
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to SPA index.html for unknown client routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Central Error Handler
app.use(errorHandler);

// Only bind and listen on TCP port when NOT running inside Vercel serverless functions
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` BizBook Server running on http://localhost:${PORT}`);
    console.log(` "Run your business. Know your numbers."`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
