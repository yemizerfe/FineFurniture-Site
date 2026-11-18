/**
 * Owner accounts: username + password, stored as PBKDF2 hashes, with opaque
 * session cookies kept in D1.
 *
 * Nothing secret is ever stored in plain text: the password is hashed with a
 * per-account random salt, and the session cookie value is stored only as a
 * SHA-256 digest, so a database leak does not hand out live sessions.
 */

// Cloudflare Workers' WebCrypto refuses PBKDF2 above 100,000 iterations, so
// this is the strongest cost the platform will actually run.
const ITERATIONS = 100000;
const MAX_ITERATIONS = 100000;
const SESSION_DAYS = 7;
const COOKIE = 'ff_admin';
const USER_COOKIE = 'ff_user';
const USER_SESSION_DAYS = 30;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

const enc = new TextEncoder();

function toB64(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

function fromB64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltB64, iterations = ITERATIONS) {
  const rounds = Math.min(Number(iterations) || ITERATIONS, MAX_ITERATIONS);
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, key, 256);
  return { hash: toB64(new Uint8Array(bits)), salt: toB64(salt), iterations: rounds };
}

/** Constant-time comparison, so a wrong password cannot be timed out byte by byte. */
export function safeEqual(a, b) {
  const left = enc.encode(String(a || ''));
  const right = enc.encode(String(b || ''));
  let diff = left.length ^ right.length;
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}

export async function verifyPassword(password, row) {
  if (!row || !row.password_hash || !row.password_salt) return false;
  const { hash } = await hashPassword(password, row.password_salt, Number(row.iterations) || ITERATIONS);
  return safeEqual(hash, row.password_hash);
}

export function normaliseUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function validUsername(value) {
  return USERNAME_RE.test(normaliseUsername(value));
}

/** "Weak" here means: too short to survive a guessing attack on a public shop. */
export function passwordProblem(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Use at least 8 characters';
  if (value.length > 200) return 'Use at most 200 characters';
  if (/^(.)\1+$/.test(value)) return 'Use something less repetitive';
  return '';
}

export function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  const out = {};
  header.split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index < 0) return;
    const name = part.slice(0, index).trim();
    if (!name) return;
    out[name] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return out;
}

export function sessionCookie(request, token, maxAge = SESSION_DAYS * 86400) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  if (!token) return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

/** The customer cookie. Kept separate from the owner cookie so an owner and a
 * shopper can be signed in at the same time on the same browser. */
export function userCookie(request, token, maxAge = USER_SESSION_DAYS * 86400) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  if (!token) return `${USER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  return `${USER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function readUserSession(request, db) {
  const token = parseCookies(request)[USER_COOKIE];
  if (!token || token.length < 20) return null;
  const row = await db
    .prepare(
      `SELECT s.token_hash, s.expires_at, u.id, u.username, u.email, u.name
         FROM user_sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND u.status = 'active'`
    )
    .bind(await sha256(token))
    .first();
  if (!row) return null;
  if (Date.parse(row.expires_at) < Date.now()) {
    await db.prepare(`DELETE FROM user_sessions WHERE token_hash = ?`).bind(row.token_hash).run();
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    email: row.email || '',
    name: row.name,
    role: 'customer',
    tokenHash: row.token_hash,
  };
}

export async function readSession(request, db) {
  const token = parseCookies(request)[COOKIE];
  if (!token || token.length < 20) return null;
  const row = await db
    .prepare(
      `SELECT s.token_hash, s.expires_at, a.id, a.username, a.name, a.role, a.last_seen
         FROM sessions s JOIN admin_users a ON a.id = s.admin_id
        WHERE s.token_hash = ?`
    )
    .bind(await sha256(token))
    .first();
  if (!row) return null;
  if (Date.parse(row.expires_at) < Date.now()) {
    await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(row.token_hash).run();
    return null;
  }
  return { id: row.id, username: row.username, name: row.name, role: row.role, tokenHash: row.token_hash };
}

/* ---------------------------------------------------------- shopper emails */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validEmail(value) {
  const email = normaliseEmail(value);
  return email.length <= 254 && EMAIL_RE.test(email);
}

/** Short-lived cookie carrying the OAuth state and the page to return to. */
export const OAUTH_COOKIE = 'ff_oauth';

export function oauthCookie(request, value, maxAge = 600) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  if (!value) return `${OAUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  return `${OAUTH_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** Only same-site paths, so a reset or sign-in link can never be an open redirect. */
export function safeNext(value) {
  const next = String(value || '');
  if (!next || next[0] !== '/' || next[1] === '/' || next.indexOf('\\') > -1) return '';
  if (next.indexOf('/admin') === 0 || next.indexOf('/api') === 0) return '';
  return next.slice(0, 300);
}

export const RESET_TTL_MS = 60 * 60 * 1000;

export const SESSION_TTL_DAYS = SESSION_DAYS;
export const SESSION_COOKIE = COOKIE;
