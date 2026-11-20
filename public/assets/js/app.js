/* FineFurniture — history router, interactions and boot.
 *
 * Every page has a real address (/shop, /product/…, /account). Links are
 * intercepted and rendered in place, so navigation is instant but the URL is
 * still deep-linkable and works on a hard refresh.
 */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const V = FF.views;
  const t = U.t;
  const state = U.state;
  const ui = U.ui;

  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- routing */

  function currentRoute() {
    let path = location.pathname.replace(/\/+$/, '');
    if (!path || path === '/index.html') path = '/';
    return { path: path, params: new URLSearchParams(location.search), href: path + location.search };
  }

  function navigate(url, options) {
    const opts = options || {};
    const target = String(url || '/');
    if (/^https?:/i.test(target)) {
      location.href = target;
      return;
    }
    const next = new URL(target, location.origin);
    if (next.origin !== location.origin) {
      location.href = next.href;
      return;
    }
    // /media is a file: leave the app shell for those.
    if (/^\/media(\/|$)/.test(next.pathname) || /\.(xml|txt|pdf|json)$/i.test(next.pathname)) {
      location.href = next.href;
      return;
    }
    if (next.pathname === location.pathname && next.search === location.search) {
      render({ keepScroll: !!opts.keepScroll });
      return;
    }
    history[opts.replace ? 'replaceState' : 'pushState']({}, '', next.pathname + next.search);
    render({ keepScroll: !!opts.keepScroll });
  }
  FF.navigate = navigate;

  // Old hash links (#/shop) still exist in bookmarks and social posts.
  if (location.hash.indexOf('#/') === 0) {
    const legacy = location.hash.slice(1);
    history.replaceState({}, '', legacy || '/');
  }

  // Older "What we do" links pointed at the home page section; give them the page.
  if (/^#(services|what-we-do)$/i.test(location.hash)) {
    history.replaceState({}, '', '/services');
  }

  /** Where a signed-in account belongs: the owner in the panel, a shopper in
   *  the dashboard, unless the link that sent them here says otherwise. */
  /** Signed-in shoppers land on the dashboard unless the link said otherwise. */
  function destinationFor(session, next) {
    const authPages = ['/login', '/register', '/forgot', '/reset'];
    if (!next || authPages.indexOf(next.split('?')[0]) > -1) return '/account';
    return next;
  }

  FF.destinationFor = destinationFor;

  async function viewFor(route) {
    const seg = route.path.split('/').filter(Boolean);
    if (!seg.length) return V.home();
    switch (seg[0]) {
      case 'shop':
        return V.shop(route.params, await FF.loadShop(route.params));
      case 'search': {
        const q = (route.params.get('q') || '').trim();
        const data = q ? await FF.loadShop(route.params) : null;
        return V.searchPage({ q: q, data: data, params: route.params });
      }
      case 'product': {
        const loaded = await FF.loadProduct(seg[1]);
        return loaded ? V.product(seg[1], loaded) : V.notFound();
      }
      case 'inspiration':
        return V.inspiration(await FF.loadAllProducts());
      case 'materials':
        return V.materials(await FF.loadAllProducts());
      case 'care':
        return V.care();
      case 'services':
        return V.services();
      case 'showroom':
        return V.showroom();
      case 'contact':
        return V.contact();
      case 'privacy':
        return V.privacy();
      case 'forgot':
        return V.forgot({ notice: route.params.get('sent') ? 'sent' : '' });
      case 'reset':
        return V.reset({ token: route.params.get('token') || '' });
      case 'login':
      case 'register': {
        if (!state.session) await loadSession();
        const store = seg[0] === 'register';
        // Old links carry the mode in the query string; give them the clean path.
        if (!store && route.params.get('mode') === 'register') {
          const carry = route.params.get('next');
          setTimeout(() => navigate('/register' + (carry ? '?next=' + encodeURIComponent(carry) : ''), { replace: true }), 10);
        }
        if (state.session && state.session.signedIn) {
          const dest = destinationFor(state.session, route.params.get('next') || '');
          setTimeout(() => navigate(dest, { replace: true }), 10);
        }
        return V.auth({
          session: state.session,
          mode: store ? 'register' : 'signin',
          next: route.params.get('next') || '',
          notice: route.params.get('auth') || '',
        });
      }
      case 'account': {
        if (!state.session) await loadSession();
        if (!state.session || !state.session.signedIn) {
          navigate('/login?next=' + encodeURIComponent('/account'), { replace: true });
          return '<div class="wrap section"><p class="muted">' + U.esc(t('auth.signingIn')) + '</p></div>';
        }
        const data = await loadAccount();
        if (data) {
          state.wishlist = (data.wishlist || []).map((p) => p.slug);
          state.compare = (data.compare || []).map((p) => p.slug);
          state.recent = (data.recent || []).map((p) => p.slug);
          U.syncSaved();
          U.syncCompare();
        }
        const tab = route.params.get('tab') || 'overview';
        return V.account(Object.assign({ user: state.session }, data || {}, { tab: tab }));
      }
      case 'compare': {
        if (!state.session) await loadSession();
        if (!state.session || !state.session.signedIn) {
          navigate('/login?next=' + encodeURIComponent('/compare'), { replace: true });
          return '<div class="wrap section"><p class="muted">' + U.esc(t('auth.signingIn')) + '</p></div>';
        }
        const products = await FF.loadCompare(state.compare.slice(0, 3));
        return V.compare(products);
      }
      default:
        return V.notFound();
    }
  }

  /* ------------------------------------------------------------- session */

  async function loadSession() {
    try {
      const res = await fetch('/api/auth/me', { headers: { accept: 'application/json' } });
      const data = await res.json();
      state.session = data;
      state.wishlist = Array.isArray(data.wishlist) ? data.wishlist : state.wishlist;
      state.recent = Array.isArray(data.recent) ? data.recent : state.recent;
      state.compare = Array.isArray(data.compare) ? data.compare : state.compare;
    } catch (error) {
      state.session = { signedIn: false };
    }
    return state.session;
  }

  let accountPromise = null;
  function loadAccount() {
    if (!accountPromise) {
      accountPromise = fetch('/api/account', { headers: { accept: 'application/json' } })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
        .finally(() => {
          setTimeout(() => {
            accountPromise = null;
          }, 5000);
        });
    }
    return accountPromise;
  }

  /* --------------------------------------------------------- reveal + 3D */

  let revealObserver = null;

  function setupReveal() {
    if (!('IntersectionObserver' in window) || reduceMotion()) return;
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -4% 0px', threshold: 0.04 }
    );
    const targets = document.querySelectorAll(
      '.section, .pdp, .look, .hero-copy, .hero-visual, .branch-card, .account-section, .compare-table, .auth-card'
    );
    Array.prototype.forEach.call(targets, (el, i) => {
      if (el.classList.contains('hero-copy') || el.classList.contains('hero-visual')) return;
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', Math.min(i % 6, 5) * 55 + 'ms');
      revealObserver.observe(el);
    });
  }

  function setupTilt() {
    if (reduceMotion()) return;
    Array.prototype.forEach.call(document.querySelectorAll('.tilt'), (el) => {
      if (el.dataset.tiltReady) return;
      el.dataset.tiltReady = '1';
      el.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty('--tilt-y', (px * 7).toFixed(2) + 'deg');
        el.style.setProperty('--tilt-x', (-py * 7).toFixed(2) + 'deg');
        el.style.setProperty('--glow-x', ((px + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--glow-y', ((py + 0.5) * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  function setupHeroParallax() {
    if (reduceMotion()) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const y = Math.min(window.scrollY, 900);
      document.documentElement.style.setProperty('--scroll-y', y + 'px');
      document.documentElement.style.setProperty('--scroll-p', (y / 900).toFixed(3));
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!frame) frame = requestAnimationFrame(apply);
      },
      { passive: true }
    );
    apply();
  }

  /* ------------------------------------------------------------- rendering */

  let renderToken = 0;

  function skeletonFor(path) {
    if (path === '/shop' || path === '/search') return V.skeleton('shop');
    if (path.indexOf('/product/') === 0) return V.skeleton('product');
    if (path === '/account') return V.skeleton('account');
    if (path === '/compare') return V.skeleton('compare');
    return '';
  }

  function commit(html, route, options) {
    const app = document.getElementById('app');
    app.innerHTML = html;
    app.classList.remove('is-entering');
    document.getElementById('site-header').innerHTML = U.headerHTML(route.path);
    document.getElementById('site-footer').innerHTML = U.footerHTML();
    document.getElementById('overlays').innerHTML = U.overlaysHTML();

    ui.search = false;
    ui.drawer = false;
    U.syncOverlays();
    U.syncSaved();
    U.syncCompare();
    setupReveal();
    setupTilt();

    if (!options.keepScroll) window.scrollTo(0, 0);
    else if (window.scrollY < 10) window.scrollTo(0, 0);

    void app.offsetWidth;
    app.classList.add('is-entering');
    bindHeader();
  }

  function bindHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 6);
    onScroll();
    window.onscroll = onScroll;
  }

  /** Swap the header once the session is known, so a signed-in shopper never
   *  sees Sign in / Create account (or a guest the saved heart). */
  function refreshHeader() {
    const slot = document.getElementById('site-header');
    if (!slot) return;
    slot.innerHTML = U.headerHTML(currentRoute().path);
    bindHeader();
    U.syncSaved();
    U.syncCompare();
  }

  function closeAccountMenu() {
    const menu = document.getElementById('acct-menu');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    const btn = document.querySelector('[data-act="account-open"]');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.blur(); }
  }

  async function render(opts) {
    const options = opts || {};
    const route = currentRoute();
    const token = ++renderToken;
    if (state.pdp && route.path !== '/product/' + state.pdp.slug) state.pdp = null;

    // App-like loading state: the new screen appears immediately with a
    // skeleton, then the data fills in.
    const shell = skeletonFor(route.path);
    if (shell) {
      const app = document.getElementById('app');
      app.innerHTML = shell;
      document.getElementById('site-header').innerHTML = U.headerHTML(route.path);
      document.getElementById('site-footer').innerHTML = U.footerHTML();
    }

    let content;
    try {
      content = await viewFor(route);
    } catch (error) {
      console.error('FineFurniture: view failed —', error && error.message);
      content =
        '<div class="wrap section"><div class="empty"><h3>' + U.esc(t('shop.loadFailed')) +
        '</h3><button class="btn btn-primary" type="button" data-act="reload-view">' +
        U.esc(t('shop.retry')) + '</button></div></div>';
    }
    if (token !== renderToken) return;
    if (!content) return;

    const paint = () => commit(content, route, options);
    if (document.startViewTransition && !reduceMotion() && !shell) {
      document.startViewTransition(paint);
    } else {
      paint();
    }

    if (route.path.indexOf('/product/') === 0 && state.session && state.session.signedIn) {
      trackView(route.path.split('/')[2]);
    }
  }

  function trackView(slug) {
    if (!slug) return;
    fetch('/api/recent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: slug }),
    }).catch(() => {});
  }

  function go(path) {
    navigate(path);
  }

  /* --------------------------------------------------------------- filters */

  function updateParam(key, value, on, base) {
    const params = new URLSearchParams(currentRoute().params.toString());
    if (on && value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    const qs = params.toString();
    navigate((base || '/shop') + (qs ? '?' + qs : ''));
  }

  function readFilters() {
    const params = new URLSearchParams(currentRoute().params.toString());
    const pick = (name) =>
      Array.prototype.map.call(document.querySelectorAll('input[data-filter="' + name + '"]:checked'), (i) => i.value);
    const cats = pick('cat');
    const availEl = document.querySelector('input[data-filter="avail"]:checked');

    if (cats.length) params.set('cat', cats.join(','));
    else params.delete('cat');
    params.delete('price');
    if (availEl) params.set('avail', availEl.value);
    else params.delete('avail');

    params.delete('page');
    const qs = params.toString();
    navigate('/shop' + (qs ? '?' + qs : ''));
  }

  const currentProduct = () => FF.productBySlug(currentRoute().path.split('/')[2]);

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
      return;
    }
    fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch (err) {
      U.toast(text.slice(0, 100));
    }
    document.body.removeChild(ta);
  }

  /* ---------------------------------------------------------------- search */

  let searchTimer = 0;
  let searchSeq = 0;
  const RECENT_SEARCH_KEY = 'ff_searches_v1';

  function recentSearches() {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]');
      return Array.isArray(list) ? list.filter((x) => typeof x === 'string').slice(0, 6) : [];
    } catch (e) {
      return [];
    }
  }

  function rememberSearch(term) {
    const q = String(term || '').trim();
    if (q.length < 2) return;
    try {
      const list = [q].concat(recentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())).slice(0, 6);
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage unavailable */
    }
  }

  /** What a real shop shows before you type: what you searched last, and what
   *  other people open most. */
  function renderSearchSuggestions() {
    const box = document.getElementById('search-live');
    if (!box) return;
    const recents = recentSearches();
    box.innerHTML =
      (recents.length
        ? '<div class="search-block"><div class="search-block-head"><span>' + U.esc(t('search.recent')) +
          '</span><button type="button" class="search-clear" data-act="search-clear-recent">' +
          U.esc(t('search.clearRecent')) + '</button></div><div class="search-chips">' +
          recents
            .map(
              (q) =>
                '<a class="search-chip" href="/search?q=' + encodeURIComponent(q) + '">' +
                U.icon('clock') + U.esc(q) + '</a>'
            )
            .join('') +
          '</div></div>'
        : '') +
      '<div class="search-block"><div class="search-block-head"><span>' + U.esc(t('search.popularSearches')) +
      '</span></div><div class="search-chips">' +
      ['sofa', 'bed', 'wardrobe', 'dining table', 'office desk', 'centre table']
        .map((q) => '<a class="search-chip" href="/search?q=' + encodeURIComponent(q) + '">' + U.esc(q) + '</a>')
        .join('') +
      '</div></div>';
  }

  function renderSearchResults(data) {
    const box = document.getElementById('search-live');
    if (!box) return;
    if (!data || !data.results || !data.results.length) {
      box.innerHTML = '<p class="search-none">' + U.esc(t('search.none')) + '</p>';
      return;
    }
    const lang = FF.getLang();
    box.innerHTML =
      '<span class="search-live-label">' + U.esc(t('search.live')) + '</span><div class="search-live-list">' +
      data.results
        .map(
          (p) =>
            '<a class="search-hit" href="/product/' + p.slug + '">' +
            (p.imageUrl ? '<img src="' + U.esc(p.imageUrl) + '" alt="" loading="lazy" />' : '<span class="search-hit-photo"></span>') +
            '<span><strong>' + U.esc(p.name[lang] || p.name.en) + '</strong>' +
            '<em>' + U.esc(FF.categoryName(p.category, lang)) + '</em></span></a>'
        )
        .join('') +
      '</div><a class="search-all" href="/search?q=' + encodeURIComponent(data.query || '') + '">' +
      U.esc(t('search.all')) + U.icon('arrow') + '</a>';
  }

  function onSearchInput(value) {
    const term = String(value || '').trim();
    clearTimeout(searchTimer);
    if (!term) {
      renderSearchSuggestions();
      return;
    }
    searchTimer = setTimeout(async () => {
      const seq = ++searchSeq;
      const data = await FF.searchProducts(term);
      if (seq !== searchSeq) return;
      data.query = term;
      renderSearchResults(data);
    }, 170);
  }

  /* ------------------------------------------------------------------ auth */

  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' } });
    } catch (e) {
      /* ignore */
    }
    state.session = { signedIn: false };
    state.wishlist = [];
    state.recent = [];
    state.compare = [];
    U.toast(t('auth.signedOut'));
    navigate('/');
  }

  async function toggleWish(slug) {
    if (!state.session || !state.session.signedIn) {
      U.toast(t('wish.signIn'));
      navigate('/login?next=' + encodeURIComponent(currentRoute().href));
      return;
    }
    const on = state.wishlist.indexOf(slug) === -1;
    state.wishlist = on ? state.wishlist.concat(slug) : state.wishlist.filter((s) => s !== slug);
    U.syncSaved();
    U.toast(on ? t('wish.added') : t('wish.removed'));
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: slug, on: on }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      state.wishlist = data.wishlist || state.wishlist;
      U.syncSaved();
    } catch (error) {
      state.wishlist = on ? state.wishlist.filter((s) => s !== slug) : state.wishlist.concat(slug);
      U.syncSaved();
      U.toast(t('shop.loadFailed'));
    }
  }

  async function toggleCompare(slug) {
    if (!state.session || !state.session.signedIn) {
      U.toast(t('compare.signIn'));
      navigate('/login?next=' + encodeURIComponent(currentRoute().href));
      return;
    }
    const on = state.compare.indexOf(slug) === -1;
    const previous = state.compare.slice();
    state.compare = on ? state.compare.concat(slug) : state.compare.filter((s) => s !== slug);
    U.syncCompare();
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: slug, on: on }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || t('shop.loadFailed'));
      if (data && Array.isArray(data.compare)) state.compare = data.compare;
      U.syncCompare();
      if (data && data.limit) U.toast(t('compare.limit'));
      else U.toast(on ? t('compare.added') : t('compare.removed'));
    } catch (error) {
      state.compare = previous;
      U.syncCompare();
      U.toast(error.message || t('shop.loadFailed'));
    }
  }

  /* ---------------------------------------------------------------- clicks */

  document.addEventListener(
    'click',
    (event) => {
      const anchor = event.target.closest('a[href]');
      if (!anchor) return;
      if (event.defaultPrevented) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto|tel):/i.test(href)) return;
      let url;
      try {
        url = new URL(href, location.href);
      } catch (e) {
        return;
      }
      if (url.origin !== location.origin) return;
      if (/^\/(assets|api|media)\b/.test(url.pathname)) return;
      if (url.pathname === location.pathname && !url.search && anchor.closest('.pagination')) return;
      event.preventDefault();
      if (ui.drawer || ui.search) {
            ui.drawer = false;
        ui.search = false;
        U.syncOverlays();
      }
      navigate(url.pathname + url.search);
    },
    true
  );

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-act]');
    if (!el) {
      if (ui.search && !event.target.closest('#search-panel') && !event.target.closest('[data-act="search-open"]')) {
        ui.search = false;
        U.syncOverlays();
      }
      return;
    }

    const act = el.dataset.act;

    if (act === 'lang') {
      FF.setLang(FF.getLang() === 'en' ? 'am' : 'en');
      render({ keepScroll: true });
      return;
    }
    if (act === 'account-open') {
      const menu = document.getElementById('acct-menu');
      if (!menu) return;
      const open = menu.hidden;
      menu.hidden = !open;
      el.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    if (act === 'search-open') {
      ui.search = true;
      U.syncOverlays();
      const field = document.querySelector('#search-panel input');
      renderSearchSuggestions();
      if (field) setTimeout(() => field.focus(), 90);
      return;
    }
    if (act === 'search-clear-recent') {
      try {
        localStorage.removeItem(RECENT_SEARCH_KEY);
      } catch (e) {
        /* ignore */
      }
      renderSearchSuggestions();
      return;
    }
    if (act === 'pw-toggle') {
      const input = el.parentElement && el.parentElement.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      el.classList.toggle('is-on', show);
      el.setAttribute('aria-label', t(show ? 'auth.hidePassword' : 'auth.showPassword'));
      input.focus();
      return;
    }
    if (act === 'search-close') {
      ui.search = false;
      U.syncOverlays();
      return;
    }
    if (act === 'menu-open') {
      ui.drawer = true;
      U.syncOverlays();
      el.setAttribute('aria-expanded', 'true');
      const first = document.querySelector('#drawer .drawer-head a, #drawer .drawer-head button, #drawer a');
      if (first) setTimeout(() => first.focus(), 60);
      return;
    }
    if (act === 'menu-close') {
      ui.drawer = false;
      U.syncOverlays();
      const opener = document.querySelector('[data-act="menu-open"]');
      if (opener) {
        opener.setAttribute('aria-expanded', 'false');
        opener.focus();
      }
      return;
    }
    if (act === 'share') {
      const p = FF.productBySlug(el.dataset.slug);
      if (p) U.openShare(p);
      return;
    }
    if (act === 'share-close') {
      U.closeShare();
      return;
    }
    if (act === 'share-copy') {
      copyText(el.dataset.url || location.href, () => U.toast(t('share.copied')));
      return;
    }
    if (act === 'share-native') {
      const p = FF.productBySlug(el.dataset.slug);
      if (p && navigator.share) {
        navigator
          .share({ title: U.L(p.name), text: t('share.hint'), url: U.productUrl(p.slug) })
          .catch(() => {});
      }
      return;
    }
    if (act === 'wish') {
      toggleWish(el.dataset.slug);
      return;
    }
    if (act === 'compare-toggle') {
      toggleCompare(el.dataset.slug);
      return;
    }
    if (act === 'compare-clear') {
      state.compare = [];
      U.syncCompare();
      fetch('/api/compare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      }).catch(() => {});
      if (currentRoute().path === '/compare') render({ keepScroll: true });
      return;
    }
    if (act === 'signout') {
      signOut();
      return;
    }
    if (act === 'print-spec') {
      window.print();
      return;
    }
    if (act === 'pdp-color') {
      if (!currentProduct()) return;
      state.pdp.color = Number(el.dataset.index);
      render({ keepScroll: true });
      return;
    }
    if (act === 'pdp-size') {
      if (!currentProduct()) return;
      state.pdp.size = Number(el.dataset.index);
      render({ keepScroll: true });
      return;
    }
    if (act === 'pdp-qty') {
      if (!currentProduct()) return;
      state.pdp.qty = Math.max(1, Math.min(20, state.pdp.qty + Number(el.dataset.delta)));
      const out = document.getElementById('pdp-qty');
      if (out) out.textContent = String(state.pdp.qty);
      return;
    }
    if (act === 'pdp-photo') {
      const main = document.querySelector('.pd-main');
      if (main && el.dataset.src) {
        main.innerHTML = '<img class="product-photo" src="' + U.esc(el.dataset.src) + '" alt="" />';
        Array.prototype.forEach.call(document.querySelectorAll('.pd-thumb'), (b) => b.classList.remove('is-active'));
        el.classList.add('is-active');
      }
      return;
    }
    if (act === 'pdp-order') {
      window.location.href = 'tel:' + U.P.phoneHref;
      return;
    }
    if (act === 'acc') {
      const item = el.closest('.acc-item');
      if (item) {
        const open = item.classList.toggle('is-open');
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      return;
    }
    if (act === 'filters-toggle') {
      const f = document.getElementById('filters');
      if (f) f.classList.toggle('is-open');
      return;
    }
    if (act === 'filter-clear') {
      go('/shop');
      return;
    }
    if (act === 'reload-view') {
      render({ keepScroll: true });
      return;
    }
    if (el.dataset.href) go(el.dataset.href);
  });

  document.addEventListener('input', (event) => {
    if (event.target.closest('#search-panel input[type="search"]')) onSearchInput(event.target.value);
  });

  /* ----------------------------------------------------------------- changes */

  document.addEventListener('change', (event) => {
    const el = event.target.closest('[data-filter]');
    if (!el) return;
    const name = el.dataset.filter;
    if (name === 'sort') return updateParam('sort', el.value, el.value !== 'featured');
    if (name === 'avail') return updateParam('avail', el.value, el.checked);
    readFilters();
  });

  /* ----------------------------------------------------------------- submit */

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-form]');
    if (!form) return;
    event.preventDefault();
    const kind = form.dataset.form;
    const fd = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    const label = button ? button.innerHTML : '';

    const start = (text) => {
      if (button) {
        button.disabled = true;
        button.textContent = text;
      }
    };
    const fail = (message) => {
      const box = form.querySelector('.auth-error') || form.querySelector('.form-error');
      if (box) box.textContent = message;
      else U.toast(message);
      if (button) {
        button.disabled = false;
        button.innerHTML = label;
      }
    };

    if (kind === 'search') {
      const q = String(fd.get('q') || '').trim();
      ui.search = false;
      U.syncOverlays();
      rememberSearch(q);
      go('/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
      return;
    }
    if (kind === 'filter-search') {
      const q = String(fd.get('q') || '').trim();
      updateParam('q', q, !!q);
      return;
    }

    if (kind === 'signin' || kind === 'register') {
      if (kind === 'register' && String(fd.get('password') || '') !== String(fd.get('confirm') || '')) {
        fail(t('auth.mismatch'));
        return;
      }
      start(t(kind === 'signin' ? 'auth.signingIn' : 'auth.creating'));
      try {
        const endpoint = kind === 'signin' ? 'login' : kind;
        const res = await fetch('/api/auth/' + endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: String(fd.get('name') || '').trim(),
            email: String(fd.get('email') || '').trim(),
            username: String(fd.get('username') || '').trim(),
            password: String(fd.get('password') || ''),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || t('shop.loadFailed'));
        // The response already carries the session; trust it instead of making
        // the browser wait for another round trip before the redirect.
        state.session = {
          signedIn: true,
          role: data.role,
          id: data.id,
          username: data.username,
          email: data.email || '',
          name: data.name,
          wishlist: data.wishlist || [],
          recent: data.recent || [],
          googleSignIn: !!(state.session && state.session.googleSignIn),
          emailReset: !!(state.session && state.session.emailReset),
        };
        state.wishlist = data.wishlist || [];
        state.compare = data.compare || [];
        U.syncSaved();
        U.syncCompare();
        const next = form.dataset.next || currentRoute().params.get('next') || '';
        U.toast(t('auth.welcome'));
        navigate(destinationFor({ role: data.role }, next));
      } catch (error) {
        fail(error.message);
      }
      return;
    }

    if (kind === 'forgot') {
      const email = String(fd.get('email') || '').trim();
      start(t('auth.sending'));
      try {
        const res = await fetch('/api/auth/forgot', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || t('shop.loadFailed'));
        const box = form.querySelector('.auth-error');
        if (box) {
          box.textContent = (data && data.message) || t('auth.resetSent');
          box.classList.add('is-ok');
        }
        form.reset();
      } catch (error) {
        fail(error.message);
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML = label;
        }
      }
      return;
    }

    if (kind === 'reset') {
      if (String(fd.get('password') || '') !== String(fd.get('confirm') || '')) {
        fail(t('auth.mismatch'));
        return;
      }
      start(t('auth.creating'));
      try {
        const res = await fetch('/api/auth/reset', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: form.dataset.token || '', password: String(fd.get('password') || '') }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || t('shop.loadFailed'));
        state.session = {
          signedIn: true,
          role: data.role,
          id: data.id,
          username: data.username,
          email: data.email || '',
          name: data.name,
          wishlist: data.wishlist || [],
          recent: data.recent || [],
        };
        state.wishlist = data.wishlist || [];
        U.syncSaved();
        U.toast(t('auth.resetDone'));
        navigate(destinationFor(state.session, ''));
      } catch (error) {
        fail(error.message);
      }
      return;
    }

  });

  document.addEventListener('keydown', (event) => {
    const el = event.target && event.target.closest ? event.target : null;
    const typing = el && el.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !ui.search) {
      event.preventDefault();
      ui.search = true;
      U.syncOverlays();
      renderSearchSuggestions();
      const field = document.querySelector('#search-panel input');
      if (field) setTimeout(() => field.focus(), 60);
      return;
    }
    if (event.key !== 'Escape') return;
    const menu = document.getElementById('acct-menu');
    if (!ui.search && !ui.drawer && !ui.share && (!menu || menu.hidden)) return;
    ui.search = false;
    ui.drawer = false;
    U.syncOverlays();
    U.closeShare();
    closeAccountMenu();
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.acct-wrap')) closeAccountMenu();
  });

  /* -------------------------------------------------------------- prefetch */

  document.addEventListener(
    'pointerover',
    (event) => {
      const anchor = event.target.closest('a[href^="/"]');
      if (!anchor) return;
      const url = new URL(anchor.getAttribute('href'), location.origin);
      if (url.pathname.indexOf('/product/') === 0) FF.prefetchProduct(url.pathname.split('/')[2]);
      else if (url.pathname === '/shop') FF.prefetchShop(url.searchParams);
    },
    { passive: true }
  );

  /* Keep keyboard focus inside the mobile drawer while it is open. */
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || !ui.drawer) return;
    const panel = document.querySelector('#drawer .drawer-panel');
    if (!panel) return;
    const focusable = panel.querySelectorAll('a[href], button:not([disabled]), input, select, textarea');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* A photo that fails to load must not leave a broken icon or blank card. */
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!img || img.tagName !== 'IMG' || img.dataset.failed) return;
      img.dataset.failed = '1';
      img.classList.add('is-broken');
    },
    true
  );

  window.addEventListener('popstate', () => render());

  /* -------------------------------------------------------------------- boot */

  FF.setLang(FF.getLang());
  setupHeroParallax();

  const cached = FF.cachedCatalogue && FF.cachedCatalogue();
  if (cached) FF.applyCatalogue(cached.products);

  loadSession().then(() => {
    refreshHeader();
    // The hero greets a signed-in shopper by name, so repaint the home once.
    if (state.session && state.session.signedIn && currentRoute().path === '/') render({ keepScroll: true });
  });

  render();

  (async function loadLiveCatalogue() {
    try {
      const response = await fetch('/api/catalogue?per=24&page=1&sort=featured', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('catalogue request failed: ' + response.status);
      const data = await response.json();
      if (!data || !Array.isArray(data.products)) throw new Error('bad catalogue');
      FF.cacheCatalogue(data);
      if (FF.applyCatalogue(data.products)) render({ keepScroll: true });
      U.syncCompare();
      // The home page shows more photos than one shop page holds; pull the rest
      // in the background so no section has to reuse another section's piece.
      FF.loadAllProducts()
        .then(() => render({ keepScroll: true }))
        .catch(() => {});
    } catch (err) {
      console.error('FineFurniture: the furniture list could not be loaded —', err && err.message);
      FF.catalogueError = true;
      if (!FF.PRODUCTS.length) render({ keepScroll: true });
      U.toast(t('shop.loadFailed'));
    }
  })();

  FF.render = render;
})();
