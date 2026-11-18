/** Password hashing (PBKDF2-SHA256) and DB-backed session cookies. */

export const SESSION_COOKIE = 'nimbus_session';
export const SESSION_DAYS = 7;
const ITERATIONS = 100_000;
const KEY_BYTES = 32;
const encoder = new TextEncoder();

/* --------------------------------------------------------------- encoding */

function toBase64(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomToken(bytes = 32) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return toBase64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* --------------------------------------------------------------- passwords */

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, KEY_BYTES * 8);
  return toBase64(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    hash: await derive(password, salt, ITERATIONS),
    salt: toBase64(salt),
    iterations: ITERATIONS,
  };
}

export async function verifyPassword(password, user) {
  const candidate = await derive(password, fromBase64(user.password_salt), user.password_iterations);
  return constantTimeEqual(candidate, user.password_hash);
}

/**
 * Work factor applied when the account does not exist, so a missing user and a
 * wrong password take roughly the same time to reject.
 */
export const DUMMY_USER = {
  password_salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
  password_hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  password_iterations: ITERATIONS,
};

/* ---------------------------------------------------------------- sessions */

export async function createSession(env, userId) {
  const id = randomToken(32);
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(id, userId, now, expiresAt)
    .run();
  return { id, maxAge: SESSION_DAYS * 24 * 60 * 60, expiresAt };
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

export function sessionCookie(id, maxAge, secure) {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(id)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ');
}

export function clearedSessionCookie(secure) {
  return sessionCookie('', 0, secure);
}

export function isSecureRequest(request) {
  return new URL(request.url).protocol === 'https:';
}

/** Resolve the signed-in user for this request, or null. */
export async function currentUser(env, request) {
  const id = readCookie(request, SESSION_COOKIE);
  if (!id || id.length > 200) return null;

  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.email, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
  )
    .bind(id)
    .first();

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
    return null;
  }
  return row;
}

export async function destroySession(env, request) {
  const id = readCookie(request, SESSION_COOKIE);
  if (!id) return;
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}
