/* FineFurniture — catalogue plumbing.
 *
 * The gallery lives in the shop database, entered as a curated collection and
 * read back through GET /api/catalogue. This file holds only the fixed
 * taxonomies (categories, materials, rooms) and the code that normalises what
 * the API returns. There is no price anywhere in the client.
 */

const CATEGORIES = [
  { id: 'sofas', name: { en: 'Sofas & lounges', am: 'ሶፋና ማረፊያ' } },
  { id: 'chairs', name: { en: 'Chairs & armchairs', am: 'ወንበሮች' } },
  { id: 'tables', name: { en: 'Tables & consoles', am: 'ጠረጴዛዎች' } },
  { id: 'dining', name: { en: 'Dining', am: 'የመመገቢያ ዕቃ' } },
  { id: 'bedroom', name: { en: 'Beds & bedroom', am: 'አልጋና መኝታ' } },
  { id: 'storage', name: { en: 'Cabinets & storage', am: 'ቁምሳጥንና ማከማቻ' } },
  { id: 'office', name: { en: 'Office', am: 'የቢሮ ዕቃ' } },
];

const MATERIALS = [
  { id: 'leather', name: { en: 'Leather', am: 'ቆዳ' } },
  { id: 'linen', name: { en: 'Linen', am: 'ተልባ' } },
  { id: 'cotton', name: { en: 'Hand-woven cotton', am: 'በእጅ የተሸመነ ጥጥ' } },
  { id: 'velvet', name: { en: 'Velvet', am: 'ቬልቬት' } },
  { id: 'boucle', name: { en: 'Bouclé', am: 'ቡክሌ' } },
  { id: 'solid-wood', name: { en: 'Solid wood', am: 'ጠንካራ እንጨት' } },
  { id: 'oak', name: { en: 'Oak', am: 'ኦክ' } },
  { id: 'walnut', name: { en: 'Walnut', am: 'ዋልነት' } },
  { id: 'foam', name: { en: 'Foam & upholstery', am: 'ስፖንጅና ጨርቅ' } },
  { id: 'mesh', name: { en: 'Mesh', am: 'ሜሽ' } },
  { id: 'metal', name: { en: 'Metal', am: 'ብረት' } },
  { id: 'glass', name: { en: 'Glass', am: 'መስታወት' } },
  { id: 'stone', name: { en: 'Stone', am: 'ድንጋይ' } },
];

const ROOMS = [
  { id: 'living', key: 'rooms.living' },
  { id: 'bedroom', key: 'rooms.bedroom' },
  { id: 'dining', key: 'rooms.dining' },
  { id: 'office', key: 'rooms.office' },
];

/* Filled from the database by applyCatalogue(). */
const PRODUCTS = [];

function productBySlug(slug) {
  return PRODUCTS.find((p) => p.slug === slug) || null;
}

function productList() {
  return PRODUCTS.slice();
}

function categoryName(id, lang) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.name[lang] || c.name.en : id;
}

function materialName(id, lang) {
  const m = MATERIALS.find((x) => x.id === id);
  return m ? m.name[lang] || m.name.en : id;
}

/* --------------------------------------------------------------- live data */
const CACHE_KEY = 'ff_catalogue_v8';
const DEFAULT_COLOR = { id: 'standard', name: { en: 'As shown', am: 'እንደሚታየው' }, hex: '#c9b299' };
const DEFAULT_SIZE = { id: 'standard', label: { en: 'As shown', am: 'እንደሚታየው' } };

const SHOP_PER = 12;

function normaliseProduct(p) {
  const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : [DEFAULT_COLOR];
  const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : [DEFAULT_SIZE];
  const clean = Object.assign({}, p, {
    name: p.name || { en: p.slug, am: p.slug },
    tagline: p.tagline || { en: '', am: '' },
    desc: p.desc || { en: '', am: '' },
    care: p.care || { en: '', am: '' },
    dims: p.dims || {},
    colors: colors,
    sizes: sizes,
    materials: Array.isArray(p.materials) ? p.materials : [],
    features: Array.isArray(p.features) ? p.features : [],
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    stock: p.stock === undefined ? Number(p.stockQty) > 0 : !!p.stock,
    imageUrl: p.imageUrl || null,
    social: p.social && typeof p.social === 'object' ? p.social : { tiktok: '', facebook: '', telegram: '' },
  });
  // A price must never reach the client, even if an old row still carries one.
  delete clean.price;
  delete clean.compareAt;
  delete clean.compare_at;
  delete clean.badge;
  return clean;
}

function shopQuery(params) {
  const qs = new URLSearchParams();
  ['cat', 'room', 'material', 'avail', 'q', 'sort'].forEach((key) => {
    const value = params.get(key);
    if (value) qs.set(key, value);
  });
  qs.set('per', String(SHOP_PER));
  qs.set('page', String(Math.max(1, Number(params.get('page')) || 1)));
  return qs;
}

/**
 * Ask the API for one page of the gallery. Filtering, sorting and counting all
 * happen in SQL, so the browser never downloads the whole catalogue.
 */
const SHOP_CACHE_TTL = 45000;
const shopCache = new Map();
const shopInflight = new Map();

function shopCacheKey(params) {
  return shopQuery(params).toString();
}

/**
 * One page of the gallery. A page that was just loaded is reused for a few
 * seconds, and two requests for the same page share one network call, so
 * switching filters feels instant instead of re-downloading the grid.
 */
async function loadShop(params, options) {
  const opts = options || {};
  const key = shopCacheKey(params);
  const hit = shopCache.get(key);
  if (!opts.fresh && hit && Date.now() - hit.at < SHOP_CACHE_TTL) return hit.data;
  if (shopInflight.has(key)) return shopInflight.get(key);
  const request = (async () => {
    const res = await fetch('/api/catalogue?' + key, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('The catalogue could not be loaded');
    const data = await res.json();
    data.products = (data.products || []).map(normaliseProduct);
    if (data.counts) window.FF.categoryCounts = data.counts;
    if (typeof data.total === 'number') window.FF.catalogueTotal = data.total;
    (data.products || []).forEach((p) => {
      if (!productBySlug(p.slug)) PRODUCTS.push(p);
    });
    shopCache.set(key, { at: Date.now(), data });
    FF.shop = data;
    FF.hasCatalogue = true;
    return data;
  })();
  shopInflight.set(key, request);
  try {
    return await request;
  } finally {
    shopInflight.delete(key);
  }
}

/** Warms the next page while the shopper is still reading this one. */
function prefetchShop(params) {
  loadShop(params).catch(() => {});
}

function prefetchProduct(slug) {
  const known = productBySlug(slug);
  if (known) return;
  fetch('/api/products/' + encodeURIComponent(slug), { headers: { accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.product && !productBySlug(data.product.slug)) PRODUCTS.push(normaliseProduct(data.product));
    })
    .catch(() => {});
}

async function loadCompare(slugs) {
  const list = (slugs || []).filter(Boolean).slice(0, 3);
  if (!list.length) return [];
  const res = await fetch('/api/compare?slugs=' + encodeURIComponent(list.join(',')), {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products || []).map(normaliseProduct);
}

async function searchProducts(q) {
  const term = String(q || '').trim();
  if (!term) return { results: [], total: 0 };
  const res = await fetch('/api/search?q=' + encodeURIComponent(term), { headers: { accept: 'application/json' } });
  if (!res.ok) return { results: [], total: 0 };
  return res.json();
}

/** Product detail pages can be opened directly, so fetch the piece by slug. */
async function loadProduct(slug) {
  const known = productBySlug(slug);
  if (known) return known;
  const res = await fetch('/api/products/' + encodeURIComponent(slug), { headers: { accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('The piece could not be loaded');
  const data = await res.json();
  const product = normaliseProduct(data.product);
  PRODUCTS.push(product);
  if (product.category) {
    try {
      const related = await loadShop(new URLSearchParams({ cat: product.category, per: '5' }));
      product.related = related.products.filter((p) => p.slug !== product.slug).slice(0, 4);
    } catch (error) {
      product.related = [];
    }
  }
  return product;
}

/**
 * The editorial pages need the whole collection, not one shop page. Load both
 * pages once, merge them into the in-memory catalogue and reuse the promise so
 * a second visit to a room or material page is instant.
 */
let allProductsPromise = null;

async function loadAllProducts() {
  if (allProductsPromise) return allProductsPromise;
  allProductsPromise = (async () => {
    let page = 1;
    let pages = 1;
    const collected = [];
    do {
      const res = await fetch('/api/catalogue?per=24&page=' + page + '&sort=featured', {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error('The catalogue could not be loaded');
      const data = await res.json();
      (data.products || []).map(normaliseProduct).forEach((p) => {
        if (!collected.some((x) => x.slug === p.slug)) collected.push(p);
      });
      pages = Math.max(1, Number(data.pages) || 1);
      page += 1;
    } while (page <= pages && page <= 6);

    // The home page loads a small page of the catalogue in parallel. Merge at
    // the end instead of pushing page by page, so that a late background
    // replace cannot leave us with a half catalogue.
    collected.forEach((p) => {
      if (!productBySlug(p.slug)) PRODUCTS.push(p);
    });
    window.FF.hasCatalogue = true;
    cacheCatalogue({ products: collected, total: collected.length, page: 1, pages: 1 });
    return collected;
  })().catch((error) => {
    allProductsPromise = null;
    throw error;
  });
  return allProductsPromise;
}

/** Replace the in-memory catalogue with what the shop database returned. */
function applyCatalogue(products) {
  if (!Array.isArray(products)) return false;
  PRODUCTS.length = 0;
  products.map(normaliseProduct).forEach((p) => PRODUCTS.push(p));
  window.FF.hasCatalogue = true;
  return true;
}

function cacheCatalogue(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data }));
  } catch (e) {
    /* storage full or unavailable */
  }
}

function cachedCatalogue() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!raw || !raw.data || !Array.isArray(raw.data.products) || !raw.data.products.length) return null;
    if (Date.now() - (raw.at || 0) > 86400000) return null;
    return raw.data;
  } catch (e) {
    return null;
  }
}

window.FF = window.FF || {};
Object.assign(window.FF, {
  CATEGORIES,
  MATERIALS,
  ROOMS,
  PRODUCTS,
  productBySlug,
  productList,
  categoryName,
  materialName,
  applyCatalogue,
  loadShop,
  loadAllProducts,
  loadProduct,
  prefetchShop,
  prefetchProduct,
  loadCompare,
  searchProducts,
  SHOP_PER,
  cachedCatalogue,
  cacheCatalogue,
  hasCatalogue: false,
});
