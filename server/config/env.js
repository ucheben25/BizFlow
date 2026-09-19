/**
 * BizBook Environment Configuration & Diagnostics
 * Validates required and optional runtime environment variables without exposing secrets.
 */

require('dotenv').config();

function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  const isVercel = Boolean(process.env.VERCEL);

  // 1. JWT Authentication Secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProd) {
      console.warn('[Security Diagnostic] JWT_SECRET is not set in production. Using fallback secret. For maximum security, configure JWT_SECRET in your Vercel project settings.');
    }
  }

  // 2. Database Configuration
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl) {
    if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
      console.error('[Database Diagnostic] DATABASE_URL must start with postgres:// or postgresql://');
    } else {
      console.log('[Database Diagnostic] PostgreSQL connection URL format verified.');
    }
  } else {
    const dbPath = isVercel ? '/tmp/bizflow.db' : (process.env.DATABASE_PATH || './data/bizflow.db');
    console.log(`[Database Diagnostic] SQLite database target: ${dbPath} (Environment: ${isVercel ? 'Vercel Serverless' : 'Persistent'})`);
  }

  // 3. Payment Gateway (Paystack)
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const paystackPublic = process.env.PAYSTACK_PUBLIC_KEY;
  if (!paystackSecret || !paystackPublic) {
    console.log('[Payment Diagnostic] Paystack API keys not configured. System is operating in test/evaluation checkout mode.');
  } else {
    console.log('[Payment Diagnostic] Paystack payment credentials configured.');
  }

  // 4. Server Base URL
  const appUrl = process.env.APP_URL;
  if (!appUrl && isProd) {
    console.log('[System Diagnostic] APP_URL not explicitly set; defaulting to incoming request origin for callbacks.');
  }
}

module.exports = { validateEnvironment };
