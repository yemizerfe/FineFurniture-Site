# FineFurniture — Debre Markos

A production furniture **gallery and business-information website** for FineFurniture, Debre Markos, Ethiopia.
It is deliberately not an online shop: there is no cart, checkout, payment, inventory, admin panel or pricing.
Shoppers can create an account only to save and compare pieces from the collection.

Live: `https://site-17535a427e0a4894b2f0a2a9146961e1.freebuff.page/`

## Stack

- Cloudflare Workers for the document, SEO metadata, sitemap and JSON API
- D1 for the curated catalogue, accounts, saved and compared pieces
- Plain HTML/CSS/JavaScript for the client (no framework, no runtime dependencies)
- Self-hosted WebP/JPEG photographs and WOFF2 fonts (no image or font CDN at runtime)

## Layout

```
worker.js                 document shell + SEO injection + 404/500 + static routing
src/api.js                JSON API (/api/catalogue, /api/auth/*, /api/wishlist, /api/compare, …)
src/db.js                 schema, gallery seeding, price-free product projection
src/auth.js               PBKDF2 password hashes, signed-in sessions, secure cookies
src/showcase.js           the curated 30-piece collection (single source of truth)
public/index.html         document shell (metadata is completed per route by the worker)
public/assets/js/*.js     source scripts, concatenated into site.min.js
public/assets/css/*.css   source styles, concatenated into site.min.css
public/assets/img/gallery responsive WebP + JPEG variants and intrinsic sizes
public/assets/fonts       self-hosted WOFF2 subsets
tools/build.mjs           CSS/JS/Worker production build
tools/build-images.mjs    regenerates responsive photos, social cover and icons
tools/build-fonts.mjs     regenerates the self-hosted font sheet
tools/check.mjs           syntax, metadata, price-free, image and bundle checks
tools/catalogue/          builds the price-request Word catalogue and the JPG pack from tools/catalogue/catalogue.json
```

## Commands

```bash
npm ci
npm run dev        # wrangler dev on http://localhost:8787
npm run build      # minify CSS/JS + bundle dist/worker.js, prints gzip/brotli sizes
npm test           # fast production checks (no browser needed)
node tools/build-images.mjs   # needs sharp; only when showcase photos change
node tools/build-fonts.mjs    # only when the type changes
```

Always run `npm run build` before deploying: the deployment manifest uploads `dist/worker.js` and `public/`.

## SEO

- Every public route is rendered by the worker with a unique `<title>`, description, canonical URL,
  Open Graph/Twitter tags, robots directive and JSON-LD. Product pages include `Product`,
  `BreadcrumbList`, the shop `FurnitureStore` record and the site `WebSite` record.
- `/sitemap.xml` lists the static pages and every published piece; `/robots.txt` allows the public
  gallery and blocks `/api/`, account, comparison, auth and search URLs.
- Unknown paths and unknown product slugs return a real **404** (not a 200 app shell), private pages are
  `noindex`, and trailing slashes redirect with a 301.
- Address, phone, opening hours and the three showrooms in the structured data are the details the shop
  supplied. There are no invented ratings, reviews, prices or certifications.

## Performance

- One deferred JS bundle and one CSS file, both minified and compressed by the platform.
- Responsive images: 480/960/1440 WebP with a JPEG fallback, explicit `width`/`height`, `srcset`/`sizes`,
  lazy loading below the fold and a preloaded, high-priority hero image.
- Long-lived caching: photographs and fonts are `immutable` for a year, CSS/JS for a week, HTML revalidated.
- No third-party fonts, analytics or trackers. Reduced-motion and save-data friendly.
- Current build (raw / gzip / brotli): CSS ≈ 129 / 24 / 20 kB, JS ≈ 149 / 44 / 36 kB, Worker ≈ 107 / 27 / 23 kB.

## Security

- HTTPS + HSTS, `nosniff`, `DENY` framing, strict referrer policy, permissions policy, same-origin COOP/CORP.
- A strict CSP with per-response hashes for the injected JSON-LD and no inline script execution.
- PBKDF2 password hashing at 100,000 iterations (the Workers WebCrypto maximum), HttpOnly/SameSite cookies,
  same-origin checks on mutations, server-side validation, and rate limits on auth and write endpoints.
- API errors never expose stack traces, database errors or environment values; unexpected failures are
  logged server-side and visitors get a friendly message or the static `/500.html` page.

## Privacy

`/privacy` explains exactly what is stored (name, email, password hash, saved/compared/recently viewed
pieces, session cookie and short-lived abuse logs), why, and how to ask for deletion. There is no analytics,
advertising or tracking. Account deletion is handled by the shop on request — there is no self-service button.

## Deployment

`sites-deploy.json` points at `dist/worker.js` and `public/`. Deploy preview with the Sites
tools; **do not publish production without the owner's instruction**. Secrets (Google OAuth and reset-email
provider, if the owner enables them) belong in the hosting dashboard, never in this repository.
Development configuration lives in `wrangler.local.jsonc`; production configuration is created by the
deployment platform.

## Known limitations

- Google sign-in and password-reset email stay hidden until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and
  `RESEND_API_KEY`/`MAIL_FROM` are configured as deployment secrets.
- No self-service account deletion yet; the privacy page explains the phone/visit route.
- Automated Lighthouse/Core Web Vitals runs are not part of `npm test`; the build reports bundle sizes and
  the site is structured for the LCP/CLS/INP targets, but field data requires the deployed site and traffic.
