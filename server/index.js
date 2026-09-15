require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { runMigrations } = require('./database/migrations');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize relational database schema
runMigrations();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows self-hosted modern frontend SPA assets
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting for Auth Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});
app.use('/api/auth', authLimiter);

// API Routes
app.use('/api', apiRoutes);

// Serve Frontend Static Assets
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to SPA index.html for unknown client routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Central Error Handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` BizFlow Server running on http://localhost:${PORT}`);
    console.log(` "Run your business. Know your numbers."`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
