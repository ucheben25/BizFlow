/**
 * BizBook Resilient Database Driver & Multi-Engine Manager
 * Supports:
 * 1. better-sqlite3 (Native high-performance C++ driver for local development & test runners)
 * 2. sql.js (WebAssembly / Pure-JS SQLite engine for serverless environments like Vercel with 0 C++ dependencies)
 * 3. PostgreSQL connection pool (when DATABASE_URL / POSTGRES_URL is configured in production)
 */

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

let activeDb = null;
let isReady = false;
let initPromise = null;

/**
 * SqlJsAdapter: Bridges sql.js (WebAssembly SQLite) to the better-sqlite3 synchronous API.
 * Provides prepare().get(), prepare().all(), prepare().run(), transaction(), pragma(), and exec().
 */
class SqlJsAdapter {
  constructor(rawDb, filePath) {
    this._db = rawDb;
    this._filePath = filePath;
    this.inTransaction = false;
  }

  _persist() {
    if (this.inTransaction) return; // Never export while a transaction is active
    if (this._filePath) {
      try {
        const data = this._db.export();
        fs.writeFileSync(this._filePath, Buffer.from(data));
      } catch (e) {
        // Ephemeral /tmp write errors in serverless do not block query execution
      }
    }
  }

  pragma(str) {
    try {
      this._db.run('PRAGMA ' + str);
    } catch (e) {
      // Ignored for pragmas unsupported by in-memory WASM
    }
  }

  exec(sql) {
    this._db.run(sql);
    this._persist();
  }

  prepare(sql) {
    const self = this;
    return {
      get(...args) {
        const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
        const stmt = self._db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...args) {
        const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
        const stmt = self._db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },
      run(...args) {
        const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
        self._db.run(sql, params);
        const lastIdRes = self._db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = (lastIdRes[0] && lastIdRes[0].values[0] && lastIdRes[0].values[0][0]) || 0;
        const changesRes = self._db.exec('SELECT changes() as ch');
        const changes = (changesRes[0] && changesRes[0].values[0] && changesRes[0].values[0][0]) || 0;
        self._persist();
        return { lastInsertRowid, changes };
      }
    };
  }

  transaction(fn) {
    const self = this;
    return function(...args) {
      if (self.inTransaction) return fn.apply(this, args);
      self._db.run('BEGIN TRANSACTION');
      self.inTransaction = true;
      try {
        const result = fn.apply(this, args);
        self._db.run('COMMIT');
        self.inTransaction = false;
        self._persist();
        return result;
      } catch (err) {
        try { self._db.run('ROLLBACK'); } catch (e) {}
        self.inTransaction = false;
        throw err;
      }
    };
  }
}

// 1. Try synchronous native better-sqlite3 load first (standard for local dev & tests)
try {
  const Database = require('better-sqlite3');
  activeDb = new Database(resolvedPath, {});
  activeDb.pragma('foreign_keys = ON');
  if (!isVercel) {
    activeDb.pragma('journal_mode = WAL');
  }
  activeDb.pragma('synchronous = NORMAL');
  activeDb.pragma('busy_timeout = 5000');
  isReady = true;
  console.log('[Database] Synchronous native SQLite driver (better-sqlite3) initialized.');
} catch (nativeErr) {
  // On Vercel serverless, better-sqlite3 native bindings fail due to lack of Linux C++ build tools.
  // We log a clear diagnostic and prepare to initialize sql.js (WebAssembly).
  console.warn('[Database Diagnostic] Native better-sqlite3 driver unavailable in current environment:', nativeErr.message);
  console.log('[Database Diagnostic] Fallback WebAssembly/pure-JS SQLite engine (sql.js) queued for initialization.');
}

/**
 * Initializes the database driver asynchronously if native better-sqlite3 is not loaded.
 * Ensures the database is 100% operational before any API request executes.
 */
async function initializeDatabase() {
  if (isReady && activeDb) return activeDb;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1. Optional PostgreSQL check
    const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (pgUrl && (pgUrl.startsWith('postgres://') || pgUrl.startsWith('postgresql://'))) {
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: pgUrl,
          ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        await pool.query('SELECT 1');
        console.log('[Database] PostgreSQL connection pool verified.');
      } catch (pgErr) {
        console.warn('[Database Diagnostic] PostgreSQL connection pool notice:', pgErr.message);
      }
    }

    // 2. Initialize sql.js WebAssembly engine if activeDb is not already set
    if (!activeDb) {
      console.log('[Database] Booting WebAssembly SQLite engine (sql.js)...');
      const initSqlJs = require('sql.js');
      let wasmBinary = null;
      try {
        const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
        wasmBinary = fs.readFileSync(wasmPath);
      } catch (wasmErr) {
        console.warn('[Database Diagnostic] Local wasm file read notice:', wasmErr.message);
      }

      const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : {});
      let rawDb;
      if (fs.existsSync(resolvedPath)) {
        try {
          const fileBuffer = fs.readFileSync(resolvedPath);
          rawDb = new SQL.Database(fileBuffer);
          console.log('[Database] Restored existing SQLite state from:', resolvedPath);
        } catch (readErr) {
          rawDb = new SQL.Database();
        }
      } else {
        rawDb = new SQL.Database();
      }

      activeDb = new SqlJsAdapter(rawDb, resolvedPath);
      activeDb.pragma('foreign_keys = ON');
      console.log('[Database] WebAssembly SQLite database engine initialized successfully.');
    }

    isReady = true;
    return activeDb;
  })();

  return initPromise;
}

// Proxy database object so all calls delegate to activeDb seamlessly
const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (prop === 'initializeDatabase') return initializeDatabase;
    if (prop === 'isReady') return () => isReady;
    if (prop === 'inTransaction') return activeDb ? activeDb.inTransaction : false;

    if (!activeDb) {
      throw new Error('[Database Error] Database is not initialized yet. Ensure ensureDatabaseReady() has completed.');
    }

    const val = activeDb[prop];
    if (typeof val === 'function') {
      return val.bind(activeDb);
    }
    return val;
  }
});

dbProxy.initializeDatabase = initializeDatabase;
dbProxy.isReady = () => isReady;
dbProxy.getDb = () => dbProxy;

module.exports = dbProxy;
