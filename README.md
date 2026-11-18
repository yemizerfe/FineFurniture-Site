# Personal Blog API

A REST API for CRUD on a single blogger's articles. Cloudflare Worker (ES modules) + D1 (SQLite),
with a documentation page at the site root.

Live: <https://site-edf5d0d40a1d4739b5664c61c3e35520.freebuff.page> (preview environment)

## Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Status and article count |
| `GET` | `/api/articles` | List articles with filters and pagination |
| `POST` | `/api/articles` | Create an article |
| `GET` | `/api/articles/:idOrSlug` | Fetch one article with its content |
| `PATCH` | `/api/articles/:idOrSlug` | Partially update an article |
| `PUT` | `/api/articles/:idOrSlug` | Replace an article (title and content required) |
| `DELETE` | `/api/articles/:idOrSlug` | Delete an article |
| `GET` | `/api/tags` | Tags in use with article counts |
| `GET` | `/api/blogger` | Blogger profile |
| `PUT` | `/api/blogger` | Update blogger profile |

List query parameters: `status=draft|published`, `tag=<tag>`, `q=<search>`, `limit` (1–50, default 10),
`offset` (default 0), `sort=newest|oldest|title|updated`, `include_content=true`.

## Examples

```bash
BASE=https://site-edf5d0d40a1d4739b5664c61c3e35520.freebuff.page

curl "$BASE/api/articles?status=published&limit=5"

curl -X POST "$BASE/api/articles" \
  -H "content-type: application/json" \
  -d '{"title":"Notes on Edge Functions","content":"Cold starts and CPU budgets.","tags":["edge"],"status":"draft"}'

curl -X PATCH "$BASE/api/articles/notes-on-edge-functions" \
  -H "content-type: application/json" \
  -d '{"status":"published"}'

curl -X DELETE "$BASE/api/articles/42"
```

Responses are wrapped: `{ "data": ... }` on success, `{ "error": { "code", "message", "details" } }` on failure.

## Layout

- `src/index.js` — router, CORS and error boundary
- `src/articles.js` — article CRUD, validation, filtering, pagination
- `src/blogger.js` — profile endpoints and health check
- `src/db.js` — D1 schema bootstrap, seed data, row mapping
- `src/slug.js`, `src/http.js` — slug generation and HTTP helpers
- `public/index.html` — documentation page with a live request runner
- `scripts/build.js` — esbuild bundle into `dist/index.js` (what gets deployed)
- `scripts/smoke-test.js` — end-to-end API checks (59 assertions)

## Development

```bash
npm install
npm run build            # bundle for deployment
npm run dev              # wrangler dev on http://127.0.0.1:8787 (local D1)
npm test                 # smoke test; set BASE_URL to target another instance
```

The schema and seed rows are created by the Worker on first request, so a fresh D1 database works
with no migration step.

## Authentication

This deployment has no accounts: reads and writes are open to anyone with the URL. Before using it
for real content, put a bearer-token check in front of the mutating routes (or front the Worker with
an authenticated proxy) and keep the token in a Worker secret.
