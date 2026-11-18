/**
 * Proxy server API.
 *
 *   POST /api/proxy   { url, method, headers, body, timeout_ms, follow_redirects, passthrough }
 *   GET  /api/proxy?url=…&header.X-Foo=bar   (GET only)
 *   GET  /api/health
 *   GET  /            docs page with a live tester
 *
 * The proxy takes the target URL, headers and body from the caller, performs the
 * request from the Worker, and returns the upstream status, headers and body.
 */

import { LIMITS, ProxyError, forward } from './proxy.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-expose-headers': 'content-type',
  'access-control-max-age': '86400',
};

const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

function errorResponse(err) {
  if (err instanceof ProxyError) {
    return json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.status,
      err.code === 'unsupported_method' ? { allow: 'GET, POST, OPTIONS' } : {},
    );
  }
  console.error('Proxy request failed:', err);
  return json(
    { error: { code: 'internal_error', message: 'The proxy could not complete that request.' } },
    500,
  );
}

/* ----------------------------------------------------------------- payloads */

async function readJsonPayload(request) {
  const raw = await request.text();
  if (raw.length > MAX_PAYLOAD_BYTES) {
    throw new ProxyError(413, 'payload_too_large', `Proxy request payloads are limited to ${MAX_PAYLOAD_BYTES} bytes.`);
  }
  if (!raw.trim()) {
    throw new ProxyError(400, 'empty_body', 'Send a JSON body like {"url": "https://example.com", "method": "GET"}.');
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ProxyError(400, 'invalid_json', 'The request body is not valid JSON.');
  }
  return payload;
}

function payloadFromQuery(url) {
  const params = url.searchParams;
  const target = params.get('url') ?? params.get('request_url');
  if (!target) {
    throw new ProxyError(400, 'missing_url', 'Add ?url=https://example.com to the request.');
  }

  const headers = {};
  for (const [key, value] of params) {
    if (key.startsWith('header.')) headers[key.slice('header.'.length)] = value;
  }

  const payload = {
    url: target,
    method: 'GET',
    headers,
    follow_redirects: params.get('follow_redirects') !== 'false',
  };
  if (params.get('timeout_ms')) payload.timeout_ms = params.get('timeout_ms');
  return payload;
}

/* ---------------------------------------------------------------- handlers */

async function handleProxy(payload, env, request) {
  const result = await forward(payload, { env, selfHost: new URL(request.url).host });

  if (result.kind === 'passthrough') {
    const headers = new Headers();
    for (const [key, value] of result.response.headers) {
      if (['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive'].includes(key)) {
        continue;
      }
      headers.set(key, value);
    }
    headers.set('x-proxy-passthrough', '1');
    return new Response(result.response.body, { status: result.response.status, headers });
  }

  return json({ data: { request: result.request, response: result.response } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...CORS, allow: 'GET, POST, OPTIONS' } });
    }

    try {
      if (url.pathname === '/api/health' || url.pathname === '/api/health/') {
        if (method !== 'GET') {
          return withCors(json({ error: { code: 'method_not_allowed', message: 'Use GET.' } }, 405, { allow: 'GET' }));
        }
        return withCors(
          json({
            data: {
              status: 'ok',
              service: 'proxy-server',
              version: '1.0.0',
              limits: LIMITS,
              time: new Date().toISOString(),
            },
          }),
        );
      }

      if (url.pathname === '/api/proxy' || url.pathname === '/api/proxy/' || url.pathname === '/api' || url.pathname === '/api/') {
        if (method === 'POST') return withCors(await handleProxy(await readJsonPayload(request), env, request));
        if (method === 'GET') return withCors(await handleProxy(payloadFromQuery(url), env, request));
        return withCors(
          json(
            { error: { code: 'method_not_allowed', message: 'Use POST with a JSON payload, or GET with ?url=.' } },
            405,
            { allow: 'GET, POST, OPTIONS' },
          ),
        );
      }

      if (url.pathname === '/' && method === 'POST') {
        return withCors(await handleProxy(await readJsonPayload(request), env, request));
      }

      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;

      return withCors(
        json(
          { error: { code: 'not_found', message: `No route for ${method} ${url.pathname}. Try POST /api/proxy.` } },
          404,
        ),
      );
    } catch (err) {
      return withCors(errorResponse(err));
    }
  },
};
