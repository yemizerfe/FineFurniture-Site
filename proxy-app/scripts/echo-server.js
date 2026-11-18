/**
 * Tiny upstream used by the tests.
 *
 *   node scripts/echo-server.js 9099
 *
 * Routes: / (echo), /status?code=, /slow?ms=, /bytes, /text, /big, /redirect, /target
 */
import { createServer } from 'node:http';

const port = Number(process.argv[2] || 9099);

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  const url = new URL(req.url, `http://${req.headers.host}`);

  const send = (status, payload, type = 'application/json') => {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    res.writeHead(status, { 'content-type': type, 'x-echo': 'yes' });
    res.end(data);
  };

  if (url.pathname === '/status') {
    const code = Number(url.searchParams.get('code') || 418);
    send(code, { status: code });
    return;
  }
  if (url.pathname === '/slow') {
    const ms = Number(url.searchParams.get('ms') || 2000);
    setTimeout(() => send(200, { slept_ms: ms }), ms);
    return;
  }
  if (url.pathname === '/bytes') {
    res.writeHead(200, { 'content-type': 'application/octet-stream' });
    res.end(Buffer.alloc(1024, 7));
    return;
  }
  if (url.pathname === '/text') {
    send(200, 'plain text body', 'text/plain; charset=utf-8');
    return;
  }
  if (url.pathname === '/big') {
    send(200, 'x'.repeat(3 * 1024 * 1024), 'text/plain; charset=utf-8');
    return;
  }
  if (url.pathname === '/redirect') {
    res.writeHead(302, { location: '/target' });
    res.end();
    return;
  }
  if (url.pathname === '/target') {
    send(200, { reached: 'target' });
    return;
  }

  send(200, {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body,
    body_length: body.length,
  });
});

server.listen(port, '127.0.0.1', () => console.log(`echo upstream on http://127.0.0.1:${port}`));
