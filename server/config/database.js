const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const isVercel = Boolean(process.env.VERCEL);
const dbPath = isVercel
  ? path.join('/tmp', 'bizflow.db')
  : (process.env.DATABASE_PATH || './data/bizflow.db');
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
const dir = path.dirname(resolvedPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(resolvedPath, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable critical SQLite pragmas for production integrity & speed
db.pragma('foreign_keys = ON');
// On Vercel serverless, use DELETE journal mode (WAL creates extra files
// that can cause issues on ephemeral /tmp filesystem between invocations)
if (!isVercel) {
  db.pragma('journal_mode = WAL');
}
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');

module.exports = db;
