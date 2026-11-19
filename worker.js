/**
 * FineFurniture worker: JSON API and the server-rendered document shell on one
 * origin. Every route gets its own title, description, canonical URL, social
 * card and structured data before the browser scripts run, so search engines
 * and link previews see the real page — not a generic single-page shell.
 *
 * There is no shop-admin area: the gallery is curated in src/showcase.js and
 * stored in D1. There are no prices anywhere in the product responses.
 */
import { ApiError, handleApi } from './src/api.js';
import { readSession, readUserSession } from './src/auth.js';
import * as db from './src/db.js';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

const BASE_CSP =
  "default-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; " +
  "font-src 'self'; " +
  "connect-src 'self'; " +
  "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; " +
  'upgrade-insecure-requests';

const PHONE = '+251920282861';
const PHONE_TEXT = '0920 282861';
const SOCIAL = [
  'https://www.facebook.com/finefurnituredebremarkos',
  'https://t.me/finefurnitures',
  'https://www.tiktok.com/@finefurnituer',
];

const CATEGORY_NAMES = {
  sofas: { en: 'Sofas & lounges', am: 'ሶፋና ማረፊያ' },
  chairs: { en: 'Chairs & armchairs', am: 'ወንበሮች' },
  tables: { en: 'Tables & consoles', am: 'ጠረጴዛዎች' },
  dining: { en: 'Dining', am: 'የመመገቢያ ዕቃ' },
  bedroom: { en: 'Beds & bedroom', am: 'አልጋና መኝታ' },
  storage: { en: 'Cabinets & storage', am: 'ቁምሳጥንና ማማከማቻ' },
  office: { en: 'Office', am: 'የቢሮ ዕቃ' },
};

const PAGES = {
  '/': {
    title: 'Fine Furniture Debre Markos | Showroom and workshop',
    description:
      'Fine Furniture Debre Markos: three furniture showrooms with Italian leather sofas, oak and walnut tables, beds, wardrobes and hand-woven chairs, plus furniture made to your design. Call 0920 282861.',
    image: '/assets/img/gallery/cream-showroom-sofa-set-lux4-960.webp',
  },
  '/shop': {
    title: 'Furniture gallery in Debre Markos | Fine Furniture',
    description:
      'Browse the Fine Furniture collection in Debre Markos: leather and linen sofas, oak dining tables, beds, wardrobes, sideboards and hand-woven chairs.',
    image: '/assets/img/gallery/grey-modular-sofa-lux4-960.webp',
  },
  '/services': {
    title: 'Custom furniture made to your design | Fine Furniture Debre Markos',
    description:
      'Furniture made to your own design in Debre Markos: wardrobes, tables, sideboards and full-room pieces, measured and built in the Fine Furniture workshop.',
    image: '/assets/img/gallery/oak-wardrobe-lux4-960.webp',
  },
  '/showroom': {
    title: 'Three furniture showrooms in Debre Markos | Fine Furniture',
    description:
      'Visit Fine Furniture in Debre Markos: Ambasel Building first floor, in front of Shebel Hotel, and Kebele 02 at the university. Open Monday to Saturday, 9:00–17:00.',
    image: '/assets/img/gallery/beige-showroom-sofa-set-lux4-960.webp',
  },
  '/contact': {
    title: 'Contact Fine Furniture, Debre Markos | 0920 282861',
    description:
      'Call Fine Furniture Debre Markos on 0920 282861, Monday to Saturday 9:00–17:00, or visit one of three showrooms to see the collection in person.',
    image: '/assets/img/gallery/two-tone-leather-sofa-lux4-960.webp',
  },
  '/inspiration': {
    title: 'Room notes and furniture ideas | Fine Furniture Debre Markos',
    description:
      'Four ways to start a living room, bedroom, dining room or office with furniture from the Fine Furniture showrooms in Debre Markos, with the measurements that make each arrangement work.',
    image: '/assets/img/gallery/grey-curved-boucl-sectional-lux4-960.webp',
  },
  '/materials': {
    title: 'Leather, oak, linen and stone | Fine Furniture Debre Markos',
    description:
      'The materials and finishes in the Fine Furniture collection: full-grain leather, linen, hand-woven cotton, velvet, bouclé, oak, walnut, metal, glass and honed stone. See and touch them in Debre Markos.',
    image: '/assets/img/gallery/vintage-brown-leather-sofa-lux4-960.webp',
  },
  '/care': {
    title: 'Furniture care and workshop craft | Fine Furniture',
    description:
      'How to care for leather, wood, linen and stone furniture, what to do in the first month, and the frame, joinery and upholstery details worth asking about at the Fine Furniture workshop in Debre Markos.',
    image: '/assets/img/gallery/walnut-writing-desk-lux4-960.webp',
  },
  '/privacy': {
    title: 'Privacy and your data | Fine Furniture',
    description:
      'What the Fine Furniture Debre Markos website stores, why it stores it, and how to ask for an account or shortlist to be deleted. No analytics, advertising or tracking scripts.',
    image: '/assets/img/gallery/white-bookshelf-lux4-960.webp',
  },
};

const PRIVATE_PAGES = new Set(['/login', '/register', '/forgot', '/reset', '/account', '/compare', '/search']);

const PRIVATE_META = {
  '/login': { title: 'Sign in | Fine Furniture', description: 'Sign in to keep a shortlist of furniture from the Fine Furniture gallery in Debre Markos.' },
  '/register': { title: 'Create an account | Fine Furniture', description: 'Create a free account to save and compare pieces from the Fine Furniture gallery in Debre Markos.' },
  '/forgot': { title: 'Reset your password | Fine Furniture', description: 'Reset the password for your Fine Furniture account.' },
  '/reset': { title: 'Choose a new password | Fine Furniture', description: 'Choose a new password for your Fine Furniture account.' },
  '/account': { title: 'Your dashboard | Fine Furniture', description: 'Your saved pieces, comparisons and recently viewed furniture.' },
  '/compare': { title: 'Compare pieces | Fine Furniture', description: 'Compare furniture from the Fine Furniture gallery side by side.' },
  '/search': { title: 'Search the gallery | Fine Furniture', description: 'Search sofas, chairs, tables, beds and storage in the Fine Furniture gallery, Debre Markos.' },
};

let migrated = false;
const productMetaCache = new Map();
const PRODUCT_META_TTL = 60_000;

/* ------------------------------------------------------------------ helpers */

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : text.slice(0, max - 1).replace(/[\s,.;:—-]+$/, '') + '…';
}

function jsonLdScripts(blocks) {
  return blocks.map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`).join('');
}

async function hashInline(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  let binary = '';
  const bytes = new Uint8Array(digest);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return 'sha256-' + btoa(binary);
}

const ASSET_TYPES = {
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  woff2: 'font/woff2',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  webmanifest: 'application/manifest+json',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  html: 'text/html; charset=utf-8',
};

/* The asset host can guess the wrong MIME type for a handful of extensions.
   Every static file gets an explicit type and the matching cache policy so
   stylesheets and fonts are never blocked by `nosniff`. */
function assetResponse(response, pathname) {
  if (!response || !response.body) return response;
  const ext = (pathname.split('.').pop() || '').toLowerCase();
  const type = ASSET_TYPES[ext];
  const headers = new Headers(response.headers);
  if (type) headers.set('content-type', type);
  if (response.ok) {
    const cache = cacheFor(pathname);
    if (cache) headers.set('cache-control', cache);
  } else {
    headers.set('cache-control', 'no-store');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function cacheFor(pathname) {
  if (pathname.startsWith('/assets/img/gallery/') || pathname.startsWith('/assets/fonts/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (pathname.startsWith('/assets/css/') || pathname.startsWith('/assets/js/')) {
    return 'public, max-age=604800, stale-while-revalidate=86400';
  }
  if (pathname.startsWith('/assets/')) return 'public, max-age=86400';
  if (pathname === '/site.webmanifest' || pathname === '/favicon.ico') return 'public, max-age=86400';
  return '';
}

function harden(response, request, csp) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  const pathname = new URL(request.url).pathname;
  const type = headers.get('content-type') || '';
  if (type.includes('text/html')) {
    if (!headers.has('content-security-policy')) headers.set('content-security-policy', csp || BASE_CSP);
    if (!headers.has('cache-control')) headers.set('cache-control', 'no-cache');
  } else if (!pathname.startsWith('/api/') && response.ok) {
    const cache = cacheFor(pathname);
    // The asset binding adds its own short cache header; for the immutable
    // photo/font folders and the versioned bundles we set the longer one.
    if (cache) headers.set('cache-control', cache);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

async function serveAsset(request, env, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  const response = await env.ASSETS.fetch(new Request(url.toString(), request));
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (location) {
      const next = new URL(location, url);
      if (next.origin === url.origin) return env.ASSETS.fetch(new Request(next.toString(), request));
    }
  }
  return response;
}

async function serverError(env, request) {
  try {
    const asset = await serveAsset(request, env, '/500.html');
    if (asset.status === 200) {
      return new Response(asset.body, {
        status: 500,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'self'; form-action 'self'",
        },
      });
    }
  } catch (error) {
    console.error('error page unavailable', error && error.message);
  }
  return new Response('Something went wrong. Please try again later.', {
    status: 500,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/* --------------------------------------------------------------- metadata */

async function productMeta(env, slug) {
  const cached = productMetaCache.get(slug);
  if (cached && Date.now() - cached.at < PRODUCT_META_TTL) return cached.product;
  try {
    await db.ensureSchema(env.DB);
    const product = await db.getPublicProduct(env.DB, slug);
    if (product) productMetaCache.set(slug, { at: Date.now(), product });
    return product;
  } catch (error) {
    console.error('product metadata unavailable', error && error.message);
    return null;
  }
}

function breadcrumb(origin, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: origin + item.path,
    })),
  };
}

function localBusiness(origin) {
  const branch = (name, street) => ({
    '@type': 'FurnitureStore',
    name,
    url: origin + '/showroom',
    telephone: PHONE,
    address: {
      '@type': 'PostalAddress',
      streetAddress: street,
      addressLocality: 'Debre Markos',
      addressRegion: 'Amhara',
      addressCountry: 'ET',
    },
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': origin + '/#store',
    name: 'Fine Furniture',
    alternateName: ['FineFurniture', 'Fine Furniture Debre Markos', 'ፋይን ፈርኒቸር'],
    slogan: 'Fine furniture in Debre Markos',
    url: origin + '/',
    image: origin + '/assets/img/og-cover.jpg',
    logo: origin + '/assets/img/logo.svg',
    description:
      'A curated furniture gallery in Debre Markos, Ethiopia. Imported leather sofas, oak and walnut tables, beds, wardrobes and hand-woven chairs, plus furniture made to the customer’s own design.',
    telephone: PHONE,
    areaServed: 'Debre Markos, Amhara, Ethiopia',
    sameAs: SOCIAL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Ambasel Building, 1st floor',
      addressLocality: 'Debre Markos',
      addressRegion: 'Amhara',
      addressCountry: 'ET',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '17:00',
      },
    ],
    department: [
      branch('Fine Furniture — Ambasel Building', 'Ambasel Building, 1st floor'),
      branch('Fine Furniture — Shebel Hotel', 'In front of Shebel Hotel, beside Marzeneb Hotel'),
      branch('Fine Furniture — Debre Markos University', 'Kebele 02, Debre Markos University building'),
    ],
  };
}

function website(origin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': origin + '/#website',
    name: 'Fine Furniture Debre Markos',
    alternateName: 'FineFurniture',
    url: origin + '/',
    inLanguage: ['en', 'am'],
    publisher: { '@id': origin + '/#store' },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: origin + '/search?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

function productSchema(origin, product) {
  const image = product.imageUrl
    ? origin + product.imageUrl
    : origin + '/assets/img/og-cover.jpg';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name.en,
    alternateName: product.name.am,
    description: truncate(product.desc.en || product.tagline.en, 320),
    image: [image],
    category: (CATEGORY_NAMES[product.category] || { en: product.category }).en,
    brand: { '@type': 'Brand', name: 'Fine Furniture' },
    material: (product.materials || []).join(', '),
    color: (product.colors || []).map((c) => c.name.en).join(', '),
    url: origin + '/product/' + product.slug,
  };
}

function noscriptContent(origin, info, product, products) {
  const wrap = (title, body, extra) =>
    '<div class="noscript"><h1>' +
    esc(title) +
    '</h1>' +
    body +
    (extra || '') +
    '<p><a href="tel:' + PHONE + '">Call ' + PHONE_TEXT + '</a> · <a href="/showroom">Showrooms</a> · <a href="/shop">Gallery</a></p></div>';

  if (info.type === 'product' && product) {
    const dims = product.dims || {};
    const size = [dims.w, dims.d, dims.h].filter(Boolean).map((n) => n + ' cm').join(' × ');
    return wrap(
      product.name.en,
      '<img src="' + esc(product.imageUrl || '') + '" alt="' + esc(product.name.en + ' in the Fine Furniture showroom, Debre Markos') + '" width="480" height="360" />' +
        '<p>' + esc(product.desc.en || product.tagline.en) + '</p>' +
        '<ul><li>' + esc(product.category) + '</li>' + (size ? '<li>' + esc(size) + '</li>' : '') +
        ((product.materials || []).length ? '<li>' + esc(product.materials.join(', ')) + '</li>' : '') + '</ul>',
      '<p lang="am">' + esc(product.name.am) + '</p>'
    );
  }
  if (info.type === 'shop') {
    return wrap(
      'The gallery — every piece in Debre Markos',
      '<p>Leather and linen sofas, oak and walnut tables, beds, wardrobes, sideboards and hand-woven chairs. Everything is in a showroom in Debre Markos.</p>' +
        '<ul>' + products.slice(0, 14).map((p) => '<li><a href="/product/' + esc(p.slug) + '">' + esc(p.name.en) + '</a></li>').join('') + '</ul>'
    );
  }
  if (info.path === '/services') {
    return wrap('Furniture made to your wall', '<p>Wardrobes, tables, sideboards and whole-room pieces are measured and built in our Debre Markos workshop. Bring a photo, a drawing or the measurements of the room.</p>');
  }
  if (info.path === '/showroom') {
    return wrap('Three showrooms in Debre Markos', '<p>Ambasel Building first floor · In front of Shebel Hotel, beside Marzeneb Hotel · Kebele 02 at Debre Markos University. Monday to Saturday, 9:00–17:00.</p>');
  }
  if (info.path === '/contact') {
    return wrap('Talk to the shop', '<p>One number for all three showrooms: ' + PHONE_TEXT + '. Open Monday to Saturday, 9:00–17:00. Closed Sunday.</p>');
  }
  if (info.path === '/inspiration') {
    return wrap(
      'Room notes — four ways to start a room',
      '<p>Living room, bedroom, dining room and office arrangements built from the collection in Debre Markos, with the walkway, chair and scale measurements that make them work.</p>' +
        '<p><a href="/shop">See every piece</a> · <a href="/materials">Materials and finishes</a></p>'
    );
  }
  if (info.path === '/materials') {
    return wrap(
      'Materials and finishes',
      '<p>Full-grain leather, linen, hand-woven cotton, velvet, bouclé, oak, walnut, metal, glass and honed stone. Every finish can be seen in daylight in one of the three showrooms.</p>' +
        '<p><a href="/care">How to care for each material</a> · <a href="/shop">Browse the collection</a></p>'
    );
  }
  if (info.path === '/care') {
    return wrap(
      'Care and craft',
      '<p>Weekly habits for leather, wood and woven covers, what to do in the first month, and the frame, joinery and upholstery details worth asking about before you choose. Call ' + PHONE_TEXT + ' with a care question.</p>'
    );
  }
  if (info.path === '/privacy') {
    return wrap('Privacy and your data', '<p>This site stores an account name, email, password hash and your saved and compared pieces. No analytics, advertising or tracking scripts. Call ' + PHONE_TEXT + ' to have your account deleted.</p>');
  }
  return wrap(
    'Fine Furniture — Debre Markos',
    '<p>A curated furniture gallery in three showrooms in Debre Markos: Italian leather sofas, oak and walnut tables, beds, wardrobes and hand-woven chairs.</p>' +
      '<ul>' + products.slice(0, 6).map((p) => '<li><a href="/product/' + esc(p.slug) + '">' + esc(p.name.en) + '</a></li>').join('') + '</ul>'
  );
}

/* ----------------------------------------------------------- document shell */

async function storefront(request, env, info) {
  const origin = new URL(request.url).origin;
  const shell = await serveAsset(request, env, '/index.html');
  if (shell.status !== 200) return serverError(env, request);
  let html = await shell.text();

  let product = null;
  let products = [];
  if (info.type === 'product') {
    product = await productMeta(env, info.slug);
    if (!product) info = { type: 'notfound', path: info.path, slug: info.slug, params: info.params };
  }
  if (!product && (info.type === 'shop' || info.type === 'home')) {
    try {
      await db.ensureSchema(env.DB);
      const data = await db.searchPublicProducts(env.DB, { per: 14 });
      products = data.products || [];
    } catch (error) {
      console.error('catalogue metadata unavailable', error && error.message);
    }
  }

  const base = PAGES[info.path] || PAGES['/'];
  const privateMeta = PRIVATE_META[info.path];
  let title = privateMeta ? privateMeta.title : base.title;
  let description = privateMeta ? privateMeta.description : base.description;
  let image = base.image;
  let indexable = !PRIVATE_PAGES.has(info.path);

  if (info.type === 'home') {
    title = PAGES['/'].title;
    description = PAGES['/'].description;
  } else if (info.type === 'shop') {
    const category = info.category;
    const cat = category && CATEGORY_NAMES[category];
    title = cat
      ? cat.en + ' in Debre Markos | Fine Furniture'
      : PAGES['/shop'].title;
    description = cat
      ? 'Browse ' + cat.en.toLowerCase() + ' at Fine Furniture in Debre Markos. Every piece is in a showroom — call 0920 282861 to check which one has it on the floor.'
      : PAGES['/shop'].description;
    if (info.params.get('page') || info.params.get('q')) indexable = false;
  } else if (info.type === 'product' && product) {
    title = product.name.en + ' — Fine Furniture, Debre Markos';
    description = truncate(
      (product.tagline.en ? product.tagline.en + '. ' : '') +
        (product.desc.en || '') +
        ' See it in Debre Markos. Call 0920 282861.',
      158
    );
    image = product.imageUrl || image;
  } else if (info.type === 'notfound') {
    title = 'Page not found — Fine Furniture';
    description = 'This page does not exist. Browse the gallery or call the shop on 0920 282861.';
    indexable = false;
  }

  const canonical = origin + (info.type === 'product' && product ? '/product/' + product.slug : info.path);
  const absoluteImage = image.startsWith('http') ? image : origin + image;

  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>');
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    '<meta name="description" content="' + esc(description) + '" />'
  );
  html = html.replace(/<meta\s+(?:property|name)="(?:og:[^"]+|twitter:[^"]+|robots)"[^>]*\/>\s*/g, '');
  html = html.replace(/<link\s+rel="canonical"[^>]*\/>\s*/g, '');

  const jsonLd = [localBusiness(origin), website(origin)];
  const crumbs = [{ name: 'Home', path: '/' }];
  if (info.type === 'product' && product) {
    jsonLd.push(productSchema(origin, product));
    crumbs.push({ name: (CATEGORY_NAMES[product.category] || { en: 'Gallery' }).en, path: '/shop?cat=' + product.category });
    crumbs.push({ name: product.name.en, path: '/product/' + product.slug });
  } else if (info.type === 'shop') {
    crumbs.push({ name: 'The gallery', path: '/shop' });
  } else if (info.path !== '/') {
    crumbs.push({ name: (PAGES[info.path] || { title: 'Page' }).title.split('—')[0].trim(), path: info.path });
  }
  jsonLd.push(breadcrumb(origin, crumbs));

  const ldHtml = jsonLdScripts(jsonLd);
  const ldHashes = await Promise.all(jsonLd.map((block) => hashInline(JSON.stringify(block))));

  const head =
    '<link rel="canonical" href="' + esc(canonical) + '" />' +
    '<meta name="robots" content="' + (indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow') + '" />' +
    '<meta property="og:type" content="' + (info.type === 'product' ? 'product' : 'website') + '" />' +
    '<meta property="og:site_name" content="Fine Furniture Debre Markos" />' +
    '<meta property="og:title" content="' + esc(title) + '" />' +
    '<meta property="og:description" content="' + esc(description) + '" />' +
    '<meta property="og:url" content="' + esc(canonical) + '" />' +
    '<meta property="og:image" content="' + esc(absoluteImage) + '" />' +
    '<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />' +
    '<meta property="og:locale" content="en_ET" /><meta property="og:locale:alternate" content="am_ET" />' +
    '<meta name="twitter:card" content="summary_large_image" />' +
    '<meta name="twitter:title" content="' + esc(title) + '" />' +
    '<meta name="twitter:description" content="' + esc(description) + '" />' +
    '<meta name="twitter:image" content="' + esc(absoluteImage) + '" />' +
    ldHtml;

  html = html.replace('</head>', head + '</head>');
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    '<noscript>' + noscriptContent(origin, info, product, products) + '</noscript>'
  );

  const csp =
    "default-src 'self'; script-src 'self' " + ldHashes.map((hash) => "'" + hash + "'").join(' ') + '; ' +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; " +
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; " +
    'object-src none; upgrade-insecure-requests';

  return new Response(html, {
    status: info.type === 'notfound' ? 404 : 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache',
      'content-security-policy': csp,
      'x-robots-tag': indexable ? 'all' : 'noindex',
    },
  });
}

/* --------------------------------------------------------------- site files */

async function sitemap(env, origin) {
  let slugs = [];
  try {
    await db.ensureSchema(env.DB);
    const { results } = await env.DB.prepare(
      "SELECT slug, updated_at FROM products WHERE status='published' ORDER BY featured DESC"
    ).all();
    slugs = results || [];
  } catch (error) {
    console.error('sitemap: database unavailable', error && error.message);
  }
  const today = new Date().toISOString().slice(0, 10);
  const pages = ['', '/shop', '/inspiration', '/materials', '/care', '/services', '/showroom', '/contact', '/privacy'];
  const categories = Object.keys(CATEGORY_NAMES).map((id) => '/shop?cat=' + encodeURIComponent(id));
  const urls = [
    ...pages.concat(categories).map(
      (route) =>
        `  <url><loc>${origin}${route}</loc><lastmod>${today}</lastmod>` +
        `<changefreq>${route === '' || route === '/shop' ? 'weekly' : 'monthly'}</changefreq>` +
        `<priority>${route === '' ? '1.0' : route === '/shop' ? '0.9' : route.startsWith('/shop?') ? '0.8' : '0.7'}</priority></url>`
    ),
    ...slugs.map((product) => {
      const lastmod = /^\d{4}-\d{2}-\d{2}/.test(String(product.updated_at || ''))
        ? String(product.updated_at).slice(0, 10)
        : today;
      return `  <url><loc>${origin}/product/${encodeURIComponent(product.slug)}</loc><lastmod>${lastmod}</lastmod><priority>0.8</priority></url>`;
    }),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
  );
}

function robots(origin) {
  return new Response(
    'User-agent: *\n' +
      'Allow: /\n' +
      'Disallow: /api/\n' +
      'Disallow: /account\n' +
      'Disallow: /compare\n' +
      'Disallow: /login\n' +
      'Disallow: /register\n' +
      'Disallow: /forgot\n' +
      'Disallow: /reset\n' +
      'Disallow: /search\n\n' +
      'Sitemap: ' + origin + '/sitemap.xml\n',
    { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
  );
}

/* ------------------------------------------------------------------ routing */

function routeFor(pathname, params) {
  if (pathname === '/') return { type: 'home', path: '/', slug: '', params };
  if (pathname === '/shop') return { type: 'shop', path: '/shop', slug: '', params, category: params.get('cat') };
  if (pathname === '/search') return { type: 'page', path: '/search', slug: '', params };
  if (PAGES[pathname]) return { type: 'page', path: pathname, slug: '', params };
  if (PRIVATE_PAGES.has(pathname)) return { type: 'page', path: pathname, slug: '', params };
  const product = /^\/product\/([A-Za-z0-9-]{1,80})$/.exec(pathname);
  if (product) return { type: 'product', path: pathname, slug: product[1], params };
  return { type: 'notfound', path: pathname, slug: '', params };
}

async function handle(request, env) {
  const url = new URL(request.url);
  let path = url.pathname;

  if (path.length > 1 && path.endsWith('/')) {
    return new Response(null, { status: 301, headers: { location: path.replace(/\/+$/, '') + url.search } });
  }
  if (path === '/index.html') {
    return new Response(null, { status: 301, headers: { location: '/' + url.search } });
  }

  if (path === '/robots.txt') return robots(url.origin);
  if (path === '/sitemap.xml') return sitemap(env, url.origin);

  if (path.startsWith('/api/')) {
    try {
      if (!migrated) {
        await db.ensureSchema(env.DB);
        migrated = true;
      }
      const session = await readSession(request, env.DB).catch((error) => {
        console.error('session lookup failed', error && error.message);
        return null;
      });
      const user = await readUserSession(request, env.DB).catch((error) => {
        console.error('customer session lookup failed', error && error.message);
        return null;
      });
      const response = await handleApi(request, env, { session, user });
      return response || json({ error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: error.message, fields: error.fields || undefined }, error.status);
      }
      console.error('api error', path, error && error.message);
      return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
    }
  }

  if (path.startsWith('/media/')) {
    const key = decodeURIComponent(path.slice('/media/'.length));
    if (!env.FILES || !/^products\/[a-z0-9-]{8,80}\.(jpg|jpeg|png|webp|avif)$/i.test(key)) {
      return new Response('Not found', { status: 404 });
    }
    const object = await env.FILES.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    return new Response(object.body, {
      headers: {
        'content-type': (object.httpMetadata && object.httpMetadata.contentType) || 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  }

  // Real files (styles, scripts, photos, fonts, manifest) are served as-is.
  if (path.startsWith('/assets/') || /[^/]+\.[a-z0-9]+$/i.test(path)) {
    return assetResponse(await env.ASSETS.fetch(request), path);
  }

  // Everything else is the storefront document, with route-specific SEO.
  const info = routeFor(path, url.searchParams);
  return storefront(request, env, info);
}

export default {
  async fetch(request, env) {
    const isApi = new URL(request.url).pathname.startsWith('/api/');
    try {
      const response = await handle(request, env);
      return isApi ? response : harden(response, request);
    } catch (error) {
      console.error('unhandled request error', new URL(request.url).pathname, error && error.message);
      if (isApi) return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
      return harden(await serverError(env, request), request);
    }
  },
};
