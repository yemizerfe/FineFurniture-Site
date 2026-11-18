/**
 * Database layer: schema, seeding, and every SQL statement in one place.
 *
 * All values are bound. Identifiers, sort order and column names never come
 * from the request — they come from the allow-lists below.
 */
import { SHOWCASE } from './showcase.js';
import { CATEGORY_IDS, ROOM_IDS } from './validate.js';

export const SCHEMA_VERSION = 2;

const DDL = [
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_am TEXT NOT NULL DEFAULT '',
    tagline_en TEXT NOT NULL DEFAULT '',
    tagline_am TEXT NOT NULL DEFAULT '',
    desc_en TEXT NOT NULL DEFAULT '',
    desc_am TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    room TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL,
    compare_at INTEGER,
    badge TEXT,
    stock_status TEXT NOT NULL DEFAULT 'in_stock',
    stock_qty INTEGER NOT NULL DEFAULT 0,
    lead_time_days INTEGER NOT NULL DEFAULT 3,
    origin TEXT NOT NULL DEFAULT '',
    art TEXT NOT NULL DEFAULT '{}',
    materials TEXT NOT NULL DEFAULT '[]',
    colors TEXT NOT NULL DEFAULT '[]',
    sizes TEXT NOT NULL DEFAULT '[]',
    dims TEXT NOT NULL DEFAULT '{}',
    weight REAL,
    rating REAL,
    review_count INTEGER NOT NULL DEFAULT 0,
    reviews TEXT NOT NULL DEFAULT '[]',
    features TEXT NOT NULL DEFAULT '[]',
    care_en TEXT NOT NULL DEFAULT '',
    care_am TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    gallery TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    featured INTEGER NOT NULL DEFAULT 0,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_desc TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
  `CREATE TABLE IF NOT EXISTS collections (
    slug TEXT PRIMARY KEY,
    name_key TEXT NOT NULL,
    tint TEXT NOT NULL DEFAULT 'sand',
    sort_order INTEGER NOT NULL DEFAULT 0,
    pieces TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    sub TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TEXT NOT NULL,
    last_seen TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    iterations INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TEXT NOT NULL,
    last_seen TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    transport TEXT NOT NULL DEFAULT 'pickup',
    payment TEXT NOT NULL DEFAULT 'cash',
    note TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]',
    subtotal INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT '',
    actor_email TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    object TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS rate (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL DEFAULT '',
    google_sub TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL DEFAULT '',
    iterations INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    last_seen TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)`,
  `CREATE TABLE IF NOT EXISTS wishlist (
    owner_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (owner_id, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS recent_views (
    owner_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    viewed_at TEXT NOT NULL,
    PRIMARY KEY (owner_id, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS compare (
    owner_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (owner_id, slug)
  )`,
];

const PRODUCT_COLUMNS = [
  'id', 'slug', 'sku', 'name_en', 'name_am', 'tagline_en', 'tagline_am', 'desc_en', 'desc_am',
  'category', 'room', 'price', 'compare_at', 'badge', 'stock_status', 'stock_qty', 'lead_time_days',
  'origin', 'art', 'materials', 'colors', 'sizes', 'dims', 'weight', 'rating', 'review_count',
  'reviews', 'features', 'care_en', 'care_am', 'image_url', 'gallery', 'status', 'featured',
  'seo_title', 'seo_desc', 'social_tiktok', 'social_facebook', 'social_telegram',
  'created_at', 'updated_at', 'updated_by',
];

// Columns added after the first release. Existing databases get them through
// ensureSchema() below; ALTER TABLE cannot be written with IF NOT EXISTS in D1.
const ADDED_COLUMNS = [
  ['social_tiktok', "TEXT NOT NULL DEFAULT ''"],
  ['social_facebook', "TEXT NOT NULL DEFAULT ''"],
  ['social_telegram', "TEXT NOT NULL DEFAULT ''"],
];

const SORTS = {
  newest: 'created_at DESC',
  oldest: 'created_at ASC',
  'updated-desc': 'updated_at DESC',
  'name-asc': 'name_en COLLATE NOCASE ASC',
  'price-asc': 'price ASC',
  'price-desc': 'price DESC',
  'stock-asc': 'stock_qty ASC',
};

const PUBLIC_SORTS = {
  featured: 'featured DESC, updated_at DESC',
  newest: 'created_at DESC',
  name: 'name_en COLLATE NOCASE ASC',
};

export function sortSql(sort, publicList) {
  const table = publicList ? PUBLIC_SORTS : SORTS;
  return table[sort] || table[publicList ? 'featured' : 'newest'];
}

const now = () => new Date().toISOString();

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** A product row in the shape the storefront already renders. */
export function toClient(row) {
  if (!row) return null;
  const dims = parseJson(row.dims, {});
  return {
    slug: row.slug,
    name: { en: row.name_en, am: row.name_am || row.name_en },
    tagline: { en: row.tagline_en, am: row.tagline_am || row.tagline_en },
    desc: { en: row.desc_en, am: row.desc_am || row.desc_en },
    care: { en: row.care_en, am: row.care_am || row.care_en },
    category: row.category,
    room: row.room,
    art: parseJson(row.art, { type: 'sofa', variant: 1 }),
    materials: parseJson(row.materials, []),
    colors: parseJson(row.colors, []),
    sizes: parseJson(row.sizes, []).map((s) => ({ id: s.id, label: s.label })),
    dims,
    weight: row.weight,
    rating: row.rating,
    reviewCount: row.review_count,
    reviews: parseJson(row.reviews, []),
    features: parseJson(row.features, []),
    stock: row.stock_qty > 0,
    stockStatus: row.stock_status,
    stockQty: row.stock_qty,
    leadTimeDays: row.lead_time_days,
    origin: row.origin,
    imageUrl: row.image_url || null,
    gallery: parseJson(row.gallery, []),
    social: {
      tiktok: row.social_tiktok || '',
      facebook: row.social_facebook || '',
      telegram: row.social_telegram || '',
    },
    featured: !!row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** A product row in the flat shape the admin form edits. */
export function toAdmin(row) {
  if (!row) return null;
  return {
    ...row,
    art: parseJson(row.art, {}),
    materials: parseJson(row.materials, []),
    colors: parseJson(row.colors, []),
    sizes: parseJson(row.sizes, []),
    dims: parseJson(row.dims, {}),
    reviews: parseJson(row.reviews, []),
    features: parseJson(row.features, []),
    gallery: parseJson(row.gallery, []),
    featured: !!row.featured,
  };
}

export function toClientCollection(row) {
  return {
    slug: row.slug,
    key: row.name_key,
    tint: row.tint,
    pieces: parseJson(row.pieces, []),
  };
}

const USER_ADDED_COLUMNS = [
  ['email', "TEXT NOT NULL DEFAULT ''"],
  ['google_sub', "TEXT NOT NULL DEFAULT ''"],
];

/** Add any column an older database is missing. */
async function ensureColumns(db, table, list) {
  const info = await db.prepare(`PRAGMA table_info(${table})`).all();
  const present = new Set((info.results || []).map((c) => c.name));
  for (const [name, ddl] of list) {
    if (!present.has(name)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`).run();
  }
}

export async function ensureSchema(db) {
  await db.batch(DDL.map((sql) => db.prepare(sql)));
  await ensureColumns(db, 'products', ADDED_COLUMNS);
  await ensureColumns(db, 'users', USER_ADDED_COLUMNS);
  // Partial unique indexes: a shopper may sign up with an email or through
  // Google, and older rows have neither. Empty strings must not collide.
  await db.batch([
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email <> ''`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub <> ''`),
  ]);
  await db
    .prepare(`INSERT INTO meta (k, v) VALUES ('schema_version', ?)
              ON CONFLICT(k) DO UPDATE SET v = excluded.v`)
    .bind(String(SCHEMA_VERSION))
    .run();
  await seedGallery(db);
}

let gallerySeededInIsolate = false;

/**
 * The gallery (src/showcase.js) is the shop's curated collection: pieces with a
 * story, not stock with a price. It is replaced wholesale when GALLERY_VERSION
 * changes, and the previous showcase rows are cleared in the same pass so no
 * price ever survives on the storefront.
 */
const GALLERY_VERSION = 'gallery_v19';

async function seedGallery(db) {
  if (gallerySeededInIsolate) return;
  gallerySeededInIsolate = true;
  const done = await db.prepare(`SELECT v FROM meta WHERE k = ?`).bind(GALLERY_VERSION).first().catch(() => null);
  if (done) return;
  await db.prepare(`DELETE FROM products WHERE updated_by IN ('showcase', 'gallery') OR id LIKE 's_%'`).run();
  const stamp = now();
  const statements = SHOWCASE.map((p, index) => {
    const values = {
      id: `g_${p.sku.toLowerCase()}`,
      slug: p.slug,
      sku: p.sku,
      name_en: p.name_en,
      name_am: p.name_am,
      tagline_en: p.tagline_en,
      tagline_am: p.tagline_am,
      desc_en: p.desc_en,
      desc_am: p.desc_am,
      category: p.category,
      room: p.room,
      price: p.price,
      compare_at: p.compare_at,
      badge: p.badge,
      stock_status: p.stock_status,
      stock_qty: p.stock_qty,
      lead_time_days: p.lead_time_days,
      origin: p.origin,
      art: JSON.stringify({ type: 'sofa', variant: 1 }),
      materials: JSON.stringify(p.materials),
      colors: JSON.stringify(p.colors),
      sizes: JSON.stringify(p.sizes),
      dims: JSON.stringify(p.dims),
      weight: p.weight,
      rating: null,
      review_count: 0,
      reviews: '[]',
      features: JSON.stringify(p.features),
      care_en: p.care_en,
      care_am: p.care_am,
      image_url: p.image,
      gallery: JSON.stringify(p.gallery || []),
      status: 'published',
      featured: p.featured ? 1 : 0,
      seo_title: '',
      seo_desc: '',
      social_tiktok: '',
      social_facebook: '',
      social_telegram: '',
      created_at: p.created_at || new Date(Date.parse(stamp) - (SHOWCASE.length - index) * 86400000).toISOString(),
      updated_at: stamp,
      updated_by: 'gallery',
    };
    return db
      .prepare(
        `INSERT OR IGNORE INTO products (${PRODUCT_COLUMNS.join(',')})
         VALUES (${PRODUCT_COLUMNS.map(() => '?').join(',')})`
      )
      .bind(...PRODUCT_COLUMNS.map((c) => values[c]));
  });
  // D1 accepts a bounded batch; seed the collection in chunks so a large
  // upload set cannot exceed that bound in one request.
  for (let i = 0; i < statements.length; i += 40) {
    await db.batch(statements.slice(i, i + 40));
  }
  await db.prepare(`INSERT OR IGNORE INTO meta (k, v) VALUES (?, ?)`).bind(GALLERY_VERSION, stamp).run();
}

/* ------------------------------------------------------------------ products */

export async function listPublicProducts(db) {
  const { results } = await db
    .prepare(`SELECT * FROM products WHERE status = 'published' ORDER BY featured DESC, updated_at DESC`)
    .all();
  return (results || []).map(toClient);
}

export async function getPublicProduct(db, slug) {
  const row = await db.prepare(`SELECT * FROM products WHERE slug = ? AND status = 'published'`).bind(slug).first();
  return row ? toClient(row) : null;
}

export async function listCollections(db) {
  const { results } = await db.prepare(`SELECT * FROM collections ORDER BY sort_order ASC`).all();
  return (results || []).map(toClientCollection);
}

export async function catalogue(db) {
  const [products, collections] = await Promise.all([listPublicProducts(db), listCollections(db)]);
  return { products, collections, updatedAt: now() };
}

export async function adminListProducts(db, { q, status, category, sort, page, limit }) {
  const where = [];
  const params = [];
  if (q) {
    where.push('(name_en LIKE ? OR name_am LIKE ? OR sku LIKE ? OR slug LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = sortSql(sort, false);
  const offset = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    db
      .prepare(`SELECT * FROM products ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all(),
    db.prepare(`SELECT COUNT(*) AS n FROM products ${clause}`).bind(...params).first(),
  ]);
  return {
    products: (rows.results || []).map(toAdmin),
    total: total ? total.n : 0,
    page,
    limit,
    pages: Math.max(1, Math.ceil((total ? total.n : 0) / limit)),
  };
}

export async function adminGetProduct(db, id) {
  const row = await db.prepare(`SELECT * FROM products WHERE id = ? OR slug = ?`).bind(id, id).first();
  return row ? toAdmin(row) : null;
}

export async function createProduct(db, values, actor) {
  const id = `p_${crypto.randomUUID()}`;
  const stamp = now();
  const record = { ...values, id, created_at: stamp, updated_at: stamp, updated_by: actor };
  await db
    .prepare(`INSERT INTO products (${PRODUCT_COLUMNS.join(',')}) VALUES (${PRODUCT_COLUMNS.map(() => '?').join(',')})`)
    .bind(...PRODUCT_COLUMNS.map((c) => record[c]))
    .run();
  return record.id;
}

export async function updateProduct(db, id, values, actor) {
  const keys = Object.keys(values);
  if (!keys.length) return;
  const stamp = now();
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  await db
    .prepare(`UPDATE products SET ${sets}, updated_at = ?, updated_by = ? WHERE id = ?`)
    .bind(...keys.map((k) => values[k]), stamp, actor, id)
    .run();
}

export async function deleteProduct(db, id) {
  await db.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
}

export async function slugTaken(db, slug, exceptId) {
  const row = await db.prepare(`SELECT id FROM products WHERE slug = ?`).bind(slug).first();
  return !!(row && row.id !== exceptId);
}

export async function skuTaken(db, sku, exceptId) {
  const row = await db.prepare(`SELECT id FROM products WHERE sku = ?`).bind(sku).first();
  return !!(row && row.id !== exceptId);
}

/* -------------------------------------------------------------------- orders */

export async function createOrder(db, order) {
  const id = `o_${crypto.randomUUID()}`;
  const ref = await nextOrderRef(db);
  const stamp = now();
  await db
    .prepare(
      `INSERT INTO orders (id, ref, customer_name, phone, city, address, transport, payment, note, items, subtotal, total, status, payment_status, admin_note, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      ref,
      order.customer_name,
      order.phone,
      order.city,
      order.address,
      order.transport,
      order.payment,
      order.note,
      JSON.stringify(order.items),
      order.subtotal,
      order.total,
      'new',
      'unpaid',
      '',
      stamp,
      stamp
    )
    .run();
  return { id, ref, createdAt: stamp };
}

async function nextOrderRef(db) {
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM orders`).first();
  const seq = String((row ? row.n : 0) + 1).padStart(4, '0');
  return `FF-${yymm}-${seq}`;
}

export async function listOrders(db, { status, q, page = 1, limit = 20 } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (q) {
    where.push('(ref LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR city LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    db
      .prepare(`SELECT * FROM orders ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all(),
    db.prepare(`SELECT COUNT(*) AS n FROM orders ${clause}`).bind(...params).first(),
  ]);
  const n = total ? total.n : 0;
  return {
    orders: (rows.results || []).map((o) => ({ ...o, items: parseJson(o.items, []) })),
    total: n,
    page,
    limit,
    pages: Math.max(1, Math.ceil(n / limit)),
  };
}

export async function updateOrder(db, id, values) {
  const keys = Object.keys(values);
  if (!keys.length) return 0;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const res = await db
    .prepare(`UPDATE orders SET ${sets}, updated_at = ? WHERE id = ?`)
    .bind(...keys.map((k) => values[k]), now(), id)
    .run();
  return res.meta ? res.meta.changes : 1;
}

export async function orderStats(db) {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM products WHERE status='published') AS published,
        (SELECT COUNT(*) FROM products WHERE status='draft') AS draft,
        (SELECT COUNT(*) FROM products WHERE stock_qty <= 0 AND status='published') AS out_of_stock,
        (SELECT COUNT(*) FROM orders WHERE status='new') AS new_orders,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE status != 'cancelled') AS revenue`
    )
    .first();
  return row || {};
}

export async function lowStock(db) {
  const { results } = await db
    .prepare(`SELECT id, slug, name_en, sku, stock_qty FROM products WHERE stock_qty <= 2 ORDER BY stock_qty ASC LIMIT 8`)
    .all();
  return results || [];
}

/* --------------------------------------------------------------- audit / rate */

export async function audit(db, { actor, email, action, object, detail }) {
  await db
    .prepare(`INSERT INTO audit (at, actor, actor_email, action, object, detail) VALUES (?,?,?,?,?,?)`)
    .bind(now(), actor || '', email || '', action, object || '', detail || '')
    .run();
}

export async function listAudit(db, limit = 50) {
  const { results } = await db.prepare(`SELECT * FROM audit ORDER BY id DESC LIMIT ?`).bind(limit).all();
  return results || [];
}

/**
 * Fixed-window counter. Returns false when the caller is over the limit.
 * Used for order submission and admin writes, keyed by IP and scope.
 */
export async function allow(db, key, limit, windowSeconds) {
  // The counter is a guard, not a dependency: if its table is unavailable the
  // sign-in and enquiry routes must still work instead of returning a 500.
  try {
    const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
    const row = await db.prepare(`SELECT window_start, count FROM rate WHERE key = ?`).bind(key).first();
    if (!row || row.window_start !== windowStart) {
      await db
        .prepare(`INSERT INTO rate (key, window_start, count) VALUES (?,?,1)
                  ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1`)
        .bind(key, windowStart)
        .run();
      return true;
    }
    if (row.count >= limit) return false;
    await db.prepare(`UPDATE rate SET count = count + 1 WHERE key = ?`).bind(key).run();
    return true;
  } catch (error) {
    console.error('rate limit unavailable', error && error.message);
    return true;
  }
}

/* -------------------------------------------------------------------- admins */

export async function adminCount(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM admins`).first();
  return row ? row.n : 0;
}

export async function getAdmin(db, sub) {
  return db.prepare(`SELECT * FROM admins WHERE sub = ?`).bind(sub).first();
}

export async function addAdmin(db, { sub, email, name, role = 'owner' }) {
  await db
    .prepare(`INSERT INTO admins (sub, email, name, role, created_at, last_seen) VALUES (?,?,?,?,?,?)`)
    .bind(sub, email || '', name || '', role, now(), now())
    .run();
}

export async function touchAdmin(db, sub) {
  await db.prepare(`UPDATE admins SET last_seen = ? WHERE sub = ?`).bind(now(), sub).run();
}

export async function removeAdminByEmail(db, email) {
  await db.prepare(`DELETE FROM admins WHERE email = ?`).bind(email).run();
}

/* ------------------------------------------------------------- shop paging */

/**
 * Public catalogue query with filtering and pagination.
 *
 * The storefront only ever asks for one page at a time, so the server never
 * builds a full catalogue response for a shop that has hundreds of pieces.
 * Every identifier (sort order, price bucket) is looked up in an allow-list.
 */
export async function searchPublicProducts(db, { q, cats, room, material, price, avail, sort, page = 1, per = 12 } = {}) {
  const where = [`status = 'published'`];
  const params = [];

  const categories = (cats || []).filter((c) => CATEGORY_IDS.includes(c));
  if (categories.length) {
    where.push(`category IN (${categories.map(() => '?').join(',')})`);
    params.push(...categories);
  }
  if (room && ROOM_IDS.includes(room)) {
    where.push('room = ?');
    params.push(room);
  }
  const materialIds = String(material || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^[a-z-]{2,20}$/.test(id))
    .slice(0, 8);
  if (materialIds.length) {
    // The first entry is the piece's primary material; secondary materials
    // (foam, steel legs, a hardwood frame) should not pull it into a family.
    where.push('json_extract(materials, \'$[0]\') IN (' + materialIds.map(() => '?').join(',') + ')');
    params.push(...materialIds);
  }
  if (avail === 'instock') where.push(`stock_qty > 0`);
  if (avail === 'made') where.push(`stock_qty <= 0`);
  if (q) {
    where.push('(name_en LIKE ? OR name_am LIKE ? OR sku LIKE ? OR slug LIKE ? OR tagline_en LIKE ? OR tagline_am LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }

  const clause = `WHERE ${where.join(' AND ')}`;
  const order = PUBLIC_SORTS[sort] || PUBLIC_SORTS.featured;
  const size = Math.min(24, Math.max(1, Number(per) || 12));
  const current = Math.max(1, Number(page) || 1);
  const offset = (current - 1) * size;

  const [rows, total, categoryRows] = await Promise.all([
    db
      .prepare(`SELECT * FROM products ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .bind(...params, size, offset)
      .all(),
    db.prepare(`SELECT COUNT(*) AS n FROM products ${clause}`).bind(...params).first(),
    db.prepare(`SELECT category, COUNT(*) AS n FROM products WHERE status = 'published' GROUP BY category`).all(),
  ]);
  const count = total ? total.n : 0;
  const counts = {};
  for (const row of categoryRows.results || []) counts[row.category] = row.n;
  return {
    products: (rows.results || []).map(toClient),
    total: count,
    counts,
    page: current,
    per: size,
    pages: Math.max(1, Math.ceil(count / size)),
    updatedAt: now(),
  };
}

/* --------------------------------------------------------- owner accounts */

export async function adminUserCount(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM admin_users`).first();
  return row ? row.n : 0;
}

export async function findAdminByUsername(db, username) {
  return db.prepare(`SELECT * FROM admin_users WHERE username = ?`).bind(username).first();
}

export async function createAdminUser(db, { username, name, hash, salt, iterations }) {
  const id = `a_${crypto.randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO admin_users (id, username, name, password_hash, password_salt, iterations, role, created_at, last_seen)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .bind(id, username, name || '', hash, salt, iterations, 'owner', now(), now())
    .run();
  return id;
}

export async function touchAdminUser(db, id) {
  await db.prepare(`UPDATE admin_users SET last_seen = ? WHERE id = ?`).bind(now(), id).run();
}

export async function setAdminPassword(db, id, { hash, salt, iterations }) {
  await db
    .prepare(`UPDATE admin_users SET password_hash = ?, password_salt = ?, iterations = ? WHERE id = ?`)
    .bind(hash, salt, iterations, id)
    .run();
}

export async function createSession(db, { tokenHash, adminId, ip, userAgent }) {
  const created = now();
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  await db
    .prepare(`INSERT INTO sessions (token_hash, admin_id, created_at, expires_at, ip, user_agent) VALUES (?,?,?,?,?,?)`)
    .bind(tokenHash, adminId, created, expires, ip || '', (userAgent || '').slice(0, 200))
    .run();
  return expires;
}

export async function deleteSession(db, tokenHash) {
  await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
}

export async function clearSessionsFor(db, adminId) {
  await db.prepare(`DELETE FROM sessions WHERE admin_id = ?`).bind(adminId).run();
}


/* ------------------------------------------------------- customer accounts */

export async function findUserByUsername(db, username) {
  return db.prepare(`SELECT * FROM users WHERE username = ? AND status = 'active'`).bind(username).first();
}

export async function findUserByEmail(db, email) {
  return db.prepare(`SELECT * FROM users WHERE email = ? AND status = 'active'`).bind(email).first();
}

export async function findUserById(db, id) {
  return db.prepare(`SELECT * FROM users WHERE id = ? AND status = 'active'`).bind(id).first();
}

export async function findUserByGoogleSub(db, sub) {
  return db.prepare(`SELECT * FROM users WHERE google_sub = ? AND status = 'active'`).bind(sub).first();
}

/**
 * A shopper account. `username` stays unique and holds the email, so the
 * existing lookups and sessions keep working; Google-only accounts have no
 * password hash, and verifyPassword() already refuses those rows.
 */
export async function createUser(db, { email, username, name, hash, salt, iterations, googleSub }) {
  const id = `u_${crypto.randomUUID()}`;
  const handle = String(username || email || '').toLowerCase();
  await db
    .prepare(
      `INSERT INTO users (id, username, email, google_sub, name, password_hash, password_salt, iterations, status, created_at, last_seen)
       VALUES (?,?,?,?,?,?,?,?,'active',?,?)`
    )
    .bind(
      id,
      handle,
      String(email || '').toLowerCase(),
      googleSub || '',
      name || '',
      hash || '',
      salt || '',
      Number(iterations) || 0,
      now(),
      now()
    )
    .run();
  return id;
}

export async function linkUserGoogle(db, id, sub) {
  await db.prepare(`UPDATE users SET google_sub = ? WHERE id = ?`).bind(sub, id).run();
}

export async function setUserPassword(db, id, { hash, salt, iterations }) {
  await db
    .prepare(`UPDATE users SET password_hash = ?, password_salt = ?, iterations = ? WHERE id = ?`)
    .bind(hash, salt, iterations, id)
    .run();
}

export async function clearUserSessions(db, userId) {
  await db.prepare(`DELETE FROM user_sessions WHERE user_id = ?`).bind(userId).run();
}

/* ------------------------------------------------------- password resets */

export async function createPasswordReset(db, { tokenHash, userId, expiresAt }) {
  await db.prepare(`DELETE FROM password_resets WHERE expires_at < ?`).bind(now()).run();
  await db
    .prepare(`INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)`)
    .bind(tokenHash, userId, now(), expiresAt)
    .run();
}

export async function findPasswordReset(db, tokenHash) {
  return db.prepare(`SELECT * FROM password_resets WHERE token_hash = ?`).bind(tokenHash).first();
}

export async function usePasswordReset(db, tokenHash) {
  await db.prepare(`UPDATE password_resets SET used_at = ? WHERE token_hash = ?`).bind(now(), tokenHash).run();
}

export async function touchUser(db, id) {
  await db.prepare(`UPDATE users SET last_seen = ? WHERE id = ?`).bind(now(), id).run();
}

export async function createUserSession(db, { tokenHash, userId, ip, userAgent }) {
  const created = now();
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();
  await db
    .prepare(`INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, ip, user_agent) VALUES (?,?,?,?,?,?)`)
    .bind(tokenHash, userId, created, expires, ip || '', (userAgent || '').slice(0, 200))
    .run();
  return expires;
}

export async function deleteUserSession(db, tokenHash) {
  await db.prepare(`DELETE FROM user_sessions WHERE token_hash = ?`).bind(tokenHash).run();
}

/* ------------------------------------------------------- saved / viewed */

export async function listWishlistSlugs(db, ownerId) {
  const { results } = await db
    .prepare(`SELECT slug FROM wishlist WHERE owner_id = ? ORDER BY created_at DESC`)
    .bind(ownerId)
    .all();
  return (results || []).map((r) => r.slug);
}

export async function setWishlist(db, ownerId, slug, on) {
  if (on) {
    await db
      .prepare(`INSERT INTO wishlist (owner_id, slug, created_at) VALUES (?,?,?) ON CONFLICT(owner_id, slug) DO NOTHING`)
      .bind(ownerId, slug, now())
      .run();
  } else {
    await db.prepare(`DELETE FROM wishlist WHERE owner_id = ? AND slug = ?`).bind(ownerId, slug).run();
  }
  return listWishlistSlugs(db, ownerId);
}

export async function recordView(db, ownerId, slug) {
  await db
    .prepare(
      `INSERT INTO recent_views (owner_id, slug, viewed_at) VALUES (?,?,?)
       ON CONFLICT(owner_id, slug) DO UPDATE SET viewed_at = excluded.viewed_at`
    )
    .bind(ownerId, slug, now())
    .run();
  await db
    .prepare(
      `DELETE FROM recent_views WHERE owner_id = ? AND slug NOT IN (
         SELECT slug FROM recent_views WHERE owner_id = ? ORDER BY viewed_at DESC LIMIT 12)`
    )
    .bind(ownerId, ownerId)
    .run();
}

export async function listRecentSlugs(db, ownerId) {
  const { results } = await db
    .prepare(`SELECT slug FROM recent_views WHERE owner_id = ? ORDER BY viewed_at DESC LIMIT 12`)
    .bind(ownerId)
    .all();
  return (results || []).map((r) => r.slug);
}

export async function productsBySlugs(db, slugs) {
  const list = (slugs || []).filter((slug) => typeof slug === 'string' && slug.length < 90);
  if (!list.length) return [];
  const { results } = await db
    .prepare(
      `SELECT * FROM products WHERE status = 'published' AND slug IN (${list.map(() => '?').join(',')})`
    )
    .bind(...list)
    .all();
  const bySlug = new Map((results || []).map((row) => [row.slug, toClient(row)]));
  return list.map((slug) => bySlug.get(slug)).filter(Boolean);
}

/* ------------------------------------------------------------ compare shelf */

export async function listCompareSlugs(db, ownerId) {
  const { results } = await db
    .prepare(`SELECT slug FROM compare WHERE owner_id = ? ORDER BY created_at ASC`)
    .bind(ownerId)
    .all();
  return (results || []).map((r) => r.slug);
}

/** Up to three pieces, kept per account so the list follows the shopper. */
export async function setCompare(db, ownerId, slug, on) {
  if (on) {
    const current = await listCompareSlugs(db, ownerId);
    if (!current.includes(slug)) {
      if (current.length >= 3) return { slugs: current, limit: true };
      await db
        .prepare(`INSERT INTO compare (owner_id, slug, created_at) VALUES (?,?,?) ON CONFLICT(owner_id, slug) DO NOTHING`)
        .bind(ownerId, slug, now())
        .run();
    }
  } else {
    await db.prepare(`DELETE FROM compare WHERE owner_id = ? AND slug = ?`).bind(ownerId, slug).run();
  }
  return { slugs: await listCompareSlugs(db, ownerId), limit: false };
}

export async function clearCompare(db, ownerId) {
  await db.prepare(`DELETE FROM compare WHERE owner_id = ?`).bind(ownerId).run();
}
