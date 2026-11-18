# Nimbus Auth

Three-page authentication site — **signup**, **login**, **profile** — rendered server-side with the
[Mustache](https://mustache.github.io/) template engine on a Cloudflare Worker, with accounts and
sessions stored in D1 (SQLite).

Live: <https://site-b8afb87ef3824ff59e00fcd82ff0ed4c.freebuff.page>

## Pages

| Route | Description |
| --- | --- |
| `GET /signup` | Create-account form: username, email, password + confirmation |
| `POST /signup` | Validates, hashes the password, inserts the user, starts a session, redirects to `/profile` |
| `GET /login` | Login form (username **or** email) |
| `POST /login` | Verifies the password hash, starts a session, redirects to `/profile` |
| `GET /profile` | Signed-in account page showing username, email, member-since and account id |
| `POST /logout` | Deletes the session row and clears the cookie |
| `GET /` | Redirects to `/profile` when signed in, otherwise `/login` |

## How auth works

- **Passwords**: PBKDF2-SHA256, 100,000 iterations, 16-byte random salt per user, 32-byte derived
  key, stored as base64. The plain-text password is never stored or logged.
- **Sessions**: a 256-bit random token is stored in the `sessions` table and sent as an
  `HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` cookie (`Secure` on HTTPS). Logging out deletes the
  row, so a copied cookie stops working immediately.
- **Validation**: username 3–30 chars (`a-z A-Z 0-9 . _ -`), valid email, password ≥ 8 chars,
  matching confirmation, unique username and email (case-insensitive).
- **CSRF**: state-changing `POST`s from a foreign `Origin` or `Sec-Fetch-Site` are rejected with 403.
- **Hardening**: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, and `Cache-Control: no-store` on every page.
- **Escaping**: Mustache escapes all interpolated values, so usernames/emails cannot inject HTML.

## Structure

```
auth-app/
├── src/
│   ├── index.js       router, page handlers, security headers
│   ├── auth.js        PBKDF2 hashing, session tokens and cookies
│   ├── db.js          D1 schema (users, sessions)
│   ├── validation.js  form parsing and field validation
│   └── views.js       Mustache render helper (layout + page partial)
├── views/
│   ├── layout.mustache
│   ├── signup.mustache
│   ├── login.mustache
│   ├── profile.mustache
│   └── not-found.mustache
├── public/style.css   static stylesheet (served via the ASSETS binding)
├── scripts/build.js   esbuild bundle; inlines .mustache templates as strings
└── scripts/auth-test.js  end-to-end test of the whole flow
```

Templates are compiled from strings that esbuild inlines at build time, so the Worker needs no
filesystem access at runtime. The database schema is created on the first request.

## Development

```bash
cd auth-app
npm install
npm run build     # bundle to dist/index.js
npm run dev       # wrangler dev on http://127.0.0.1:8788 with a local D1 database
npm test          # 40+ end-to-end assertions; BASE_URL=… to test another instance
```

Deployment uses `sites-deploy.json` (prebuilt Worker module + `public/` assets) and the `DB` D1
binding in the preview environment.
