/* FineFurniture — shared UI kit: state, chrome and components. */
(function () {
  'use strict';

  const FF = window.FF;
  const t = (k) => FF.t(k);
  const L = (obj) => (obj ? obj[FF.getLang()] || obj.en : '');

  /* The only contact details the shop gave us: one phone number, three
   * showrooms and three social accounts. Nothing else is invented here. */
  /* A Google Maps search for one specific place. The shop has not published
   * coordinates, so each link searches its own name and landmark instead of
   * dropping the customer in the middle of Debre Markos. */
  const mapUrl = (query) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  const directionsUrl = (place) =>
    'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(place) + '&travelmode=driving';

  const SHOP = 'Fine Furniture';
  const TOWN = 'Debre Markos, Ethiopia';

  const P = {
    phone: '0920 282861',
    phoneHref: '+251920282861',
    landline: '0920 282861',
    landlineHref: '+251920282861',
    mobile: '0920 282861',
    telegram: 'https://t.me/finefurnitures',
    facebook: 'https://www.facebook.com/finefurnituredebremarkos',
    tiktok: 'https://www.tiktok.com/@finefurnituer',
    /* Shop-wide link: the business itself, not the town. */
    maps: mapUrl('Ambasel Building Debre Markos Ethiopia'),
    /* The three showrooms, in the order the shop lists them. Each one searches
     * Google Maps for its own building or landmark in Debre Markos — never for
     * the town as a whole — and carries a separate directions route. */
    branches: [
      {
        en: 'Ambasel Building, 1st floor',
        am: 'የአምባሳል ህንፃ፣ 1ኛ ፎቅ',
        landmark: 'Ambasel Building, Debre Markos',
        maps: mapUrl('Ambasel Building Debre Markos Ethiopia'),
        directions: directionsUrl('Ambasel Building Debre Markos Ethiopia'),
        note: 'First floor, above the shops on the main road',
        noteAm: 'የመጀመሪያ ፎቅ፣ በዋናው መንገድ ላይ ካሉት ሱቆች በላይ',
      },
      {
        en: 'In front of Shebel Hotel, beside Marzeneb Hotel',
        am: 'ከሸበል ሆቴል ፊት ለፊት፣ ከማርዘነብ ሆቴል ጎን',
        landmark: 'Shebel Hotel, Debre Markos',
        maps: mapUrl('Shebel Hotel Debre Markos Ethiopia'),
        directions: directionsUrl('Shebel Hotel Debre Markos Ethiopia'),
        note: 'Opposite Shebel Hotel, beside Marzeneb Hotel',
        noteAm: 'ከሸበል ሆቴል ትይዩ፣ ከማርዘነብ ሆቴል ጎን',
      },
      {
        en: 'Kebele 02, Debre Markos University building',
        am: 'ቀበሌ 02፣ የደብረ ማርቆስ ዩኒቨርሲቲ ህንፃ',
        landmark: 'Debre Markos University, Kebele 02',
        maps: mapUrl('Debre Markos University building Kebele 02 Ethiopia'),
        directions: directionsUrl('Debre Markos University building Kebele 02 Ethiopia'),
        note: 'Ground floor of the university building in Kebele 02',
        noteAm: 'በቀበሌ 02 በሚገኘው የዩኒቨርሲቲው ህንፃ የመጀመሪያ ፎቅ',
      },
    ],
  };

  const LOGO = '/assets/img/logo.svg';
  const brandMark = () => '<img class="brand-logo" src="' + LOGO + '" alt="" width="38" height="38" decoding="async" />';


  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
    shield: '<path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    tools: '<path d="M14 5a4 4 0 0 1 5 5l-9 9-3-3z"/><path d="M6 6l3 3"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
    pin: '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    phone: '<path d="M6 3h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 1 9-4 14-11 14"/><path d="M5 19c3-4 6-6 10-7"/>',
    ruler: '<path d="M4 15 15 4l5 5L9 20z"/><path d="m8 11 2 2M11 8l2 2"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    star: '<path d="m12 4 2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4L9.4 9z"/>',
    telegram: '<path d="M21 4 3 11l5 2 2 6 3-5 5 4z"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.4"/><circle cx="17" cy="7" r="1"/>',
    facebook: '<path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v8h3v-8h2l1-3h-3V8Z"/>',
    sofa: '<path d="M4 12V9.5A2.5 2.5 0 0 1 6.5 7h11A2.5 2.5 0 0 1 20 9.5V12"/><path d="M2.5 13.5a2.5 2.5 0 0 1 5 0V16h9v-2.5a2.5 2.5 0 0 1 5 0V19H2.5z"/><path d="M6 19v2M18 19v2"/>',
    bed: '<path d="M3 19v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/><path d="M3 15h18M8 9V6.5h5V9"/><path d="M3 19v2M21 19v2"/>',
    dining: '<path d="M3 9h18"/><path d="M5.5 9v10M18.5 9v10"/><path d="M7 9V6.5h10V9"/>',
    desk: '<path d="M3 9h18M4.5 9v10M19.5 9v10"/><path d="M7 9V7h6v2"/><rect x="5" y="12.5" width="5" height="4.5" rx="1"/>',
    tiktok:
      '<path d="M15 3v9.2a3.3 3.3 0 1 1-2.6-3.2"/><path d="M15 3c.4 2.3 1.9 3.9 4.2 4.2"/>',
    heart: '<path d="M12 20s-7-4.4-7-9.4A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 7 3.6C19 15.6 12 20 12 20Z"/>',
    share: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8"/>',
    compare: '<path d="M5 19V9M12 19V5M19 19v-6"/><path d="M3 19h18"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5.5 9.5V21h13V9.5"/><path d="M10 21v-6h4v6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    whatsapp: '<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 12h9M16 8l3 4-3 4"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  };

  function icon(name, cls) {
    const d = ICONS[name] || '';
    const c = cls ? ' ' + cls : '';
    const filled = name === 'telegram' || name === 'star';
    const attrs = filled
      ? ' fill="currentColor" stroke="none"'
      : ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
    return '<svg class="ico' + c + '" viewBox="0 0 24 24" aria-hidden="true"' + attrs + '>' + d + '</svg>';
  }

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------------------------------------------------------- state */
  const state = {
    pdp: null,
    lastPath: null,
    session: null,
    wishlist: [],
    compare: [],
    recent: [],
  };
  const ui = { drawer: false, search: false, share: null, tray: false };







  /* --------------------------------------------------------- saved + share */

  const isSaved = (slug) => state.wishlist.indexOf(slug) > -1;
  const inCompare = (slug) => state.compare.indexOf(slug) > -1;
  const productUrl = (slug) => location.origin + '/product/' + slug;

  function heartButton(p, big) {
    const on = isSaved(p.slug);
    return (
      '<button class="save-btn' + (on ? ' is-on' : '') + (big ? ' is-big' : '') + '" type="button" data-act="wish" data-slug="' +
      p.slug + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' +
      esc(on ? t('wish.saved') : t('wish.save')) + ' ' + esc(L(p.name)) + '" title="' +
      esc(on ? t('wish.saved') : t('wish.save')) + '">' + icon('heart') + '</button>'
    );
  }

  function compareButton(p, compact) {
    const on = inCompare(p.slug);
    return (
      '<button class="cmp-btn' + (on ? ' is-on' : '') + (compact ? ' is-compact' : '') +
      '" type="button" data-act="compare-toggle" data-slug="' + p.slug + '" aria-pressed="' +
      (on ? 'true' : 'false') + '">' + icon('compare') +
      (compact ? '' : '<span>' + esc(on ? t('compare.added') : t('compare.add')) + '</span>') + '</button>'
    );
  }

  function shareButton(p, label) {
    return (
      '<button class="share-btn" type="button" data-act="share" data-slug="' + p.slug + '">' +
      icon('share') + '<span>' + esc(label || t('product.share')) + '</span></button>'
    );
  }

  function shareSheetHTML() {
    return (
      '<div class="share-sheet" id="share-sheet" role="dialog" aria-modal="true" aria-hidden="true">' +
      '<div class="share-scrim" data-act="share-close"></div><div class="share-card">' +
      '<div class="share-head"><h3>' + esc(t('share.title')) + '</h3>' +
      '<button class="icon-btn" type="button" data-act="share-close" aria-label="' + esc(t('nav.close')) + '">' +
      icon('close') + '</button></div><div id="share-body"></div></div></div>'
    );
  }

  /** Fills the share sheet for one piece. Shipping the link only — nothing else
   * about the visitor ever leaves the browser. */
  function openShare(p) {
    const url = productUrl(p.slug);
    const title = L(p.name) + ' · ' + t('brand.name');
    const body = document.getElementById('share-body');
    if (!body) return;
    body.innerHTML =
      '<p class="share-product"><span class="share-thumb">' + media(p) + '</span><span><strong>' +
      esc(L(p.name)) + '</strong><em>' + esc(FF.categoryName(p.category, FF.getLang())) + '</em></span></p>' +
      '<div class="share-grid">' +
      '<a class="share-item" href="https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title) +
      '" target="_blank" rel="noopener noreferrer">' + icon('telegram') + esc(t('share.telegram')) + '</a>' +
      '<a class="share-item" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) +
      '" target="_blank" rel="noopener noreferrer">' + icon('facebook') + esc(t('share.facebook')) + '</a>' +
      '<button class="share-item" type="button" data-act="share-copy" data-url="' + esc(url) + '">' +
      icon('copy') + esc(t('share.copy')) + '</button>' +
      (navigator.share
        ? '<button class="share-item" type="button" data-act="share-native" data-slug="' + p.slug + '">' +
          icon('sparkle') + esc(t('share.native')) + '</button>'
        : '') +
      '</div><p class="share-hint">' + esc(t('share.hint')) + '</p>';
    ui.share = p.slug;
    const sheet = document.getElementById('share-sheet');
    if (sheet) {
      sheet.classList.add('is-open');
      sheet.setAttribute('aria-hidden', 'false');
    }
  }

  function closeShare() {
    ui.share = null;
    const sheet = document.getElementById('share-sheet');
    if (sheet) {
      sheet.classList.remove('is-open');
      sheet.setAttribute('aria-hidden', 'true');
    }
  }

  /* ---------------------------------------------------------- compare tray */

  function compareTrayHTML() {
    return '<div class="cmp-tray" id="cmp-tray" hidden><div class="wrap cmp-tray-inner">' +
      '<div class="cmp-tray-list" id="cmp-tray-list"></div>' +
      '<div class="cmp-tray-actions">' +
      '<a class="btn btn-primary btn-sm" href="/compare" id="cmp-open">' + esc(t('compare.open')) + '</a>' +
      '<button class="cmp-tray-clear" type="button" data-act="compare-clear">' + esc(t('compare.clear')) + '</button>' +
      '</div></div></div>';
  }

  function syncCompare() {
    const tray = document.getElementById('cmp-tray');
    if (!tray) return;
    const list = state.compare
      .map((slug) => FF.productBySlug(slug))
      .filter(Boolean);
    tray.hidden = list.length === 0;
    document.body.classList.toggle('has-compare', list.length > 0);
    const box = document.getElementById('cmp-tray-list');
    if (box) {
      box.innerHTML = list
        .map(
          (p) =>
            '<span class="cmp-chip">' + media(p) + '<em>' + esc(L(p.name)) + '</em>' +
            '<button type="button" data-act="compare-toggle" data-slug="' + p.slug +
            '" aria-label="' + esc(t('compare.remove')) + '">×</button></span>'
        )
        .join('');
    }
    const open = document.getElementById('cmp-open');
    if (open) open.href = '/compare?slugs=' + state.compare.join(',');
  }

  function syncSaved() {
    const n = state.wishlist.length;
    const badge = document.getElementById('saved-count');
    if (badge) {
      badge.textContent = String(n);
      badge.hidden = n === 0;
    }
    Array.prototype.forEach.call(document.querySelectorAll('.save-btn[data-slug]'), (btn) => {
      const on = isSaved(btn.dataset.slug);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.cmp-btn[data-slug]'), (btn) => {
      const on = inCompare(btn.dataset.slug);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const text = btn.querySelector('span');
      if (text) text.textContent = on ? t('compare.added') : t('compare.add');
    });
  }

  /* --------------------------------------------------------------- chrome */
  function navLinks(path) {
    const items = [
      { href: '/', label: 'nav.home', match: '/' },
      { href: '/shop', label: 'nav.shop', match: '/shop', mega: true },
      { href: '/services', label: 'nav.services', match: '/services' },
      { href: '/showroom', label: 'nav.showroom', match: '/showroom' },
      { href: '/contact', label: 'nav.contact', match: '/contact' },
    ];
    const signed = !!(state.session && state.session.signedIn);
    const link = (i) =>
      '<li class="nav-item"><a class="nav-link' + (path === i.match ? ' is-active' : '') + '" href="' + i.href + '">' +
      esc(t(i.label)) + (i.mega ? '<span class="chev"></span>' : '') + '</a>' +
      (i.mega ? megaMenu() : '') + '</li>';
    return (
      items.map(link).join('') +
      (signed
        ? '<li class="nav-item nav-dash"><a class="nav-link' + (path === '/account' ? ' is-active' : '') +
          '" href="/account">' + esc(t('nav.dashboard')) + '</a></li>'
        : '')
    );
  }

  function megaMenu() {
    const first = FF.PRODUCTS.find((p) => p.imageUrl);
    if (!first) return '';
    const catName = (id) => L((FF.CATEGORIES.find((c) => c.id === id) || { name: { en: id } }).name);
    const col = (title, links) =>
      '<div><h5>' + esc(title) + '</h5><ul>' +
      links.map((l) => '<li><a href="' + l.href + '">' + esc(l.label) + '</a></li>').join('') +
      '</ul></div>';
    return (
      '<div class="mega">' +
      col(t('nav.living'), [
        { href: '/shop?cat=sofas', label: catName('sofas') },
        { href: '/shop?cat=chairs', label: catName('chairs') },
        { href: '/shop?cat=tables', label: catName('tables') },
        { href: '/shop?room=living', label: t('rooms.living') },
      ]) +
      col(t('nav.bedroom'), [
        { href: '/shop?cat=bedroom', label: catName('bedroom') },
        { href: '/shop?cat=storage', label: catName('storage') },
        { href: '/shop?cat=dining', label: catName('dining') },
        { href: '/shop?room=bedroom', label: t('rooms.bedroom') },
      ]) +
      col(t('footer.explore'), [
        { href: '/shop', label: t('nav.all') },
        { href: '/inspiration', label: t('nav.inspiration') },
        { href: '/materials', label: t('nav.materials') },
        { href: '/care', label: t('nav.care') },
      ]) +
      '<a class="mega-card" href="/product/' + first.slug + '">' + media(first) +
      '<span>' + esc(L(first.name)) + '</span></a></div>'
    );
  }

  /** The header changes shape with the session: guests get Sign in / Create
   *  account, signed-in shoppers get the saved count and their own avatar menu.
   *  The heart and the avatar never appear before sign-in. */
  function headerHTML(path) {
    const signed = !!(state.session && state.session.signedIn);
    const user = (state.session || {});
    const initial = String(user.name || user.username || 'F').trim().charAt(0).toUpperCase();
    const saved = (state.wishlist || []).length;
    const account = signed
      ? '<a class="icon-btn saved-btn" href="/account?tab=saved" aria-label="' + esc(t('nav.saved')) +
        '" title="' + esc(t('nav.saved')) + '">' + icon('heart') +
        '<span class="cart-count" id="saved-count"' + (saved ? '' : ' hidden') + '>' + saved + '</span></a>' +
        '<a class="header-dash" href="/account">' + icon('home') + '<span>' + esc(t('nav.dashboard')) + '</span></a>' +
        '<div class="acct-wrap">' +
        '<button class="acct-btn" type="button" data-act="account-open" aria-expanded="false" aria-controls="acct-menu" aria-label="' +
        esc(t('nav.account')) + '">' + esc(initial) + '</button>' +
        '<div class="acct-menu" id="acct-menu" hidden>' +
        '<div class="acct-menu-head"><strong>' + esc(user.name || user.username) + '</strong><em>' +
        esc(user.email || user.username || '') + '</em></div>' +
        '<a href="/account">' + icon('user') + esc(t('nav.dashboard')) + '</a>' +
        '<a href="/account?tab=saved">' + icon('heart') + esc(t('account.tabSaved')) +
        '<span class="acct-count">' + saved + '</span></a>' +
        '<a href="/account?tab=compare">' + icon('compare') + esc(t('nav.compare')) + '</a>' +
        '<a href="/account?tab=recent">' + icon('clock') + esc(t('account.tabRecent')) + '</a>' +
        '<a href="/">' + icon('home') + esc(t('nav.home')) + '</a>' +
        '<button type="button" data-act="signout">' + icon('logout') + esc(t('auth.signOut')) + '</button>' +
        '</div></div>'
      : '<a class="header-signin" href="/login">' + esc(t('nav.signin')) + '</a>' +
        '<a class="btn btn-primary btn-sm header-register" href="/register">' + esc(t('nav.register')) + '</a>';

    return (
      '<div class="announce"><div class="wrap"><span>' + esc(t('announce.text')) + '</span>' +
      '<a href="/showroom">' + esc(t('announce.link')) + ' ' + icon('arrow') + '</a></div></div>' +
      '<header class="header" id="header"><div class="wrap header-bar">' +
      '<a class="brand" href="/">' + brandMark() + '<span>' + esc(t('brand.name')) + '</span><span class="dot"></span></a>' +
      '<nav aria-label="Primary"><ul class="nav">' + navLinks(path) + '</ul></nav>' +
      '<div class="header-actions">' +
      '<a class="header-call" href="tel:' + P.phoneHref + '">' + icon('phone') + '<span>' + P.phone + '</span></a>' +
      '<button class="icon-btn" type="button" data-act="search-open" aria-label="' + esc(t('nav.search')) + '">' + icon('search') + '</button>' +
      '<button class="lang-btn" type="button" data-act="lang" aria-label="' + esc(t('lang.label')) + '">' + esc(t('lang.switch')) + '</button>' +
      account +
      '<button class="icon-btn hamburger" type="button" data-act="menu-open" aria-label="' + esc(t('nav.menu')) + '" aria-expanded="false" aria-controls="drawer">' + icon('menu') + '</button>' +
      '</div></div></header>'
    );
  }

  function drawerHTML() {
    const signed = !!(state.session && state.session.signedIn);
    const links = [
      ['/', 'nav.home'],
      ['/shop', 'nav.shop'],
      ['/inspiration', 'nav.inspiration'],
      ['/materials', 'nav.materials'],
      ['/care', 'nav.care'],
      ['/services', 'nav.services'],
      ['/showroom', 'nav.showroom'],
      ['/contact', 'nav.contact'],
    ];
    if (signed) links.push(['/account', 'nav.account'], ['/compare', 'nav.compare']);
    const auth = signed
      ? '<div class="drawer-auth"><a class="btn btn-ghost btn-block" href="/account">' + icon('user') +
        esc(t('nav.account')) + '</a>' +
        '<button class="drawer-signout" type="button" data-act="signout">' + icon('logout') +
        esc(t('auth.signOut')) + '</button></div>'
      : '<div class="drawer-auth"><a class="btn btn-primary btn-block" href="/register">' +
        esc(t('nav.register')) + icon('arrow') + '</a>' +
        '<a class="btn btn-ghost btn-block" href="/login">' + esc(t('nav.signin')) + '</a>' +
        '<p class="drawer-note">' + esc(t('hero.guestNote')) + '</p></div>';
    return (
      '<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="' + esc(t('nav.menu')) + '" hidden><div class="drawer-scrim" data-act="menu-close"></div>' +
      '<div class="drawer-panel"><div class="drawer-head"><span class="brand">' +
      brandMark() +
      '<span>' +
      esc(t('brand.name')) +
      '</span></span><button class="icon-btn" type="button" data-act="menu-close" aria-label="' +
      esc(t('nav.close')) +
      '">' +
      icon('close') +
      '</button></div><nav class="drawer-nav" aria-label="Mobile">' +
      links.map((l) => '<a href="' + l[0] + '">' + esc(t(l[1])) + '</a>').join('') +
      '</nav>' + auth + '<div class="drawer-foot"><span>' +
      esc(t('home.help.branches')) +
      '</span><a href="tel:' +
      P.phoneHref +
      '">' +
      P.phone +
      '</a><a href="' +
      P.telegram +
      '" target="_blank" rel="noopener">Telegram</a><a href="' +
      P.facebook +
      '" target="_blank" rel="noopener">Facebook</a></div></div></div>'
    );
  }

  function searchHTML() {
    return (
      '<div class="search-panel" id="search-panel"><div class="wrap">' +
      '<form class="search-form" data-form="search" role="search">' +
      '<input type="search" name="q" placeholder="' +
      esc(t('shop.searchPlaceholder')) +
      '" aria-label="' +
      esc(t('shop.searchLabel')) +
      '" autocomplete="off" />' +
      '<button class="icon-btn" type="submit" aria-label="' +
      esc(t('nav.search')) +
      '">' +
      icon('arrow') +
      '</button>' +
      '<button class="icon-btn" type="button" data-act="search-close" aria-label="' +
      esc(t('nav.close')) +
      '">' +
      icon('close') +
      '</button></form>' +
      '<div class="search-live" id="search-live" aria-live="polite"></div>' +
      '<div class="search-suggest"><span>' +
      esc(t('shop.popular')) +
      '</span>' +
      FF.CATEGORIES.slice(0, 4)
        .map((c) => '<a class="pill" href="/shop?cat=' + c.id + '">' + esc(L(c.name)) + '</a>')
        .join('') +
      '</div></div></div>'
    );
  }

  const overlaysHTML = () => searchHTML() + drawerHTML() + shareSheetHTML() + compareTrayHTML();

  function footerHTML() {
    const col = (title, links) =>
      '<div><h4>' +
      esc(title) +
      '</h4><ul>' +
      links.map((l) => '<li><a href="' + l.href + '">' + esc(l.label) + '</a></li>').join('') +
      '</ul></div>';
    return (
      '<footer class="footer"><div class="wrap"><div class="footer-top">' +
      '<div class="footer-brand"><span class="brand">' +
      brandMark() +
      '<span>' +
      esc(t('brand.name')) +
      '</span></span><p>' +
      esc(t('brand.tagline')) +
      ' ' +
      esc(t('footer.made')) +
      '.</p></div>' +
      col(
        t('footer.shop'),
        FF.CATEGORIES.map((c) => ({ href: '/shop?cat=' + c.id, label: L(c.name) }))
      ) +
      col(t('footer.help'), [
        { href: '/services', label: t('footer.buy') },
        { href: '/inspiration', label: t('nav.inspiration') },
        { href: '/materials', label: t('nav.materials') },
        { href: '/care', label: t('nav.care') },
      ]) +
      col(t('footer.company'), [
        { href: '/showroom', label: t('nav.showroom') },
        { href: '/contact', label: t('nav.contact') },
        { href: '/shop', label: t('nav.all') },
        { href: '/services', label: t('nav.services') },
        { href: '/privacy', label: t('footer.privacy') },
      ]) +
      col(
        t('footer.contact'),
        P.branches.map((b) => ({ href: '/showroom', label: L(b) }))
      ) +
      '<div><h4>' +
      esc(t('footer.callus')) +
      '</h4><ul><li><a href="tel:' +
      P.phoneHref +
      '">' +
      P.phone +
      '</a></li><li>' +
      esc(t('visit.hours')) +
      '</li></ul><div class="socials"><a href="' +
      P.telegram +
      '" target="_blank" rel="noopener" aria-label="Telegram">' +
      icon('telegram') +
      '</a><a href="' +
      P.facebook +
      '" target="_blank" rel="noopener" aria-label="Facebook">' +
      icon('facebook') +
      '</a><a href="' +
      P.tiktok +
      '" target="_blank" rel="noopener" aria-label="TikTok">' +
      icon('tiktok') +
      '</a></div></div></div>' +
      '<div class="footer-bottom"><span>© ' +
      new Date().getFullYear() +
      ' ' +
      esc(t('brand.name')) +
      ' · ' +
      esc(t('footer.rights')) +
      '</span><span>' +
      esc(t('footer.note')) +
      '</span></div></div></footer>'
    );
  }

  /* ----------------------------------------------------------- components */
  function badges(p) {
    const out = [];
    if (p.isNew) out.push('<span class="badge badge-new">' + esc(t('badge.new')) + '</span>');
    if (p.badge === 'bestseller') out.push('<span class="badge badge-best">' + esc(t('badge.bestseller')) + '</span>');
    if (!p.stock) out.push('<span class="badge badge-made">' + esc(t('badge.made')) + '</span>');
    return out.join('');
  }

  function stars(rating) {
    const full = Math.max(0, Math.min(5, Math.round(rating)));
    return '<span class="stars" aria-label="' + rating + ' / 5">' + '★'.repeat(full) + '☆'.repeat(5 - full) + '</span>';
  }

  function swatchRow(p) {
    return (
      '<span class="swatches">' +
      p.colors
        .slice(0, 4)
        .map((c) => '<span class="swatch-dot" style="background:' + c.hex + '" title="' + esc(L(c.name)) + '"></span>')
        .join('') +
      '</span>'
    );
  }

  /** Every card is a real photograph the owner uploaded. No drawings. */
  function media(p, opts) {
    const o = opts || {};
    if (!p || !p.imageUrl) return '<span class="photo-missing">' + esc(t('product.noPhoto')) + '</span>';
    const meta = (FF.IMAGE_META && FF.IMAGE_META[p.slug]) || null;
    const local = /^\/assets\/img\/gallery\/(.+)-960\.webp$/.exec(p.imageUrl);
    const alt =
      L(p.name) +
      ' — ' +
      (FF.getLang() === 'am'
        ? 'በፋይን ፈርኒቸር ሾውሩም፣ ደብረ ማርቆስ'
        : 'in the Fine Furniture showroom, Debre Markos');
    const sizes = o.sizes || '(max-width: 620px) 92vw, (max-width: 1080px) 46vw, 30vw';
    const dims = meta ? ' width="' + meta.w + '" height="' + meta.h + '"' : '';
    const common =
      ' alt="' + esc(alt) + '" loading="' + (o.eager ? 'eager' : 'lazy') +
      '" fetchpriority="' + (o.eager ? 'high' : 'auto') + '" decoding="async"';
    if (local) {
      const base = '/assets/img/gallery/' + local[1];
      return (
        '<picture><source type="image/webp" srcset="' +
        base + '-480.webp 480w, ' + base + '-960.webp 960w" sizes="' + sizes + '" />' +
        '<img class="product-photo" src="' + base + '-960.webp"' + dims + common + ' />' +
        '</picture>'
      );
    }
    return '<img class="product-photo" src="' + esc(p.imageUrl) + '"' + dims + common + ' />';
  }

  /** Links to the shop's own TikTok / Facebook / Telegram post for a piece. */
  function socialChips(p) {
    const links = (p && p.social) || {};
    const items = [
      ['tiktok', 'TikTok'],
      ['facebook', 'Facebook'],
      ['telegram', 'Telegram'],
    ].filter(([key]) => /^https:\/\//.test(links[key] || ''));
    if (!items.length) return '';
    return (
      '<div class="social-chips">' +
      items
        .map(
          ([key, label]) =>
            '<a class="social-chip" href="' + esc(links[key]) + '" target="_blank" rel="noopener noreferrer" title="' +
            esc(label) + '">' + icon(key) + '<span>' + esc(label) + '</span></a>'
        )
        .join('') +
      '</div>'
    );
  }

  function productCard(p) {
    const mats = (p.materials || [])
      .slice(0, 2)
      .map((m) => FF.materialName(m, FF.getLang()))
      .join(' · ');
    return (
      '<article class="card gc tilt"><div class="media-wrap">' +
      '<a class="card-media" href="/product/' + p.slug + '" aria-label="' + esc(L(p.name)) + '">' + media(p) + '</a>' +
      '<div class="card-tools">' + heartButton(p) + compareButton(p, true) + '</div>' +
      '</div>' +
      '<div class="card-body"><span class="card-cat">' + esc(FF.categoryName(p.category, FF.getLang())) + '</span>' +
      '<a href="/product/' + p.slug + '"><h3 class="card-name">' + esc(L(p.name)) + '</h3></a>' +
      '<p class="card-tagline">' + esc(L(p.tagline)) + '</p>' +
      '<div class="card-foot"><span class="card-mats">' + esc(mats) + '</span></div>' +
      '</div></article>'
    );
  }

  function sectionHead(eyebrow, title, sub, action) {
    return (
      '<div class="section-head"><div><p class="eyebrow">' +
      esc(eyebrow) +
      '</p><h2>' +
      esc(title) +
      '</h2>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') +
      '</div>' +
      (action || '') +
      '</div>'
    );
  }

  function accItem(title, body, open) {
    return (
      '<div class="acc-item' +
      (open ? ' is-open' : '') +
      '"><button class="acc-btn" type="button" data-act="acc" aria-expanded="' +
      (open ? 'true' : 'false') +
      '"><span>' +
      esc(title) +
      '</span><span class="sign"></span></button><div class="acc-body">' +
      body +
      '</div></div>'
    );
  }

  function visitSection() {
    const rows = P.branches.map((b, i) => [
      'pin',
      t('visit.branch') + ' ' + (i + 1),
      L(b) + ' — ' + t('brand.place'),
    ]);
    rows.push(['phone', t('contact.phoneLabel'), P.phone]);
    return (
      '<section class="visit section"><div class="wrap visit-grid"><div>' +
      '<p class="eyebrow">' +
      esc(t('visit.eyebrow')) +
      '</p><h2>' +
      esc(t('visit.title')) +
      '</h2><p class="lede">' +
      esc(t('visit.lede')) +
      '</p><ul class="visit-list">' +
      rows
        .map(
          (r) =>
            '<li>' +
            icon(r[0]) +
            '<div><b>' +
            esc(r[1]) +
            '</b><span>' +
            esc(r[2]) +
            '</span></div></li>'
        )
        .join('') +
      '</ul><div class="hero-actions"><a class="btn btn-primary" href="tel:' +
      P.phoneHref +
      '">' +
      esc(t('visit.call')) +
      '</a><a class="btn btn-ghost" href="/showroom">' +
      esc(t('visit.cta')) +
      '</a></div></div>' +
      '<div class="visit-socials">' +
      '<a class="social-card" href="' +
      P.telegram +
      '" target="_blank" rel="noopener">' +
      icon('telegram') +
      '<div><b>Telegram</b><span>' + esc(t('contact.telegramHandle')) + '</span></div></a>' +
      '<a class="social-card" href="' +
      P.facebook +
      '" target="_blank" rel="noopener">' +
      icon('facebook') +
      '<div><b>Facebook</b><span>' + esc(t('brand.name')) + '</span></div></a>' +
      '<a class="social-card" href="' +
      P.tiktok +
      '" target="_blank" rel="noopener">' +
      icon('tiktok') +
      '<div><b>TikTok</b><span>' + esc(t('contact.tiktokHandle')) + '</span></div></a>' +
      '<div class="social-card is-static">' +
      icon('phone') +
      '<div><b>' + esc(t('contact.phoneLabel')) + '</b><a href="tel:' + P.phoneHref + '">' + P.phone + '</a></div></div>' +
      '</div></div></section>'
    );
  }




  function syncOverlays() {
    const drawer = document.getElementById('drawer');
    const search = document.getElementById('search-panel');
    if (drawer) {
      drawer.hidden = !ui.drawer;
      drawer.classList.toggle('is-open', ui.drawer);
    }
    if (search) search.classList.toggle('is-open', ui.search);
    document.body.classList.toggle('no-scroll', ui.drawer);
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  /* -------------------------------------------------------------- messages */


  /* Calling the shop is the only contact route; there is no WhatsApp or email. */
  const callLink = () => 'tel:' + P.phoneHref;

  /* ------------------------------------------------------------------ boot */

  FF.U = {
    t: t,
    L: L,
    esc: esc,
    icon: icon,
    media: media,
    P: P,
    mapUrl: mapUrl,
    directionsUrl: directionsUrl,
    heartButton: heartButton,
    compareButton: compareButton,
    shareButton: shareButton,
    openShare: openShare,
    closeShare: closeShare,
    syncCompare: syncCompare,
    syncSaved: syncSaved,
    isSaved: isSaved,
    inCompare: inCompare,
    productUrl: productUrl,
    state: state,
    ui: ui,
    headerHTML: headerHTML,
    footerHTML: footerHTML,
    overlaysHTML: overlaysHTML,
    productCard: productCard,
    socialChips: socialChips,
    sectionHead: sectionHead,
    stars: stars,
    badges: badges,
    accItem: accItem,
    visitSection: visitSection,
    syncOverlays: syncOverlays,
    toast: toast,
    callLink: callLink,
  };
})();
