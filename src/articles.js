/** Article CRUD handlers. */

import { toArticle } from './db.js';
import { uniqueSlug } from './slug.js';
import {
  badRequest,
  conflict,
  intParam,
  json,
  notFound,
  readJsonBody,
} from './http.js';

const MAX_TITLE = 200;
const MAX_SLUG = 80;
const MAX_TAGS = 10;
const MAX_TAG_LEN = 40;
const MAX_CONTENT = 200_000;

const ID_OR_SLUG = /^(\d+|[a-z0-9-]+)$/;

function str(value, field, { max, required = false, nullable = false }) {
  if (value === undefined) return undefined;
  if (value === null) {
    if (nullable) return null;
    throw badRequest(`"${field}" cannot be null.`, { field });
  }
  if (typeof value !== 'string') throw badRequest(`"${field}" must be a string.`, { field });
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw badRequest(`"${field}" cannot be empty.`, { field });
    return '';
  }
  if (trimmed.length > max) {
    throw badRequest(`"${field}" must be at most ${max} characters.`, { field });
  }
  return trimmed;
}

function tags(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw badRequest('"tags" must be an array of strings.', { field: 'tags' });
  if (value.length > MAX_TAGS) {
    throw badRequest(`"tags" may contain at most ${MAX_TAGS} entries.`, { field: 'tags' });
  }
  const cleaned = [];
  for (const tag of value) {
    if (typeof tag !== 'string') throw badRequest('"tags" must contain only strings.', { field: 'tags' });
    const t = tag.trim().toLowerCase();
    if (!t) continue;
    if (t.length > MAX_TAG_LEN) {
      throw badRequest(`Each tag must be at most ${MAX_TAG_LEN} characters.`, { field: 'tags' });
    }
    if (!cleaned.includes(t)) cleaned.push(t);
  }
  return cleaned;
}

function status(value) {
  if (value === undefined) return undefined;
  if (value !== 'draft' && value !== 'published') {
    throw badRequest('"status" must be "draft" or "published".', { field: 'status' });
  }
  return value;
}

function isoDate(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw badRequest(`"${field}" must be an ISO 8601 date string or null.`, { field });
  }
  return new Date(value).toISOString();
}

function autoExcerpt(content) {
  const plain = String(content ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length <= 160 ? plain : `${plain.slice(0, 157).trimEnd()}...`;
}

function parseLocation(pathname) {
  const raw = decodeURIComponent(pathname.replace(/^\/api\/articles\/?/, '').replace(/\/$/, ''));
  if (!raw) throw badRequest('Article id or slug is required.');
  if (!ID_OR_SLUG.test(raw)) throw badRequest('Article id or slug contains unsupported characters.');
  return /^\d+$/.test(raw) ? { id: Number.parseInt(raw, 10) } : { slug: raw };
}

async function findBy(env, locator) {
  const stmt =
    locator.id !== undefined
      ? env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(locator.id)
      : env.DB.prepare('SELECT * FROM articles WHERE slug = ?').bind(locator.slug);
  return stmt.first();
}

async function getArticleRecord(env, pathname) {
  const locator = parseLocation(pathname);
  const row = await findBy(env, locator);
  if (!row) {
    throw notFound(
      locator.id !== undefined
        ? `No article with id ${locator.id}.`
        : `No article with slug "${locator.slug}".`,
    );
  }
  return row;
}

async function slugExists(env, slug, exceptId = null) {
  const row =
    exceptId === null
      ? await env.DB.prepare('SELECT 1 AS hit FROM articles WHERE slug = ?').bind(slug).first()
      : await env.DB.prepare('SELECT 1 AS hit FROM articles WHERE slug = ? AND id != ?')
          .bind(slug, exceptId)
          .first();
  return Boolean(row);
}

/* ------------------------------------------------------------------ list */

export async function listArticles(request, env, url) {
  const limit = intParam(url.searchParams.get('limit'), { name: 'limit', fallback: 10, min: 1, max: 50 });
  const offset = intParam(url.searchParams.get('offset'), { name: 'offset', fallback: 0, min: 0, max: 1_000_000 });
  const sort = (url.searchParams.get('sort') || 'newest').toLowerCase();
  const statusFilter = (url.searchParams.get('status') || '').toLowerCase();
  const tagFilter = (url.searchParams.get('tag') || '').trim().toLowerCase();
  const q = (url.searchParams.get('q') || '').trim();
  const withContent = url.searchParams.get('include_content') === 'true';

  if (!['newest', 'oldest', 'title', 'updated'].includes(sort)) {
    throw badRequest('Query parameter "sort" must be one of newest, oldest, title, updated.');
  }
  if (statusFilter && !['draft', 'published'].includes(statusFilter)) {
    throw badRequest('Query parameter "status" must be "draft" or "published".');
  }

  const where = [];
  const params = [];
  if (statusFilter) {
    where.push('status = ?');
    params.push(statusFilter);
  }
  if (tagFilter) {
    where.push('EXISTS (SELECT 1 FROM json_each(articles.tags) WHERE json_each.value = ?)');
    params.push(tagFilter);
  }
  if (q) {
    where.push('(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const orderSql = {
    newest: 'ORDER BY COALESCE(published_at, created_at) DESC, id DESC',
    oldest: 'ORDER BY COALESCE(published_at, created_at) ASC, id ASC',
    title: 'ORDER BY title COLLATE NOCASE ASC, id ASC',
    updated: 'ORDER BY updated_at DESC, id DESC',
  }[sort];

  const [rows, totalRow] = await Promise.all([
    env.DB.prepare(`SELECT * FROM articles ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM articles ${whereSql}`).bind(...params).first(),
  ]);

  const total = totalRow?.total ?? 0;
  const items = (rows.results ?? []).map((row) => toArticle(row, { withContent }));

  return json({
    data: items,
    meta: {
      total,
      count: items.length,
      limit,
      offset,
      has_more: offset + items.length < total,
      sort,
      filters: {
        status: statusFilter || null,
        tag: tagFilter || null,
        q: q || null,
      },
    },
  });
}

/* ---------------------------------------------------------------- create */

export async function createArticle(request, env) {
  const body = await readJsonBody(request);
  const now = new Date().toISOString();

  const title = str(body.title, 'title', { max: MAX_TITLE, required: true });
  if (!title) throw badRequest('"title" is required.', { field: 'title' });
  const content = str(body.content, 'content', { max: MAX_CONTENT, required: true }) ?? '';
  const excerpt = str(body.excerpt, 'excerpt', { max: 400 }) || autoExcerpt(content);
  const tagList = tags(body.tags) ?? [];
  const statusValue = status(body.status) ?? 'draft';
  const coverImage = str(body.cover_image, 'cover_image', { max: 2048, nullable: true }) || null;
  const publishedAtInput = isoDate(body.published_at, 'published_at');

  let slug;
  if (body.slug !== undefined) {
    const requested = str(body.slug, 'slug', { max: MAX_SLUG });
    if (!requested) throw badRequest('"slug" cannot be empty.', { field: 'slug' });
    slug = requested.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw badRequest('"slug" may contain only lowercase letters, numbers and hyphens.', { field: 'slug' });
    }
    if (await slugExists(env, slug)) {
      throw conflict(`An article with slug "${slug}" already exists.`, { field: 'slug' });
    }
  } else {
    slug = await uniqueSlug(title, (candidate) => slugExists(env, candidate));
  }

  let publishedAt = publishedAtInput ?? null;
  if (statusValue === 'published' && !publishedAt) publishedAt = now;

  const result = await env.DB.prepare(
    `INSERT INTO articles
       (title, slug, excerpt, content, tags, status, cover_image, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      title,
      slug,
      excerpt,
      content,
      JSON.stringify(tagList),
      statusValue,
      coverImage,
      publishedAt,
      now,
      now,
    )
    .run();

  const row = await env.DB.prepare('SELECT * FROM articles WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json({ data: toArticle(row) }, 201, { location: `/api/articles/${slug}` });
}

/* ---------------------------------------------------------------- detail */

export async function getArticle(request, env, url) {
  const row = await getArticleRecord(env, url.pathname);
  return json({ data: toArticle(row) });
}

/* ---------------------------------------------------------------- update */

async function applyUpdate(request, env, { replace }) {
  const url = new URL(request.url);
  const existing = await getArticleRecord(env, url.pathname);
  const body = await readJsonBody(request);

  const set = [];
  const params = [];

  const title = str(body.title, 'title', { max: MAX_TITLE, required: true });
  if (title !== undefined) {
    if (!title) throw badRequest('"title" cannot be empty.', { field: 'title' });
    set.push('title = ?');
    params.push(title);
  }

  const content = str(body.content, 'content', { max: MAX_CONTENT, required: true });
  if (content !== undefined) {
    set.push('content = ?');
    params.push(content);
  }

  if (replace && body.content === undefined) {
    throw badRequest('"content" is required when replacing an article.', { field: 'content' });
  }
  if (replace && body.title === undefined) {
    throw badRequest('"title" is required when replacing an article.', { field: 'title' });
  }

  if (body.excerpt !== undefined) {
    const excerpt = str(body.excerpt, 'excerpt', { max: 400 });
    set.push('excerpt = ?');
    params.push(excerpt || autoExcerpt(content ?? existing.content));
  } else if (content !== undefined && !existing.excerpt) {
    set.push('excerpt = ?');
    params.push(autoExcerpt(content));
  }

  const tagList = tags(body.tags);
  if (tagList !== undefined) {
    set.push('tags = ?');
    params.push(JSON.stringify(tagList));
  }

  if (body.cover_image !== undefined) {
    const coverImage = str(body.cover_image, 'cover_image', { max: 2048, nullable: true });
    set.push('cover_image = ?');
    params.push(coverImage || null);
  }

  const statusValue = status(body.status);
  const publishedAtInput = isoDate(body.published_at, 'published_at');
  const nextStatus = statusValue ?? existing.status;
  if (statusValue !== undefined) {
    set.push('status = ?');
    params.push(statusValue);
  }
  if (publishedAtInput !== undefined || statusValue !== undefined) {
    let publishedAt = publishedAtInput !== undefined ? publishedAtInput : existing.published_at;
    if (nextStatus === 'published' && !publishedAt) publishedAt = new Date().toISOString();
    if (nextStatus === 'draft' && statusValue !== undefined && publishedAtInput === undefined) {
      publishedAt = existing.published_at;
    }
    set.push('published_at = ?');
    params.push(publishedAt);
  }

  if (body.slug !== undefined) {
    const requested = str(body.slug, 'slug', { max: MAX_SLUG });
    if (!requested) throw badRequest('"slug" cannot be empty.', { field: 'slug' });
    const slug = requested.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw badRequest('"slug" may contain only lowercase letters, numbers and hyphens.', { field: 'slug' });
    }
    if (await slugExists(env, slug, existing.id)) {
      throw conflict(`An article with slug "${slug}" already exists.`, { field: 'slug' });
    }
    set.push('slug = ?');
    params.push(slug);
  }

  const known = ['title', 'slug', 'excerpt', 'content', 'tags', 'status', 'cover_image', 'published_at'];
  const unknown = Object.keys(body).filter((key) => !known.includes(key));
  if (unknown.length && Object.keys(body).every((key) => !known.includes(key))) {
    throw badRequest(`No updatable fields in body. Allowed: ${known.join(', ')}.`, { unknown });
  }

  if (!set.length) throw badRequest('Nothing to update: no recognised fields were provided.');

  const now = new Date().toISOString();
  set.push('updated_at = ?');
  params.push(now);

  await env.DB.prepare(`UPDATE articles SET ${set.join(', ')} WHERE id = ?`)
    .bind(...params, existing.id)
    .run();

  const row = await env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(existing.id).first();
  return json({ data: toArticle(row) });
}

export function updateArticle(request, env) {
  return applyUpdate(request, env, { replace: false });
}

export function replaceArticle(request, env) {
  return applyUpdate(request, env, { replace: true });
}

/* ---------------------------------------------------------------- delete */

export async function deleteArticle(request, env, url) {
  const row = await getArticleRecord(env, url.pathname);
  await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(row.id).run();
  return json({ data: { id: row.id, slug: row.slug, title: row.title, deleted: true } });
}

/* ------------------------------------------------------------------ tags */

export async function listTags(env) {
  const rows = await env.DB.prepare(
    `SELECT json_each.value AS tag, COUNT(*) AS count
       FROM articles, json_each(articles.tags)
      GROUP BY tag
      ORDER BY count DESC, tag ASC`,
  ).all();
  const data = (rows.results ?? []).map((row) => ({ tag: row.tag, count: row.count }));
  return json({ data, meta: { count: data.length } });
}
