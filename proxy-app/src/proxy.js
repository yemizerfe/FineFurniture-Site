/**
 * The forwarding core.
 *
 * A request is described by: target URL, method, headers, body, timeout,
 * redirect policy and whether the response is returned as JSON or piped through
 * verbatim. Everything here runs inside the Worker; no state is kept.
 */

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const MAX_REQUEST_BODY = 512 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 25_000;
const MAX_HEADERS = 60;

/** Headers the proxy recomputes or that only make sense on a single hop. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'accept-encoding',
]);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'instance-data',
  'metadata.google.internal',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa', '.lan', '.intranet', '.svc'];

export const LIMITS = {
  max_request_body_bytes: MAX_REQUEST_BODY,
  max_response_bytes: MAX_RESPONSE_BYTES,
  timeout_ms: { min: MIN_TIMEOUT_MS, max: MAX_TIMEOUT_MS, default: DEFAULT_TIMEOUT_MS },
  max_headers: MAX_HEADERS,
  methods: [...ALLOWED_METHODS],
};

export class ProxyError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* ------------------------------------------------------------ target guard */

function parseIpv4(host) {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const nums = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    nums.push(n);
  }
  return nums;
}

function isPrivateIpv4([a, b]) {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

export function isPrivateAddress(host) {
  const bare = host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  const v4 = parseIpv4(bare);
  if (v4) return isPrivateIpv4(v4);

  if (bare === '::1' || bare === '::' || bare === '0:0:0:0:0:0:0:1') return true;
  if (/^f[cd][0-9a-f]{2}:/.test(bare)) return true; // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]:/.test(bare)) return true; // fe80::/10 link local
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(bare);
  if (mapped) {
    const parsed = parseIpv4(mapped[1]);
    return parsed ? isPrivateIpv4(parsed) : true;
  }
  return false;
}

/**
 * Reject schemes, embedded credentials, self-references and — unless the local
 * dev config opts in — private/loopback/link-local targets (SSRF protection).
 */
export function checkTarget(url, { env, selfHost } = {}) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ProxyError(400, 'unsupported_protocol', 'Only http:// and https:// URLs can be proxied.', {
      protocol: url.protocol,
    });
  }
  if (url.username || url.password) {
    throw new ProxyError(400, 'credentials_in_url', 'Remove credentials from the URL and send them as headers instead.');
  }
  const host = url.hostname.toLowerCase();
  if (!host) throw new ProxyError(400, 'invalid_url', 'The URL has no host.');

  if (selfHost && (host === selfHost || host === `www.${selfHost}`)) {
    throw new ProxyError(400, 'self_reference', 'This proxy will not call itself. Point the URL at your own API.');
  }

  if (env && env.ALLOW_PRIVATE_TARGETS === '1') return; // local development only

  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new ProxyError(403, 'blocked_target', 'Private, loopback and metadata hostnames cannot be proxied.', { host });
  }
  if (isPrivateAddress(host)) {
    throw new ProxyError(403, 'blocked_target', 'Private, loopback and link-local IP addresses cannot be proxied.', { host });
  }
}

/* ------------------------------------------------------------ normalisation */

export function normalizeHeaders(input) {
  const out = {};

  const assign = (name, value) => {
    if (name === undefined || name === null) return;
    const key = String(name).trim().toLowerCase();
    if (!key) return;
    if (HOP_BY_HOP.has(key)) return;
    const stringValue = value === undefined || value === null ? '' : String(value);
    if (/[\r\n]/.test(key) || /[\r\n]/.test(stringValue)) {
      throw new ProxyError(400, 'invalid_header', 'Header names and values cannot contain newlines.');
    }
    out[key] = stringValue;
  };

  if (input === undefined || input === null) return out;

  if (Array.isArray(input)) {
    if (input.length > MAX_HEADERS) {
      throw new ProxyError(400, 'too_many_headers', `At most ${MAX_HEADERS} headers can be forwarded.`);
    }
    for (const entry of input) {
      if (!entry || typeof entry !== 'object') {
        throw new ProxyError(400, 'invalid_headers', 'Each header entry must look like {"name": "...", "value": "..."}.');
      }
      assign(entry.name ?? entry.key, entry.value);
    }
    return out;
  }

  if (typeof input !== 'object') {
    throw new ProxyError(400, 'invalid_headers', '"headers" must be an object or an array of {name, value} pairs.');
  }

  const keys = Object.keys(input);
  if (keys.length > MAX_HEADERS) {
    throw new ProxyError(400, 'too_many_headers', `At most ${MAX_HEADERS} headers can be forwarded.`);
  }
  for (const key of keys) assign(key, input[key]);
  return out;
}

export function normalizeRequest(payload, { env, selfHost } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ProxyError(400, 'invalid_payload', 'Send a JSON object with "url", "headers" and "body".');
  }

  const rawUrl = payload.url ?? payload.request_url;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new ProxyError(400, 'missing_url', 'Provide the target URL as "url" (alias: "request_url").');
  }
  if (rawUrl.length > 4096) {
    throw new ProxyError(400, 'url_too_long', 'The target URL must be at most 4096 characters.');
  }

  let target;
  try {
    target = new URL(rawUrl.trim());
  } catch {
    throw new ProxyError(400, 'invalid_url', 'That is not a valid absolute URL.', { url: rawUrl.slice(0, 200) });
  }
  checkTarget(target, { env, selfHost });

  const method = String(payload.method ?? 'GET').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    throw new ProxyError(400, 'unsupported_method', `Method must be one of ${[...ALLOWED_METHODS].join(', ')}.`, {
      method,
    });
  }

  const headers = normalizeHeaders(payload.headers);

  let body;
  if (payload.body !== undefined && payload.body !== null) {
    if (method === 'GET' || method === 'HEAD') {
      throw new ProxyError(400, 'body_not_allowed', `${method} requests cannot carry a body.`);
    }
    if (typeof payload.body === 'string') {
      body = payload.body;
    } else if (typeof payload.body === 'object') {
      body = JSON.stringify(payload.body);
      if (!headers['content-type']) headers['content-type'] = 'application/json';
    } else {
      body = String(payload.body);
    }
    const size = new TextEncoder().encode(body).byteLength;
    if (size > MAX_REQUEST_BODY) {
      throw new ProxyError(413, 'request_body_too_large', `Request bodies are limited to ${MAX_REQUEST_BODY} bytes.`, {
        bytes: size,
      });
    }
  }

  let timeoutMs = payload.timeout_ms === undefined ? DEFAULT_TIMEOUT_MS : Number(payload.timeout_ms);
  if (!Number.isFinite(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    throw new ProxyError(
      400,
      'invalid_timeout',
      `"timeout_ms" must be a number between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}.`,
    );
  }
  timeoutMs = Math.round(timeoutMs);

  return {
    target,
    method,
    headers,
    body,
    timeoutMs,
    follow: payload.follow_redirects !== false,
    passthrough: payload.passthrough === true,
  };
}

/* ------------------------------------------------------------------ decode */

const TEXTUAL =
  /^(text\/|application\/(json|xml|javascript|graphql|x-www-form-urlencoded|ecmascript|x-ndjson|ld\+json)|image\/svg\+xml)/i;

function encodeBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeBody(bytes, contentType) {
  if (!bytes.byteLength) return { encoding: 'utf8', body: '' };
  const type = contentType.toLowerCase();

  if (type.includes('json')) {
    const text = new TextDecoder().decode(bytes);
    try {
      return { encoding: 'json', body: JSON.parse(text) };
    } catch {
      return { encoding: 'utf8', body: text };
    }
  }
  if (!type || TEXTUAL.test(type)) {
    return { encoding: 'utf8', body: new TextDecoder().decode(bytes) };
  }
  return { encoding: 'base64', body: encodeBase64(bytes) };
}

function headersToObject(headers) {
  const out = {};
  for (const [key, value] of headers) {
    out[key] = out[key] ? `${out[key]}, ${value}` : value;
  }
  return out;
}

function describeRequest(spec) {
  return {
    url: spec.target.toString(),
    method: spec.method,
    headers: spec.headers,
    body_bytes: spec.body === undefined ? 0 : new TextEncoder().encode(spec.body).byteLength,
    timeout_ms: spec.timeoutMs,
    follow_redirects: spec.follow,
    passthrough: spec.passthrough,
  };
}

function upstreamFailure(err, spec) {
  const message = String(err?.message ?? err);
  if (err?.name === 'AbortError' || /abort|timed?\s?out/i.test(message)) {
    return new ProxyError(504, 'upstream_timeout', `The upstream did not respond within ${spec.timeoutMs} ms.`, {
      url: spec.target.toString(),
      timeout_ms: spec.timeoutMs,
    });
  }
  return new ProxyError(502, 'upstream_unreachable', `Could not reach the upstream: ${message}`, {
    url: spec.target.toString(),
  });
}

/* ----------------------------------------------------------------- forward */

/**
 * Perform the proxied request.
 *
 * Returns either
 *   { kind: 'json', request, response }  — the JSON envelope for the client
 *   { kind: 'passthrough', response, request } — the raw upstream Response
 */
export async function forward(payload, { env, selfHost } = {}) {
  const spec = normalizeRequest(payload, { env, selfHost });
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('proxy timeout')), spec.timeoutMs);

  try {
    let upstream;
    try {
      upstream = await fetch(spec.target.toString(), {
        method: spec.method,
        headers: spec.headers,
        body: spec.body,
        redirect: spec.follow ? 'follow' : 'manual',
        signal: controller.signal,
      });
    } catch (err) {
      throw upstreamFailure(err, spec);
    }

    if (spec.passthrough) {
      const declared = Number(upstream.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
        throw new ProxyError(413, 'response_too_large', `Responses are limited to ${MAX_RESPONSE_BYTES} bytes.`, {
          bytes: declared,
        });
      }
      return { kind: 'passthrough', request: describeRequest(spec), response: upstream };
    }

    let buffer;
    try {
      buffer = await upstream.arrayBuffer();
    } catch (err) {
      throw upstreamFailure(err, spec);
    }

    const truncated = buffer.byteLength > MAX_RESPONSE_BYTES;
    const bytes = truncated ? buffer.slice(0, MAX_RESPONSE_BYTES) : buffer;
    const contentType = upstream.headers.get('content-type') || '';
    const decoded = decodeBody(bytes, contentType);

    return {
      kind: 'json',
      request: describeRequest(spec),
      response: {
        status: upstream.status,
        status_text: upstream.statusText || '',
        ok: upstream.ok,
        url: upstream.url || spec.target.toString(),
        redirected: Boolean(upstream.redirected),
        headers: headersToObject(upstream.headers),
        content_type: contentType || null,
        body_encoding: decoded.encoding,
        body: decoded.body,
        bytes: bytes.byteLength,
        truncated,
        duration_ms: Date.now() - started,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
