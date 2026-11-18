/** D1 schema for accounts and sessions. Created on first request. */

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL,
     username_lower TEXT NOT NULL UNIQUE,
     email TEXT NOT NULL,
     email_lower TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     password_salt TEXT NOT NULL,
     password_iterations INTEGER NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)`,
];

let ready = false;

export async function ensureSchema(env) {
  if (ready) return;
  await env.DB.batch(SCHEMA_STATEMENTS.map((sql) => env.DB.prepare(sql)));
  ready = true;
}

/** Drop expired sessions so the table does not grow forever. */
export async function pruneSessions(env) {
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run();
}
