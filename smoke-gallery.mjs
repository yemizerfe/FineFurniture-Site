import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const names = ['i18n','images','products','ui','views-home','views-shop','views-pages','views-auth','views-account','views-compare','app'];
const scripts = names.map((n) => fs.readFileSync('public/assets/js/' + n + '.js', 'utf8'));
const cats = ['sofas','chairs','tables','dining','bedroom','storage'];
const products = Array.from({ length: 14 }, (_, i) => ({
  slug: i === 0 ? 'vittoria-leather-sofa' : 'piece-' + (i + 1),
  name: { en: i === 0 ? 'Vittoria Cognac Leather Sofa' : 'Piece ' + (i + 1), am: 'ዕቃ ' + (i + 1) },
  tagline: { en: 'A piece worth sitting on', am: 'መቀመጥ የሚገባው ዕቃ' },
  desc: { en: 'Made carefully in the workshop.', am: 'በጥንቃቄ የተሠራ።' },
  care: { en: 'Dust weekly.', am: 'በሳምንት አንድ ጊዜ ያጽዱ።' },
  category: cats[i % cats.length],
  imageUrl: i === 0 ? '/assets/img/gallery/vittoria-leather-sofa-1440.webp' : '/assets/img/gallery/gojjam-linen-sofa-1440.webp',
  gallery: [], materials: ['oak','leather'],
  colors: [{ id: 'c1', name: { en: 'Cognac', am: 'ኮኛክ' }, hex: '#8b5a2b' }],
  sizes: [{ id: 's1', label: { en: 'As shown', am: 'እንደሚታየው' } }],
  dims: { w: 186, d: 94, h: 78 }, stock: true, code: 'FF-01', origin: 'Imported', weight: 40, features: ['Solid oak'],
}));
function makeDom(signedIn) {
  const vc = new VirtualConsole(); const errors = [];
  vc.on('jsdomError', (e) => errors.push('jsdom: ' + e.message));
  vc.on('error', (...a) => errors.push('console: ' + a.join(' ')));
  const dom = new JSDOM('<!doctype html><html lang="en"><body><a class="skip" href="#app">Skip</a><div id="site-header"></div><main id="app"></main><div id="site-footer"></div><div id="overlays"></div><div id="toast"></div></body></html>', { url: 'https://shop.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.scrollTo = () => {};
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  const me = signedIn ? { signedIn: true, name: 'Hana Tesfaye', email: 'hana@example.com', wishlist: ['piece-2'], recent: [], compare: ['piece-2','piece-3'] } : { signedIn: false };
  w.fetch = async (url) => {
    const u = String(url);
    const ok = (b) => ({ ok: true, status: 200, json: async () => b });
    if (u.startsWith('/api/auth/me')) return ok(me);
    if (u.startsWith('/api/account')) return ok({ user: me, wishlist: products.slice(0, 2), recent: [], compare: products.slice(0, 2) });
    if (u.startsWith('/api/catalogue')) { const p = new URL('https://x' + u).searchParams; const per = Number(p.get('per')) || 12; const cat = p.get('cat'); const all = cat ? products.filter((x) => x.category === cat) : products; return ok({ products: all.slice(0, per), total: all.length, page: 1, pages: 1 }); }
    if (u.startsWith('/api/compare')) return ok({ products: products.slice(0, 2) });
    if (u.startsWith('/api/products/')) return ok({ product: products[0] });
    return ok({ ok: true });
  };
  w.onerror = (m) => errors.push('window: ' + m);
  for (const code of scripts) w.eval(code);
  return { w, errors };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = []; const check = (n, c, x = '') => checks.push([n, !!c, x]);
const guest = makeDom(false); await sleep(450);
const d = guest.w.document;
check('home hero', d.querySelector('h1.gh-title'));
check('home pictures with srcset', d.querySelectorAll('#app picture source[srcset]').length >= 1);
const img = d.querySelector('#app .gh-hero img');
check('hero has width/height', !!img && img.getAttribute('width') === '1400' && !!img.getAttribute('height'), img ? img.getAttribute('width') : '');
check('hero descriptive alt', !!img && /FineFurniture showroom, Debre Markos/.test(img.getAttribute('alt')));
check('hero eager + high priority', !!img && img.getAttribute('loading') === 'eager' && img.getAttribute('fetchpriority') === 'high');
check('no price text', !/ETB|ብር/.test(d.body.textContent));
guest.w.FF.navigate('/shop'); await sleep(500);
check('shop 12 cards', d.querySelectorAll('.gx-grid .card').length === 12);
guest.w.FF.navigate('/product/vittoria-leather-sofa'); await sleep(450);
check('pdp renders', d.querySelector('.pd-info h1') && /Vittoria/.test(d.querySelector('.pd-info h1').textContent));
check('pdp no add to cart', !d.querySelector('[data-act="add"],[data-act="pdp-add"]'));
guest.w.FF.navigate('/privacy'); await sleep(400);
check('privacy page', /Privacy and your data/.test(d.querySelector('#app').textContent) && /No analytics/.test(d.querySelector('#app').textContent));
guest.w.FF.navigate('/login'); await sleep(350);
check('login labelled', !!d.querySelector('form[data-form="signin"] label input[name="email"]'));
const user = makeDom(true); await sleep(500);
const ud = user.w.document;
check('dashboard nav', !!ud.querySelector('a.header-dash[href="/account"]'));
user.w.FF.navigate('/account'); await sleep(500);
check('dashboard home icon', !!ud.querySelector('.db-home[href="/"]'));
const errs = [...guest.errors, ...user.errors];
console.log('--- results ---');
let bad = 0; for (const [n, c, x] of checks) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); }
if (errs.length) { console.log('--- errors ---'); errs.slice(0, 8).forEach((e) => console.log(e)); }
console.log(bad ? bad + ' failing' : 'all checks passed');
process.exit(bad || errs.length ? 1 : 0);
