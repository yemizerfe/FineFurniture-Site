/**
 * Personal Blog API — a REST API for one blogger's articles.
 *
 * Routes (all JSON):
 *   GET    /api/health
 *   GET    /api/blogger              PUT /api/blogger
 *   GET    /api/articles             POST /api/articles
 *   GET    /api/articles/:idOrSlug   PATCH/PUT/DELETE /api/articles/:idOrSlug
 *   GET    /api/tags
 *
 * Everything else is served from the static assets directory (docs page).
 */

import { ensureSchema } from './db.js';
import { CORS_HEADERS, HttpError, errorResponse, json, methodNotAllowed, notFound } from './http.js';
import {
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  listTags,
  replaceArticle,
  updateArticle,
} from './articles.js';
import { getBlogger, health, updateBlogger } from './blogger.js';

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

async function route(request, env, url) {
  const { pathname } = url;
  const method = request.method.toUpperCase();
  const isArticlePath = /^\/api\/articles\/[^/]+\/?$/.test(pathname);

  if (pathname === '/api' || pathname === '/api/') {
    return json({
      data: {
        name: 'Personal Blog API',
        version: '1.0.0',
        docs: '/',
        endpoints: [
          'GET /api/health',
          'GET /api/blogger',
          'PUT /api/blogger',
          'GET /api/articles',
          'POST /api/articles',
          'GET /api/articles/:idOrSlug',
          'PATCH /api/articles/:idOrSlug',
          'PUT /api/articles/:idOrSlug',
          'DELETE /api/articles/:idOrSlug',
          'GET /api/tags',
        ],
      },
    });
  }

  if (pathname === '/api/health' || pathname === '/api/health/') {
    if (method !== 'GET') throw methodNotAllowed('GET');
    return health(env);
  }

  if (pathname === '/api/blogger' || pathname === '/api/blogger/') {
    if (method === 'GET') return getBlogger(env);
    if (method === 'PUT' || method === 'PATCH') return updateBlogger(request, env);
    throw methodNotAllowed('GET, PUT, PATCH');
  }

  if (pathname === '/api/tags' || pathname === '/api/tags/') {
    if (method !== 'GET') throw methodNotAllowed('GET');
    return listTags(env);
  }

  if (pathname === '/api/articles' || pathname === '/api/articles/') {
    if (method === 'GET') return listArticles(request, env, url);
    if (method === 'POST') return createArticle(request, env);
    throw methodNotAllowed('GET, POST');
  }

  if (isArticlePath) {
    if (method === 'GET') return getArticle(request, env, url);
    if (method === 'PATCH') return updateArticle(request, env);
    if (method === 'PUT') return replaceArticle(request, env);
    if (method === 'DELETE') return deleteArticle(request, env, url);
    throw methodNotAllowed('GET, PATCH, PUT, DELETE');
  }

  if (pathname.startsWith('/api/')) throw notFound(`No API route for ${method} ${pathname}.`);

  const asset = await env.ASSETS.fetch(request);
  if (asset.status === 404) {
    return json(
      { error: { code: 'not_found', message: `No resource at ${pathname}. API lives under /api.` } },
      404,
    );
  }
  return asset;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method.toUpperCase() === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      await ensureSchema(env);
      return withCors(await route(request, env, url));
    } catch (err) {
      if (!(err instanceof HttpError)) console.error('Request failed:', url.pathname, err);
      return withCors(errorResponse(err));
    }
  },
};
