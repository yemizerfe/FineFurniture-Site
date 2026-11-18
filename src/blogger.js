/** Single-blogger profile plus service metadata. */

import { toBlogger } from './db.js';
import { badRequest, json, readJsonBody } from './http.js';

const FIELDS = ['name', 'bio', 'avatar_url', 'website', 'twitter', 'github'];

export async function getBlogger(env) {
  const row = await env.DB.prepare('SELECT * FROM blogger WHERE id = 1').first();
  return json({ data: toBlogger(row) });
}

export async function updateBlogger(request, env) {
  const body = await readJsonBody(request);
  const existing = await env.DB.prepare('SELECT * FROM blogger WHERE id = 1').first();

  const set = [];
  const params = [];
  for (const field of FIELDS) {
    if (body[field] === undefined) continue;
    const value = body[field];
    if (value !== null && typeof value !== 'string') {
      throw badRequest(`"${field}" must be a string or null.`, { field });
    }
    if (field === 'name' && (!value || !value.trim())) {
      throw badRequest('"name" cannot be empty.', { field });
    }
    const max = field === 'bio' ? 1000 : 2048;
    if (typeof value === 'string' && value.length > max) {
      throw badRequest(`"${field}" must be at most ${max} characters.`, { field });
    }
    set.push(`${field} = ?`);
    params.push(value === null ? (field === 'name' ? existing.name : null) : value.trim());
  }

  if (!set.length) {
    throw badRequest(`No updatable fields. Allowed: ${FIELDS.join(', ')}.`);
  }

  set.push('updated_at = ?');
  params.push(new Date().toISOString());

  await env.DB.prepare(`UPDATE blogger SET ${set.join(', ')} WHERE id = 1`)
    .bind(...params)
    .run();

  const row = await env.DB.prepare('SELECT * FROM blogger WHERE id = 1').first();
  return json({ data: toBlogger(row) });
}

export async function health(env) {
  let articleCount = null;
  let database = 'ok';
  try {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM articles').first();
    articleCount = row?.n ?? 0;
  } catch (err) {
    console.error('Health check failed:', err);
    database = 'unavailable';
  }
  return json(
    {
      data: {
        status: database === 'ok' ? 'ok' : 'degraded',
        service: 'personal-blog-api',
        version: '1.0.0',
        database,
        articles: articleCount,
        time: new Date().toISOString(),
      },
    },
    database === 'ok' ? 200 : 503,
  );
}
