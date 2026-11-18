/**
 * JSON API.
 *
 * Public routes serve the catalogue and accept an order. Admin routes are
 * authorized on the server for every request: a signed-in visitor is not an
 * administrator unless a row for their `sub` exists in `admins`.
 */
import * as auth from './auth.js';
import * as db from './db.js';
import * as mail from './mail.js';
import { normaliseProduct } from './products.js';
import {
  ApiError,
  CATEGORY_IDS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STATUSES,
  TRANSPORT,
  integer,
  longText,
  oneOf,
  readJson,
  text,
} from './validate.js';

const payments = ['cash', 'telebirr', 'cbe', 'bank', 'installment'];

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
}

/**
 * CSRF defence for state-changing requests: the browser must say the request
 * came from this same origin, either through Origin or through Sec-Fetch-Site.
 * A cross-site form post cannot set either header truthfully.
 */
function requireSameOrigin(request) {
  const target = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin) {
    if (origin !== target) throw new ApiError(403, 'Cross-origin request refused');
    return;
  }
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    throw new ApiError(403, 'Cross-origin request refused');
  }
}

async function requireAdmin(env, session) {
  if (!session) throw new ApiError(401, 'Sign in required');
  await db.touchAdminUser(env.DB, session.id);
  return session;
}

function sessionPayload(session) {
  return session ? { username: session.username, name: session.name || session.username, role: session.role } : null;
}

/** The signed-in person on the storefront: a customer, or the shop owner. */
function viewer(session, user) {
  if (session) return { signedIn: true, role: 'admin', id: session.id, username: session.username, email: '', name: session.name || session.username };
  if (user)
    return {
      signedIn: true,
      role: 'customer',
      id: user.id,
      username: user.username,
      email: user.email || '',
      name: user.name || user.username,
    };
  return { signedIn: false, role: null, id: null, username: '', email: '', name: '' };
}

/** Google sign-in needs the client pair and the exact redirect URI. */
function googleConfig(env, request) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return {
    id: env.GOOGLE_CLIENT_ID,
    secret: env.GOOGLE_CLIENT_SECRET,
    redirect: new URL('/api/auth/google/callback', request.url).toString(),
  };
}

/** A browser redirect that can also set one or more cookies. */
function redirectWith(request, location, cookies) {
  const headers = new Headers({ location: new URL(location, request.url).toString(), 'cache-control': 'no-store' });
  for (const cookie of cookies || []) headers.append('set-cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function cookieResponse(data, status, cookies) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(data), { status, headers });
}

function productFilters(body) {
  return {
    q: text(body.q || '', { field: 'q', max: 80 }),
    status: oneOf(body.status, STATUSES, { field: 'status' }),
    category: oneOf(body.category, CATEGORY_IDS, { field: 'category' }),
    sort: oneOf(body.sort, ['newest', 'oldest', 'updated-desc', 'name-asc', 'price-asc', 'price-desc', 'stock-asc'], {
      field: 'sort',
      fallback: 'newest',
    }),
    page: integer(body.page ?? 1, { field: 'page', min: 1, max: 10000 }) || 1,
    limit: integer(body.limit ?? 20, { field: 'limit', min: 1, max: 50 }) || 20,
  };
}

export async function handleApi(request, env, { session, user }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  if (!env.DB) throw new ApiError(500, 'Database binding is missing');

  /* ---------------------------------------------------------------- public */

  if (path === '/api/health' && method === 'GET') {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM products WHERE status='published'`).first();
    return json({ ok: true, published: row ? row.n : 0, time: new Date().toISOString() });
  }

  if (path === '/api/catalogue' && method === 'GET') {
    const params = url.searchParams;
    const num = (key, fallback) => {
      const n = Number(params.get(key));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
    };
    const data = await db.searchPublicProducts(env.DB, {
      q: text(params.get('q') || '', { field: 'q', max: 80 }),
      cats: (params.get('cat') || '').split(',').filter(Boolean),
      room: params.get('room') || '',
      material: (params.get('material') || '').replace(/[^a-z,-]/g, '').slice(0, 80),
      avail: params.get('avail') || '',
      sort: params.get('sort') || 'featured',
      page: Math.min(10000, num('page', 1)),
      per: Math.min(24, num('per', 12)),
    });
    return json(data, { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } });
  }

  if (path.startsWith('/api/products/') && method === 'GET') {
    const slug = path.slice('/api/products/'.length);
    const product = await db.getPublicProduct(env.DB, slug);
    if (!product) throw new ApiError(404, 'Product not found');
    return json({ product }, { headers: { 'cache-control': 'public, max-age=30' } });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    // Asked once per page: the header needs to know whether to show a Dashboard
    // link, and the sign-in page hides Google / reset until they are configured.
    const who = viewer(session, user);
    const body = {
      ...who,
      googleSignIn: !!googleConfig(env, request),
      emailReset: mail.mailConfigured(env),
    };
    if (who.signedIn) {
      const [wishlist, recent, compare] = await Promise.all([
        db.listWishlistSlugs(env.DB, who.id),
        db.listRecentSlugs(env.DB, who.id),
        db.listCompareSlugs(env.DB, who.id),
      ]);
      body.wishlist = wishlist;
      body.recent = recent;
      body.compare = compare;
    }
    return json(body);
  }

  if (path === '/api/auth/register' && method === 'POST') {
    requireSameOrigin(request);
    const ip = clientIp(request);
    if (!(await db.allow(env.DB, `register:${ip}`, 6, 3600))) {
      throw new ApiError(429, 'Too many accounts created from this connection. Please try again later.');
    }
    const body = await readJson(request, 4096);
    const name = String(body.name || '').trim();
    if (name.length < 2 || name.length > 80) {
      throw new ApiError(422, 'Enter your name', { name: 'Between 2 and 80 characters' });
    }
    const email = auth.normaliseEmail(body.email);
    if (!auth.validEmail(email)) {
      throw new ApiError(422, 'Enter a valid email address', { email: 'For example name@example.com' });
    }
    const problem = auth.passwordProblem(body.password);
    if (problem) throw new ApiError(422, problem, { password: problem });
    if (await db.findUserByEmail(env.DB, email)) {
      throw new ApiError(409, 'An account with this email already exists. Sign in instead.', { email: 'Already registered' });
    }
    const { hash, salt, iterations } = await auth.hashPassword(String(body.password));
    const id = await db.createUser(env.DB, { email, username: email, name, hash, salt, iterations });
    const token = auth.randomToken();
    await db.createUserSession(env.DB, {
      tokenHash: await auth.sha256(token),
      userId: id,
      ip,
      userAgent: request.headers.get('user-agent') || '',
    });
    const who = { signedIn: true, role: 'customer', id, username: email, email, name };
    return cookieResponse({ ok: true, ...who, wishlist: [], recent: [] }, 201, [auth.userCookie(request, token)]);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    requireSameOrigin(request);
    const ip = clientIp(request);
    if (!(await db.allow(env.DB, `login:${ip}`, 20, 900))) {
      throw new ApiError(429, 'Too many sign-in attempts. Try again in a few minutes.');
    }
    const body = await readJson(request, 4096);
    // One kind of account: an email address and a password.
    const email = auth.validEmail(body.email) ? auth.normaliseEmail(body.email) : '';
    const username = email;
    const password = String(body.password || '');
    if (!(await db.allow(env.DB, `login:${ip}:${username}`, 8, 900))) {
      throw new ApiError(429, 'Too many sign-in attempts for this account.');
    }
    const shopper = email ? await db.findUserByEmail(env.DB, email) : null;
    // Hash even when the username is unknown, so response time does not reveal
    // which usernames exist.
    const ok = await auth.verifyPassword(
      password,
      shopper || { password_hash: 'AAAA', password_salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iterations: 100000 }
    );
    if (!shopper || !ok) {
      throw new ApiError(401, 'Wrong email or password', { password: 'Check the email address and password' });
    }
    const token = auth.randomToken();
    await db.createUserSession(env.DB, {
      tokenHash: await auth.sha256(token),
      userId: shopper.id,
      ip,
      userAgent: request.headers.get('user-agent') || '',
    });
    await db.touchUser(env.DB, shopper.id);
    const [wishlist, recent] = await Promise.all([
      db.listWishlistSlugs(env.DB, shopper.id),
      db.listRecentSlugs(env.DB, shopper.id),
    ]);
    return cookieResponse(
      {
        ok: true,
        signedIn: true,
        role: 'customer',
        id: shopper.id,
        username: shopper.username,
        email: shopper.email || '',
        name: shopper.name || shopper.username,
        wishlist,
        recent,
      },
      200,
      [auth.userCookie(request, token)]
    );
  }

  /* ------------------------------------------------------------ google  */

  if (path === '/api/auth/google' && method === 'GET') {
    const cfg = googleConfig(env, request);
    if (!cfg) return redirectWith(request, '/login?auth=google-unconfigured');
    if (!(await db.allow(env.DB, `oauth:${clientIp(request)}`, 30, 900))) {
      return redirectWith(request, '/login?auth=google-busy');
    }
    const state = auth.randomToken(24);
    const nextPath = auth.safeNext(url.searchParams.get('next'));
    const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    target.searchParams.set('client_id', cfg.id);
    target.searchParams.set('redirect_uri', cfg.redirect);
    target.searchParams.set('response_type', 'code');
    target.searchParams.set('scope', 'openid email profile');
    target.searchParams.set('state', state);
    target.searchParams.set('prompt', 'select_account');
    return redirectWith(request, target.toString(), [
      auth.oauthCookie(request, state + '.' + encodeURIComponent(nextPath)),
    ]);
  }

  if (path === '/api/auth/google/callback' && method === 'GET') {
    const cfg = googleConfig(env, request);
    const clear = auth.oauthCookie(request, '');
    if (!cfg) return redirectWith(request, '/login?auth=google-unconfigured', [clear]);
    const state = url.searchParams.get('state') || '';
    const code = url.searchParams.get('code') || '';
    const cookie = auth.parseCookies(request)[auth.OAUTH_COOKIE] || '';
    const parts = cookie.split('.');
    const cookieState = parts[0] || '';
    const nextPath = auth.safeNext(decodeURIComponent(parts[1] || ''));
    if (url.searchParams.get('error')) return redirectWith(request, '/login?auth=google-cancelled', [clear]);
    if (!state || !code || !cookieState || !auth.safeEqual(cookieState, state)) {
      return redirectWith(request, '/login?auth=google-state', [clear]);
    }

    let profile;
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          code,
          client_id: cfg.id,
          client_secret: cfg.secret,
          redirect_uri: cfg.redirect,
          grant_type: 'authorization_code',
        }).toString(),
      });
      if (!tokenRes.ok) {
        console.error('google token exchange failed', tokenRes.status);
        return redirectWith(request, '/login?auth=google-failed', [clear]);
      }
      const tokens = await tokenRes.json();
      const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { authorization: 'Bearer ' + String(tokens.access_token || '') },
      });
      if (!infoRes.ok) return redirectWith(request, '/login?auth=google-failed', [clear]);
      profile = await infoRes.json();
    } catch (error) {
      console.error('google sign-in failed', error && error.message);
      return redirectWith(request, '/login?auth=google-failed', [clear]);
    }

    const email = auth.normaliseEmail(profile.email);
    if (!profile.sub || !auth.validEmail(email) || profile.email_verified === false) {
      return redirectWith(request, '/login?auth=google-email', [clear]);
    }

    let user = await db.findUserByGoogleSub(env.DB, profile.sub);
    if (!user) {
      user = await db.findUserByEmail(env.DB, email);
      if (user) {
        // The same person already signed up with this address: link the Google
        // account to it rather than creating a second profile.
        await db.linkUserGoogle(env.DB, user.id, profile.sub);
      } else {
        const id = await db.createUser(env.DB, {
          email,
          username: email,
          name: String(profile.name || '').slice(0, 80) || email.split('@')[0],
          googleSub: profile.sub,
        });
        user = await db.findUserById(env.DB, id);
      }
    }
    if (!user) return redirectWith(request, '/login?auth=google-failed', [clear]);

    const token = auth.randomToken();
    await db.createUserSession(env.DB, {
      tokenHash: await auth.sha256(token),
      userId: user.id,
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent') || '',
    });
    await db.touchUser(env.DB, user.id);
    return redirectWith(request, nextPath || '/account', [clear, auth.userCookie(request, token)]);
  }

  /* ----------------------------------------------------- password reset  */

  if (path === '/api/auth/forgot' && method === 'POST') {
    requireSameOrigin(request);
    const ip = clientIp(request);
    if (!(await db.allow(env.DB, `forgot:${ip}`, 10, 3600))) {
      throw new ApiError(429, 'Too many reset requests from this connection. Please try again in an hour.');
    }
    const body = await readJson(request, 4096);
    const email = auth.normaliseEmail(body.email);
    if (!auth.validEmail(email)) {
      throw new ApiError(422, 'Enter the email address you signed up with', {
        email: 'For example name@example.com',
      });
    }
    if (!mail.mailConfigured(env)) {
      throw new ApiError(503, 'Password-reset email is not set up on this site yet. Please call the showroom on 0920 282861.');
    }
    // Three links per address per hour, and the same answer whether or not the
    // address has an account, so this endpoint cannot be used to probe emails.
    if (await db.allow(env.DB, `forgot:${email}`, 3, 3600)) {
      const user = await db.findUserByEmail(env.DB, email);
      if (user) {
        const token = auth.randomToken();
        await db.createPasswordReset(env.DB, {
          tokenHash: await auth.sha256(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + auth.RESET_TTL_MS).toISOString(),
        });
        const link = new URL('/reset?token=' + encodeURIComponent(token), request.url).toString();
        await mail.sendPasswordReset(env, { to: email, name: user.name, link, origin: new URL(request.url).origin });
      }
    }
    return json({
      ok: true,
      message: 'If that email has an account, a reset link is on its way. It works for one hour.',
    });
  }

  if (path === '/api/auth/reset' && method === 'POST') {
    requireSameOrigin(request);
    const ip = clientIp(request);
    if (!(await db.allow(env.DB, `reset:${ip}`, 12, 3600))) {
      throw new ApiError(429, 'Too many attempts. Please try again later.');
    }
    const body = await readJson(request, 4096);
    const token = String(body.token || '');
    const problem = auth.passwordProblem(body.password);
    if (problem) throw new ApiError(422, problem, { password: problem });
    if (token.length < 20) throw new ApiError(422, 'That reset link is not valid. Ask for a new one.');
    const row = await db.findPasswordReset(env.DB, await auth.sha256(token));
    if (!row) throw new ApiError(422, 'That reset link is not valid. Ask for a new one.');
    if (row.used_at) throw new ApiError(422, 'That reset link has already been used. Ask for a new one.');
    if (Date.parse(row.expires_at) < Date.now()) {
      throw new ApiError(422, 'That reset link has expired. Ask for a new one.');
    }
    const { hash, salt, iterations } = await auth.hashPassword(String(body.password));
    await db.setUserPassword(env.DB, row.user_id, { hash, salt, iterations });
    await db.usePasswordReset(env.DB, row.token_hash);
    // A reset signs out every other device, so a stolen session cannot ride along.
    await db.clearUserSessions(env.DB, row.user_id);
    const user = await db.findUserById(env.DB, row.user_id);
    if (!user) throw new ApiError(422, 'That account is no longer available.');
    const sessionToken = auth.randomToken();
    await db.createUserSession(env.DB, {
      tokenHash: await auth.sha256(sessionToken),
      userId: user.id,
      ip,
      userAgent: request.headers.get('user-agent') || '',
    });
    const [wishlist, recent] = await Promise.all([
      db.listWishlistSlugs(env.DB, user.id),
      db.listRecentSlugs(env.DB, user.id),
    ]);
    return cookieResponse(
      {
        ok: true,
        signedIn: true,
        role: 'customer',
        id: user.id,
        username: user.username,
        email: user.email || '',
        name: user.name || user.username,
        wishlist,
        recent,
      },
      200,
      [auth.userCookie(request, sessionToken)]
    );
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    requireSameOrigin(request);
    if (session) await db.deleteSession(env.DB, session.tokenHash);
    if (user) await db.deleteUserSession(env.DB, user.tokenHash);
    return cookieResponse({ ok: true }, 200, [
      auth.sessionCookie(request, ''),
      auth.userCookie(request, ''),
    ]);
  }

  /* ------------------------------------------------------------ shoppers */

  if (path === '/api/search' && method === 'GET') {
    const q = text(url.searchParams.get('q') || '', { field: 'q', max: 80 });
    if (!q) return json({ results: [] });
    const data = await db.searchPublicProducts(env.DB, { q, page: 1, per: 6, sort: 'featured' });
    return json(
      {
        results: data.products.map((p) => ({
          slug: p.slug,
          name: p.name,
          imageUrl: p.imageUrl,
          category: p.category,
        })),
        total: data.total,
      },
      { headers: { 'cache-control': 'public, max-age=15' } }
    );
  }

  if (path === '/api/compare' && method === 'GET') {
    const slugs = (url.searchParams.get('slugs') || '').split(',').filter(Boolean).slice(0, 4);
    const products = await db.productsBySlugs(env.DB, slugs);
    return json({ products }, { headers: { 'cache-control': 'public, max-age=20' } });
  }

  // Comparing is an account feature: the shelf lives on the server, so it
  // follows the shopper from phone to laptop.
  if (path === '/api/compare' && method === 'POST') {
    requireSameOrigin(request);
    const who = viewer(session, user);
    if (!who.signedIn) throw new ApiError(401, 'Sign in to compare pieces');
    const body = await readJson(request, 2048);
    if (body.clear === true) {
      await db.clearCompare(env.DB, who.id);
      return json({ ok: true, compare: [] });
    }
    const slug = text(body.slug, { field: 'slug', max: 80, required: true });
    const product = await db.getPublicProduct(env.DB, slug);
    if (!product) throw new ApiError(404, 'Product not found');
    const result = await db.setCompare(env.DB, who.id, slug, body.on !== false);
    return json({ ok: true, compare: result.slugs, limit: result.limit });
  }

  if (path === '/api/account' && method === 'GET') {
    const who = viewer(session, user);
    if (!who.signedIn) throw new ApiError(401, 'Sign in required');
    const [wishlist, recent, compare] = await Promise.all([
      db.productsBySlugs(env.DB, await db.listWishlistSlugs(env.DB, who.id)),
      db.productsBySlugs(env.DB, await db.listRecentSlugs(env.DB, who.id)),
      db.productsBySlugs(env.DB, await db.listCompareSlugs(env.DB, who.id)),
    ]);
    return json({
      user: { name: who.name, username: who.username, email: who.email || '', role: who.role },
      wishlist,
      recent,
      compare,
    });
  }

  if (path === '/api/wishlist' && method === 'POST') {
    requireSameOrigin(request);
    const who = viewer(session, user);
    if (!who.signedIn) throw new ApiError(401, 'Sign in to save pieces');
    const body = await readJson(request, 2048);
    const slug = text(body.slug, { field: 'slug', max: 80, required: true });
    const on = body.on !== false;
    const product = on ? await db.getPublicProduct(env.DB, slug) : { slug };
    if (!product) throw new ApiError(404, 'Product not found');
    const slugs = await db.setWishlist(env.DB, who.id, slug, on);
    return json({ ok: true, on, wishlist: slugs });
  }

  if (path === '/api/recent' && method === 'POST') {
    requireSameOrigin(request);
    const who = viewer(session, user);
    if (!who.signedIn) return json({ ok: false, reason: 'signed-out' });
    const body = await readJson(request, 2048);
    const slug = text(body.slug, { field: 'slug', max: 80, required: true });
    const product = await db.getPublicProduct(env.DB, slug);
    if (!product) throw new ApiError(404, 'Product not found');
    await db.recordView(env.DB, who.id, slug);
    return json({ ok: true });
  }

  return null;
}

export { ApiError };
