/**
 * Nimbus accounts — three server-rendered pages plus the auth flow.
 *
 *   GET  /           redirect to /profile (signed in) or /login
 *   GET  /signup     signup form          POST /signup   create account + session
 *   GET  /login      login form           POST /login    verify credentials + session
 *   GET  /profile    the account page (session required)
 *   POST /logout     destroy session
 *
 * All HTML comes from Mustache templates (src/views.js). State lives in D1:
 * `users` rows plus `sessions` rows referenced by an HttpOnly cookie.
 */

import { ensureSchema, pruneSessions } from './db.js';
import {
  DUMMY_USER,
  clearedSessionCookie,
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  isSecureRequest,
  sessionCookie,
  verifyPassword,
} from './auth.js';
import { formatDate, initials, renderPage } from './views.js';
import { readForm, validateLogin, validateSignup } from './validation.js';
import loginView from '../views/login.mustache';
import signupView from '../views/signup.mustache';
import profileView from '../views/profile.mustache';
import notFoundView from '../views/not-found.mustache';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'content-security-policy':
    "default-src 'self'; style-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      ...SECURITY_HEADERS,
      ...headers,
    },
  });
}

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 303,
    headers: { location, 'cache-control': 'no-store', ...SECURITY_HEADERS, ...headers },
  });
}

/** Reject state-changing posts that a browser reports as coming from another site. */
function isCrossSite(request, url) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== url.host) return true;
    } catch {
      return true;
    }
  }
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return true;
  return false;
}

function viewUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    joined: formatDate(row.created_at),
    initials: initials(row.username),
  };
}

function fieldFlags(field) {
  return {
    field_is_username: field === 'username',
    field_is_email: field === 'email',
    field_is_password: field === 'password',
    field_is_confirm: field === 'confirm',
    field_is_identifier: field === 'identifier',
  };
}

function renderSignup({ error = '', field = null, values = {} } = {}, status = 200) {
  return html(
    renderPage(signupView, {
      title: 'Create your account · Nimbus',
      error,
      values,
      user: null,
      ...fieldFlags(field),
    }),
    status,
  );
}

function renderLogin({ error = '', notice = '', values = {}, field = null } = {}, status = 200) {
  return html(
    renderPage(loginView, {
      title: 'Log in · Nimbus',
      error,
      notice,
      values,
      user: null,
      ...fieldFlags(field),
    }),
    status,
  );
}

function renderProfile(row) {
  return html(
    renderPage(profileView, {
      title: `${row.username} · Nimbus`,
      user: viewUser(row),
      session_expires: formatDate(new Date(row.expires_at).toISOString()),
    }),
  );
}

/* ------------------------------------------------------------------ signup */

async function handleSignup(request, env) {
  const form = await readForm(request);
  if (!form) return renderSignup({ error: 'Submit the form from the signup page.' }, 400);

  const { values, field, error } = validateSignup(form);
  if (error) return renderSignup({ error, field, values }, 400);

  const username = form.username.trim();
  const email = form.email.trim();
  const usernameLower = username.toLowerCase();
  const emailLower = email.toLowerCase();

  const clashes = await env.DB.prepare(
    'SELECT username_lower, email_lower FROM users WHERE username_lower = ? OR email_lower = ?',
  )
    .bind(usernameLower, emailLower)
    .all();
  const rows = clashes.results ?? [];

  if (rows.some((row) => row.username_lower === usernameLower)) {
    return renderSignup(
      { error: `The username "${username}" is already taken. Try another one.`, field: 'username', values },
      409,
    );
  }
  if (rows.some((row) => row.email_lower === emailLower)) {
    return renderSignup(
      { error: 'An account with that email already exists. Log in instead.', field: 'email', values },
      409,
    );
  }

  const { hash, salt, iterations } = await hashPassword(form.password);

  let userId;
  try {
    const result = await env.DB.prepare(
      `INSERT INTO users (
         username, username_lower, email, email_lower,
         password_hash, password_salt, password_iterations, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(username, usernameLower, email, emailLower, hash, salt, iterations, new Date().toISOString())
      .run();
    userId = result.meta.last_row_id;
  } catch (err) {
    console.error('Signup insert failed:', err);
    return renderSignup(
      { error: 'Could not create that account. Try a different username or email.', values },
      409,
    );
  }

  const session = await createSession(env, userId);
  await pruneSessions(env);

  return redirect('/profile', {
    'set-cookie': sessionCookie(session.id, session.maxAge, isSecureRequest(request)),
  });
}

/* ------------------------------------------------------------------- login */

async function handleLogin(request, env) {
  const form = await readForm(request);
  if (!form) return renderLogin({ error: 'Submit the form from the login page.' }, 400);

  const { values, error } = validateLogin(form);
  if (error) return renderLogin({ error, values }, 400);

  const key = form.identifier.trim().toLowerCase();

  const user = await env.DB.prepare('SELECT * FROM users WHERE username_lower = ? OR email_lower = ?')
    .bind(key, key)
    .first();

  if (!user) {
    // Burn comparable time so a missing account is not obviously faster.
    await verifyPassword(form.password, DUMMY_USER);
    return renderLogin({ error: 'Wrong username or password.', values }, 401);
  }

  const valid = await verifyPassword(form.password, user);
  if (!valid) return renderLogin({ error: 'Wrong username or password.', values }, 401);

  const session = await createSession(env, user.id);
  await pruneSessions(env);

  return redirect('/profile', {
    'set-cookie': sessionCookie(session.id, session.maxAge, isSecureRequest(request)),
  });
}

/* ------------------------------------------------------------------ router */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    try {
      await ensureSchema(env);
      const user = await currentUser(env, request);

      if (method === 'POST' && isCrossSite(request, url)) {
        return html(
          renderPage(notFoundView, { title: 'Request blocked · Nimbus', user: user ? viewUser(user) : null }),
          403,
        );
      }

      if (url.pathname === '/') return redirect(user ? '/profile' : '/login');

      if (url.pathname === '/signup') {
        if (user) return redirect('/profile');
        if (method === 'GET') return renderSignup();
        if (method === 'POST') return handleSignup(request, env);
        return html('Method not allowed', 405, { allow: 'GET, POST' });
      }

      if (url.pathname === '/login') {
        if (user) return redirect('/profile');
        if (method === 'GET') return renderLogin();
        if (method === 'POST') return handleLogin(request, env);
        return html('Method not allowed', 405, { allow: 'GET, POST' });
      }

      if (url.pathname === '/profile') {
        if (method !== 'GET') return html('Method not allowed', 405, { allow: 'GET' });
        if (!user) return redirect('/login');
        return renderProfile(user);
      }

      if (url.pathname === '/logout') {
        if (method !== 'POST') return html('Method not allowed', 405, { allow: 'POST' });
        await destroySession(env, request);
        return redirect('/login', { 'set-cookie': clearedSessionCookie(isSecureRequest(request)) });
      }

      // Static files (stylesheet, icon) come from the assets bundle.
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;

      return html(renderPage(notFoundView, { title: 'Not found · Nimbus', user: user ? viewUser(user) : null }), 404);
    } catch (err) {
      console.error('Request failed:', url.pathname, err);
      return html(renderPage(notFoundView, { title: 'Something broke · Nimbus', user: null }), 500);
    }
  },
};
