/**
 * D1 access layer: schema bootstrap, row mapping and the seed dataset.
 *
 * The schema is created on first use by the Worker itself (there is no
 * separate migration runner), so a fresh database is immediately usable.
 */

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS articles (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     title TEXT NOT NULL,
     slug TEXT NOT NULL UNIQUE,
     excerpt TEXT NOT NULL DEFAULT '',
     content TEXT NOT NULL DEFAULT '',
     tags TEXT NOT NULL DEFAULT '[]',
     status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
     cover_image TEXT,
     published_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_articles_status_published_at
     ON articles (status, published_at DESC)`,
  `CREATE TABLE IF NOT EXISTS blogger (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     name TEXT NOT NULL,
     bio TEXT NOT NULL DEFAULT '',
     avatar_url TEXT,
     website TEXT,
     twitter TEXT,
     github TEXT,
     updated_at TEXT NOT NULL
   )`,
];

const SEED_ARTICLES = [
  {
    title: 'Hello, World (Again)',
    slug: 'hello-world-again',
    excerpt: 'Why I am starting yet another blog, and what you can expect to read here.',
    content:
      "Every few years I wipe the archive and start over. This time I am keeping the posts in a database instead of a folder of markdown files, mostly so I stop losing them in laptop migrations.\n\nExpect short, practical notes about typescript, sqlite and shipping small things.",
    tags: ['meta', 'writing'],
    status: 'published',
    published_at: '2026-01-12T09:00:00.000Z',
  },
  {
    title: 'SQLite is a Fine Database',
    slug: 'sqlite-is-a-fine-database',
    excerpt: 'Concurrency myths, backups, and when the boring answer is the right one.',
    content:
      'People reach for a distributed database long before they have a distributed problem. SQLite handles a surprising amount of traffic when you enable WAL mode and keep transactions short.\n\nThis post walks through the numbers from a small side project that serves a few thousand readers a day.',
    tags: ['databases', 'sqlite'],
    status: 'published',
    published_at: '2026-02-03T17:30:00.000Z',
  },
  {
    title: 'Draft: Notes on Edge Functions',
    slug: 'notes-on-edge-functions',
    excerpt: 'Rough notes I am still collecting on cold starts and CPU budgets.',
    content: 'Still figuring out how to phrase the section on isolate reuse. Do not publish yet.',
    tags: ['edge'],
    status: 'draft',
    published_at: null,
  },
];

const DEFAULT_BLOGGER = {
  name: 'The Personal Blog',
  bio: 'Short notes on software, written by one person.',
  avatar_url: null,
  website: null,
  twitter: null,
  github: null,
};

let schemaReady = false;

/** Create tables (and seed once) before the first query in this isolate. */
export async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch(SCHEMA_STATEMENTS.map((sql) => env.DB.prepare(sql)));
  await seed(env);
  schemaReady = true;
}

async function seed(env) {
  const now = new Date().toISOString();

  const bloggerCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM blogger').first();
  if (!bloggerCount?.n) {
    await env.DB.prepare(
      `INSERT INTO blogger (id, name, bio, avatar_url, website, twitter, github, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        DEFAULT_BLOGGER.name,
        DEFAULT_BLOGGER.bio,
        DEFAULT_BLOGGER.avatar_url,
        DEFAULT_BLOGGER.website,
        DEFAULT_BLOGGER.twitter,
        DEFAULT_BLOGGER.github,
        now,
      )
      .run();
  }

  const articleCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM articles').first();
  if (!articleCount?.n) {
    await env.DB.batch(
      SEED_ARTICLES.map((a) =>
        env.DB.prepare(
          `INSERT INTO articles
             (title, slug, excerpt, content, tags, status, cover_image, published_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        ).bind(
          a.title,
          a.slug,
          a.excerpt,
          a.content,
          JSON.stringify(a.tags),
          a.status,
          a.published_at,
          a.published_at ?? now,
          now,
        ),
      ),
    );
  }
}

/* ------------------------------------------------------------------ mapping */

function parseTags(raw) {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function readingMinutes(content) {
  const words = String(content ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function toArticle(row, { withContent = true } = {}) {
  if (!row) return null;
  const article = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    tags: parseTags(row.tags),
    status: row.status,
    cover_image: row.cover_image ?? null,
    reading_minutes: readingMinutes(row.content),
    word_count: String(row.content ?? '').trim().split(/\s+/).filter(Boolean).length,
    published_at: row.published_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    url: `/api/articles/${row.slug}`,
  };
  if (withContent) article.content = row.content;
  return article;
}

export function toBlogger(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    avatar_url: row.avatar_url ?? null,
    website: row.website ?? null,
    twitter: row.twitter ?? null,
    github: row.github ?? null,
    updated_at: row.updated_at,
  };
}
