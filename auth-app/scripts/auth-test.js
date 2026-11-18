/**
 * End-to-end test for the signup / login / profile flow.
 *
 *   node scripts/auth-test.js
 *   BASE_URL=https://example.com node scripts/auth-test.js
 */
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8788').replace(/\/$/, '');

let passed = 0;
const failures = [];

function check(name, condition, extra) {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${name}${extra ? ` — ${extra}` : ''}`);
}

function form(fields) {
  return new URLSearchParams(fields).toString();
}

async function call(method, path, { body, cookie, headers = {}, contentType } = {}) {
  const init = { method, redirect: 'manual', headers: { ...headers } };
  if (cookie) init.headers.cookie = cookie;
  if (body !== undefined) {
    init.headers['content-type'] = contentType ?? 'application/x-www-form-urlencoded';
    init.body = body;
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(20000) });
  } catch (err) {
    return { status: 0, headers: new Headers(), text: '', location: null, error: String(err) };
  }
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, location: res.headers.get('location') };
}

function setCookies(res) {
  return typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);
}

const stamp = Date.now().toString(36);
const account = {
  username: `tester_${stamp}`,
  email: `tester_${stamp}@example.com`,
  password: 'correct-horse-battery-staple',
};

async function main() {
  console.log(`Testing ${BASE}\n`);

  // --- public pages
  const signupPage = await call('GET', '/signup');
  check('GET /signup → 200', signupPage.status === 200, `got ${signupPage.status}`);
  check('signup page has a form posting to /signup', /action="\/signup"/.test(signupPage.text) && /method="post"/i.test(signupPage.text));
  check('signup page is html', (signupPage.headers.get('content-type') || '').includes('text/html'));
  check('stylesheet is linked', /\/style\.css/.test(signupPage.text));
  check('CSP header present', Boolean(signupPage.headers.get('content-security-policy')));
  check('nosniff header present', signupPage.headers.get('x-content-type-options') === 'nosniff');

  const css = await call('GET', '/style.css');
  check('GET /style.css → 200 css', css.status === 200 && (css.headers.get('content-type') || '').includes('text/css'));

  const loginPage = await call('GET', '/login');
  check('GET /login → 200', loginPage.status === 200);
  check('login page mentions username or email', /Username or email/i.test(loginPage.text));

  const anonProfile = await call('GET', '/profile');
  check(
    'GET /profile signed out → 303 /login',
    anonProfile.status === 303 && anonProfile.location === '/login',
    `${anonProfile.status} ${anonProfile.location}`,
  );

  const rootAnon = await call('GET', '/');
  check('GET / signed out → /login', rootAnon.status === 303 && rootAnon.location === '/login');

  // --- validation
  const shortPassword = await call('POST', '/signup', {
    body: form({ username: account.username, email: account.email, password: 'short', confirm: 'short' }),
  });
  check('short password → 400', shortPassword.status === 400, `got ${shortPassword.status}`);
  check('short password shows an error', /at least 8 characters/i.test(shortPassword.text));

  const badEmail = await call('POST', '/signup', {
    body: form({ username: account.username, email: 'not-an-email', password: account.password, confirm: account.password }),
  });
  check('invalid email → 400', badEmail.status === 400 && /email address/i.test(badEmail.text));

  const mismatch = await call('POST', '/signup', {
    body: form({ username: account.username, email: account.email, password: account.password, confirm: 'something else' }),
  });
  check('mismatched passwords → 400', mismatch.status === 400 && /do not match/i.test(mismatch.text));

  const badUsername = await call('POST', '/signup', {
    body: form({ username: 'ab', email: account.email, password: account.password, confirm: account.password }),
  });
  check('too-short username → 400', badUsername.status === 400);

  const wrongType = await call('POST', '/signup', {
    body: JSON.stringify({ username: account.username }),
    contentType: 'application/json',
  });
  check('non-form content type → 400', wrongType.status === 400);

  // --- signup
  const created = await call('POST', '/signup', {
    body: form({ username: account.username, email: account.email, password: account.password, confirm: account.password }),
  });
  check('POST /signup → 303 /profile', created.status === 303 && created.location === '/profile', `${created.status} ${created.location}`);
  const cookies = setCookies(created);
  const sessionCookie = cookies.find((c) => c.startsWith('nimbus_session='));
  check('signup sets a session cookie', Boolean(sessionCookie), cookies.join(' | '));
  check('session cookie is HttpOnly', /HttpOnly/i.test(sessionCookie || ''));
  check('session cookie is SameSite=Lax', /SameSite=Lax/i.test(sessionCookie || ''));
  check('session cookie has a path', /Path=\//i.test(sessionCookie || ''));
  const maxAgeMatch = /Max-Age=(\d+)/.exec(sessionCookie || '');
  check('session cookie has a positive max-age', Boolean(maxAgeMatch) && Number(maxAgeMatch[1]) > 0);
  const cookieHeader = (sessionCookie || '').split(';')[0];

  const profile = await call('GET', '/profile', { cookie: cookieHeader });
  check('GET /profile with session → 200', profile.status === 200, `got ${profile.status}`);
  check('profile shows the username', profile.text.includes(`id="profile-username">${account.username}<`));
  check('profile shows the email', profile.text.includes(`id="profile-email">${account.email}<`));
  check('profile does not leak the password', !profile.text.includes(account.password));
  check('profile does not leak hash internals', !/password_hash|password_salt/.test(profile.text));
  check('signed-in root redirects to /profile', (await call('GET', '/', { cookie: cookieHeader })).location === '/profile');
  check('signed-in /login redirects to /profile', (await call('GET', '/login', { cookie: cookieHeader })).location === '/profile');

  // --- duplicates
  const dupUser = await call('POST', '/signup', {
    body: form({ username: account.username, email: `other_${stamp}@example.com`, password: account.password, confirm: account.password }),
  });
  check('duplicate username → 409', dupUser.status === 409, `got ${dupUser.status}`);
  check('duplicate username explains why', /already taken/i.test(dupUser.text));

  const dupEmail = await call('POST', '/signup', {
    body: form({ username: `other_${stamp}`, email: account.email, password: account.password, confirm: account.password }),
  });
  check('duplicate email → 409', dupEmail.status === 409, `got ${dupEmail.status}`);
  check('duplicate email explains why', /already exists/i.test(dupEmail.text));

  // --- login
  const noUser = await call('POST', '/login', {
    body: form({ identifier: `ghost_${stamp}`, password: account.password }),
  });
  check('unknown account → 401', noUser.status === 401, `got ${noUser.status}`);
  check('unknown account message is generic', /Wrong username or password/i.test(noUser.text));

  const badPass = await call('POST', '/login', {
    body: form({ identifier: account.username, password: 'wrong password' }),
  });
  check('wrong password → 401', badPass.status === 401);

  const byUsername = await call('POST', '/login', {
    body: form({ identifier: account.username, password: account.password }),
  });
  check('login by username → 303', byUsername.status === 303 && byUsername.location === '/profile');
  const loginCookie = (setCookies(byUsername).find((c) => c.startsWith('nimbus_session=')) || '').split(';')[0];
  check('login issues a fresh cookie', Boolean(loginCookie) && loginCookie !== cookieHeader);

  const byEmail = await call('POST', '/login', {
    body: form({ identifier: account.email.toUpperCase(), password: account.password }),
  });
  check('login by email (case-insensitive) → 303', byEmail.status === 303, `got ${byEmail.status}`);

  const profile2 = await call('GET', '/profile', { cookie: loginCookie });
  check('login cookie opens the profile', profile2.status === 200 && profile2.text.includes(account.email));

  // --- session security
  const forged = await call('GET', '/profile', { cookie: 'nimbus_session=forged-token-value' });
  check('forged cookie → redirect to /login', forged.status === 303 && forged.location === '/login');

  const crossSite = await call('POST', '/login', {
    body: form({ identifier: account.username, password: account.password }),
    headers: { origin: 'https://evil.example' },
  });
  check('cross-site POST → 403', crossSite.status === 403, `got ${crossSite.status}`);

  const wrongMethod = await call('GET', '/logout');
  check('GET /logout → 405', wrongMethod.status === 405, `got ${wrongMethod.status}`);

  // --- logout
  const logout = await call('POST', '/logout', { cookie: loginCookie });
  check('POST /logout → 303 /login', logout.status === 303 && logout.location === '/login');
  const cleared = setCookies(logout).find((c) => c.startsWith('nimbus_session='));
  check('logout clears the cookie', Boolean(cleared) && /Max-Age=0/i.test(cleared), cleared);

  const afterLogout = await call('GET', '/profile', { cookie: loginCookie });
  check('session is invalid after logout', afterLogout.status === 303 && afterLogout.location === '/login');

  // --- misc
  const missing = await call('GET', '/nope');
  check('unknown path → 404', missing.status === 404);
  check('404 page is html', /Nothing here/.test(missing.text));

  const formPost = await call('POST', '/profile', { cookie: loginCookie, body: '' });
  check('POST /profile → 405', formPost.status === 405);
}

main()
  .catch((err) => failures.push(`unexpected error: ${err.stack || err}`))
  .finally(() => {
    const total = passed + failures.length;
    console.log(`${passed}/${total} checks passed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log('All checks passed.');
  });
