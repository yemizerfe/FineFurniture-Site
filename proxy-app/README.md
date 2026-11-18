# Proxy Server API

An HTTP proxy you call as an API: **send a target URL, method, headers and body; get the upstream
response back.**

Live: <https://site-05484c83a1a3491194eb4935634d34d9.freebuff.page>

## Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/proxy` | Forward a request described by a JSON payload |
| `GET` | `/api/proxy?url=…&header.X-Foo=bar` | Forward a GET |
| `GET` | `/api/health` | Status + limits |
| `GET` | `/` | Docs page with a live tester |

### Request payload

```json
{
  "url": "https://api.example.com/v1/items",
  "method": "POST",
  "headers": { "authorization": "Bearer TOKEN" },
  "body": { "name": "widget" },
  "timeout_ms": 10000,
  "follow_redirects": true,
  "passthrough": false
}
```

- `url` (alias `request_url`) — required, `http`/`https` only.
- `method` — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS (default GET). GET/HEAD cannot send a body.
- `headers` — object, or an array of `{ "name", "value" }`. Only these are forwarded.
- `body` — string, or an object (serialised to JSON, with `content-type: application/json` unless set).
- `timeout_ms` — 1 000–25 000, default 15 000.
- `follow_redirects` — default `true`; `false` returns the 3xx with its `location` header.
- `passthrough` — `true` streams the upstream response (status, headers, body) instead of wrapping it.

### Response envelope

```json
{
  "data": {
    "request": { "url": "…", "method": "POST", "headers": {}, "body_bytes": 21, "timeout_ms": 15000 },
    "response": {
      "status": 201, "ok": true, "url": "…", "redirected": false,
      "headers": { "content-type": "application/json" },
      "content_type": "application/json",
      "body_encoding": "json",
      "body": { "id": 42 },
      "bytes": 15, "truncated": false, "duration_ms": 84
    }
  }
}
```

`body_encoding` is `json` (parsed), `utf8` (text) or `base64` (binary).

## Errors

Proxy-level failures use proper status codes with `{ "error": { "code", "message", "details" } }`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `missing_url`, `invalid_url`, `unsupported_protocol` | Bad target |
| 400 | `unsupported_method`, `body_not_allowed` | Bad method or a body on GET/HEAD |
| 400 | `invalid_headers`, `too_many_headers`, `invalid_timeout` | Bad options |
| 400 | `credentials_in_url`, `self_reference` | URL embeds credentials / points at the proxy |
| 403 | `blocked_target` | Private, loopback, link-local or metadata host |
| 413 | `request_body_too_large`, `response_too_large` | Over the size limit |
| 502 | `upstream_unreachable` | Connection failed |
| 504 | `upstream_timeout` | Upstream exceeded `timeout_ms` |

An upstream 4xx/5xx is **not** a proxy error: the proxy returns 200 with
`data.response.status` set to the upstream status (use `passthrough` if you need the raw status).

## Guardrails

- Only `http`/`https`; URLs with embedded credentials are rejected.
- SSRF protection: `localhost`, `*.local`, `*.internal`, `*.home.arpa`, and private / loopback /
  link-local / CGNAT / metadata IPs (`127/8`, `10/8`, `172.16/12`, `192.168/16`, `100.64/10`,
  `169.254/16`, `::1`, `fc00::/7`, `fe80::/10`) are refused.
- The proxy refuses to call itself (loop protection).
- Request bodies ≤ 512 KB, responses capped at 2 MB (truncated and flagged), timeouts ≤ 25 s.
- Hop-by-hop headers (`connection`, `transfer-encoding`, `host`, …) are dropped and recomputed.
- No state is stored: nothing about your requests is persisted.

**Caveat:** the deployment is open — anyone with the link can proxy through it. The limits above
bound abuse, but add an access token before pointing it at private APIs. Hostname checks happen
before DNS resolution, so a public hostname that resolves to a private address is not caught.

## Development

```bash
cd proxy-app
npm install
npm run build                      # bundle to dist/index.js
node scripts/echo-server.js 9099   # local upstream for tests
npm run dev                        # wrangler dev on http://127.0.0.1:8789
npm test                           # proxy-test.js against the local echo server
```

`wrangler.jsonc` sets `ALLOW_PRIVATE_TARGETS=1` so local tests can reach `127.0.0.1`; the deployed
Worker does not set it, so private targets stay blocked there.

## Structure

- `src/proxy.js` — guardrails, payload validation, forwarding, body decoding
- `src/index.js` — routes, CORS, error mapping
- `public/index.html` — docs + live tester
- `scripts/echo-server.js` — local upstream used by the tests
- `scripts/proxy-test.js` — end-to-end checks (add `PRIVATE_BLOCKED=1` for the deployed run)
