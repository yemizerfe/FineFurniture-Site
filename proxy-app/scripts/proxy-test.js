/**
 * End-to-end test for the proxy API.
 *
 *   node scripts/proxy-test.js
 *     BASE_URL   default http://127.0.0.1:8789
 *     ECHO_URL   default http://127.0.0.1:9099  (scripts/echo-server.js)
 *     PRIVATE_BLOCKED=1        also assert SSRF guardrails (deployed only)
 *     PUBLIC_JSON_API=<url>    also proxy a real public JSON API
 */
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8789').replace(/\/$/, '');
const ECHO = (process.env.ECHO_URL || 'http://127.0.0.1:9099').replace(/\/$/, '');
const PRIVATE_BLOCKED = process.env.PRIVATE_BLOCKED === '1';
const PUBLIC_JSON_API = process.env.PUBLIC_JSON_API || '';

let passed = 0;
const failures = [];

function check(name, condition, extra) {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${name}${extra ? ` — ${extra}` : ''}`);
}

async function call(method, path, { body, headers = {} } = {}) {
  const init = { method, headers: { ...headers }, redirect: 'manual' };
  if (body !== undefined) init.body = body;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(30000) });
  } catch (err) {
    return { status: 0, headers: new Headers(), json: null, text: '', error: String(err) };
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json (passthrough / html) */
  }
  return { status: res.status, headers: res.headers, json, text };
}

function proxy(payload) {
  return call('POST', '/api/proxy', {
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

async function main() {
  console.log(`Testing ${BASE}`);
  console.log(`Echo upstream ${ECHO}\n`);

  // --- service basics
  const health = await call('GET', '/api/health');
  check('GET /api/health → 200', health.status === 200, `got ${health.status}`);
  check('health reports ok', health.json?.data?.status === 'ok');

  const docs = await call('GET', '/');
  check('GET / serves the docs page', docs.status === 200 && docs.text.includes('Proxy'));
  check('docs page is html', (docs.headers.get('content-type') || '').includes('text/html'));

  const preflight = await call('OPTIONS', '/api/proxy', { headers: { origin: 'https://example.com' } });
  check('OPTIONS preflight → 204', preflight.status === 204, `got ${preflight.status}`);
  check('preflight allows CORS', preflight.headers.get('access-control-allow-origin') === '*');
  check('preflight advertises POST', (preflight.headers.get('access-control-allow-methods') || '').includes('POST'));

  const putMethod = await call('PUT', '/api/proxy', { body: '{}', headers: { 'content-type': 'application/json' } });
  check('PUT /api/proxy → 405', putMethod.status === 405, `got ${putMethod.status}`);

  const unknown = await call('GET', '/api/nope');
  check('unknown route → 404 JSON', unknown.status === 404 && unknown.json?.error?.code === 'not_found');

  // --- happy path: GET
  const getEcho = await proxy({ url: `${ECHO}/echo?a=1&b=two`, method: 'GET' });
  check('GET through proxy → 200', getEcho.status === 200, `got ${getEcho.status}`);
  const env1 = getEcho.json?.data;
  check('envelope carries upstream status', env1?.response?.status === 200);
  check('upstream method is GET', env1?.response?.body?.method === 'GET');
  check('query string preserved', env1?.response?.body?.query?.a === '1' && env1?.response?.body?.query?.b === 'two');
  check('body decoded as json', env1?.response?.body_encoding === 'json');
  check('duration reported', typeof env1?.response?.duration_ms === 'number');

  // --- header forwarding
  const withHeaders = await proxy({
    url: `${ECHO}/headers`,
    method: 'GET',
    headers: { 'x-custom-token': 'abc123', accept: 'application/json' },
  });
  check('custom header reaches upstream', withHeaders.json?.data?.response?.body?.headers?.['x-custom-token'] === 'abc123');
  check('accept header reaches upstream', withHeaders.json?.data?.response?.body?.headers?.accept === 'application/json');
  check('proxy sets its own user agent, not the client one', !/node/i.test(String(withHeaders.json?.data?.response?.body?.headers?.['user-agent'] || '')));

  // --- header aliases
  const arrayHeaders = await proxy({
    url: `${ECHO}/headers`,
    headers: [{ name: 'X-From-Array', value: 'yes' }],
  });
  check('array header form works', arrayHeaders.json?.data?.response?.body?.headers?.['x-from-array'] === 'yes');

  // --- POST with object body
  const postJson = await proxy({
    url: `${ECHO}/submit`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { name: 'Ada', role: 'engineer', nested: { ok: true } },
  });
  const echoed = postJson.json?.data?.response?.body;
  check('POST forwarded', postJson.json?.data?.request?.method === 'POST', postJson.json?.data?.request?.method);
  check('object body serialised to JSON', (() => {
    try {
      return JSON.parse(echoed?.body)?.name === 'Ada';
    } catch {
      return false;
    }
  })(), echoed?.body);
  check('object body gets a json content-type', echoed?.headers?.['content-type'] === 'application/json');

  // --- POST with raw string body + custom content type
  const postRaw = await proxy({
    url: `${ECHO}/submit`,
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'hello raw body',
  });
  const rawEcho = postRaw.json?.data?.response?.body;
  check('string body forwarded verbatim', rawEcho?.body === 'hello raw body', rawEcho?.body);
  check('explicit content-type preserved', rawEcho?.headers?.['content-type'] === 'text/plain');
  check('request body size reported', postRaw.json?.data?.request?.body_bytes === 'hello raw body'.length);

  // --- other methods
  const put = await proxy({ url: `${ECHO}/item/1`, method: 'PUT', body: 'updated' });
  check('PUT forwarded', put.json?.data?.response?.body?.method === 'PUT');
  const del = await proxy({ url: `${ECHO}/item/1`, method: 'DELETE' });
  check('DELETE forwarded', del.json?.data?.response?.body?.method === 'DELETE');

  const head = await proxy({ url: `${ECHO}/target`, method: 'HEAD' });
  check('HEAD forwarded with empty body', head.json?.data?.response?.status === 200 && head.json?.data?.response?.bytes === 0);

  // --- upstream status passthrough
  const teapot = await proxy({ url: `${ECHO}/status?code=418` });
  check('upstream error status is reported', teapot.json?.data?.response?.status === 418, String(teapot.json?.data?.response?.status));
  check('ok=false for 4xx upstream', teapot.json?.data?.response?.ok === false);

  // --- redirects
  const followed = await proxy({ url: `${ECHO}/redirect`, follow_redirects: true });
  check('redirects followed by default', followed.json?.data?.response?.body?.reached === 'target');
  const manual = await proxy({ url: `${ECHO}/redirect`, follow_redirects: false });
  check('follow_redirects:false returns the 302', manual.json?.data?.response?.status === 302, String(manual.json?.data?.response?.status));
  check('manual redirect exposes location', manual.json?.data?.response?.headers?.location === '/target');

  // --- decoding
  const textBody = await proxy({ url: `${ECHO}/text` });
  check('text body decoded as utf8', textBody.json?.data?.response?.body_encoding === 'utf8' && textBody.json?.data?.response?.body === 'plain text body');

  const binary = await proxy({ url: `${ECHO}/bytes` });
  check('binary body returned as base64', binary.json?.data?.response?.body_encoding === 'base64', binary.json?.data?.response?.body_encoding);
  check('binary byte count correct', binary.json?.data?.response?.bytes === 1024, String(binary.json?.data?.response?.bytes));

  const big = await proxy({ url: `${ECHO}/big` });
  check('oversized response truncated', big.json?.data?.response?.truncated === true);
  check('truncation capped at 2 MB', big.json?.data?.response?.bytes === 2 * 1024 * 1024, String(big.json?.data?.response?.bytes));

  // --- timeout
  const slow = await proxy({ url: `${ECHO}/slow?ms=3000`, timeout_ms: 1000 });
  check('slow upstream → 504', slow.status === 504, `got ${slow.status}`);
  check('timeout error code', slow.json?.error?.code === 'upstream_timeout');

  // --- passthrough mode
  const passthrough = await proxy({ url: `${ECHO}/status?code=201`, passthrough: true });
  check('passthrough returns upstream status', passthrough.status === 201, `got ${passthrough.status}`);
  check('passthrough returns upstream json body', passthrough.json?.status === 201);
  check('passthrough marks the response', passthrough.headers.get('x-proxy-passthrough') === '1');

  // --- request_url alias
  const alias = await proxy({ request_url: `${ECHO}/alias` });
  check('request_url alias works', alias.json?.data?.response?.body?.path === '/alias');

  // --- GET endpoint with query params
  const viaQuery = await call('GET', `/api/proxy?url=${encodeURIComponent(`${ECHO}/query-test`)}&header.x-q=1`);
  check('GET /api/proxy?url= works', viaQuery.status === 200 && viaQuery.json?.data?.response?.body?.path === '/query-test', `got ${viaQuery.status}`);
  check('query endpoint forwards header.* params', viaQuery.json?.data?.response?.body?.headers?.['x-q'] === '1');

  // --- validation errors
  const cases = [
    ['missing url → 400', await proxy({ method: 'GET' }), 400, 'missing_url'],
    ['invalid url → 400', await proxy({ url: 'not a url' }), 400, 'invalid_url'],
    ['ftp scheme → 400', await proxy({ url: 'ftp://example.com/file' }), 400, 'unsupported_protocol'],
    ['file scheme → 400', await proxy({ url: 'file:///etc/passwd' }), 400, 'unsupported_protocol'],
    ['credentials in url → 400', await proxy({ url: 'https://user:pass@example.com/' }), 400, 'credentials_in_url'],
    ['bad method → 400', await proxy({ url: `${ECHO}/`, method: 'TRACE' }), 400, 'unsupported_method'],
    ['GET with body → 400', await proxy({ url: `${ECHO}/`, method: 'GET', body: 'x' }), 400, 'body_not_allowed'],
    ['timeout too small → 400', await proxy({ url: `${ECHO}/`, timeout_ms: 10 }), 400, 'invalid_timeout'],
    ['timeout too large → 400', await proxy({ url: `${ECHO}/`, timeout_ms: 90000 }), 400, 'invalid_timeout'],
    ['headers of wrong type → 400', await proxy({ url: `${ECHO}/`, headers: 'x: 1' }), 400, 'invalid_headers'],
    ['oversized body → 413', await proxy({ url: `${ECHO}/`, method: 'POST', body: 'x'.repeat(600 * 1024) }), 413, 'request_body_too_large'],
    ['empty json body → 400', await call('POST', '/api/proxy', { body: '', headers: { 'content-type': 'application/json' } }), 400, 'empty_body'],
    ['malformed json → 400', await call('POST', '/api/proxy', { body: '{oops', headers: { 'content-type': 'application/json' } }), 400, 'invalid_json'],
  ];
  for (const [name, res, status, code] of cases) {
    check(name, res.status === status && res.json?.error?.code === code, `got ${res.status} ${res.json?.error?.code}`);
  }

  // --- SSRF guardrails (deployed only; local dev opts into private targets)
  if (PRIVATE_BLOCKED) {
    const blocked = [
      ['localhost blocked', 'http://localhost:8080/'],
      ['127.0.0.1 blocked', 'http://127.0.0.1/'],
      ['private 10.x blocked', 'http://10.0.0.5/'],
      ['private 192.168.x blocked', 'http://192.168.1.1/'],
      ['cloud metadata IP blocked', 'http://169.254.169.254/latest/meta-data/'],
      ['metadata hostname blocked', 'http://metadata.google.internal/computeMetadata/v1/'],
      ['ipv6 loopback blocked', 'http://[::1]/'],
      ['internal suffix blocked', 'http://db.internal/'],
    ];
    for (const [name, url] of blocked) {
      const res = await proxy({ url });
      check(name, res.status === 403 && res.json?.error?.code === 'blocked_target', `got ${res.status} ${res.json?.error?.code}`);
    }

    const self = await proxy({ url: `${BASE}/api/health` });
    check('self-reference blocked', self.status === 400 && self.json?.error?.code === 'self_reference', `got ${self.status}`);

    if (PUBLIC_JSON_API) {
      const live = await proxy({ url: PUBLIC_JSON_API });
      check('proxies a real public API', live.status === 200 && Array.isArray(live.json?.data?.response?.body?.data), `got ${live.status}`);
      check('public API status visible', live.json?.data?.response?.status === 200);
    }
  }
}

main()
  .catch((err) => failures.push(`unexpected error: ${err.stack || err}`))
  .finally(() => {
    const total = passed + failures.length;
    console.log(`${passed}/${total} checks passed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const failure of failures) console.log(`  ✗ ${failure}`);
      process.exit(1);
    }
    console.log('All checks passed.');
  });
