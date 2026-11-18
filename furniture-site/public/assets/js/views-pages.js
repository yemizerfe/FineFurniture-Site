/* FineFurniture — services, showrooms, contact and the order request flow. */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const t = U.t;
  const L = U.L;
  const esc = U.esc;
  const icon = U.icon;
  const money = U.money;
  const head = U.sectionHead;
  const P = U.P;

  const tx = (en, am) => (FF.getLang() === 'am' ? am : en);

  function photoFor(category, index) {
    const list = (FF.PRODUCTS || []).filter((p) => p.imageUrl && (!category || p.category === category));
    const pool = list.length ? list : (FF.PRODUCTS || []).filter((p) => p.imageUrl);
    return pool.length ? pool[index % pool.length] : null;
  }

  function photo(category, index, sizes) {
    const p = photoFor(category, index);
    return p ? U.media(p, { sizes: sizes || '(max-width: 900px) 100vw, 50vw' }) : '';
  }

  function notFound() {
    return (
      '<div class="wrap section notfound"><h1>' + esc(t('notfound.title')) + '</h1>' +
      '<p class="lede">' + esc(t('notfound.lede')) + '</p>' +
      '<a class="btn btn-primary" href="/shop">' + esc(t('notfound.cta')) + '</a></div>'
    );
  }

  function pageHead(crumbs, title, lede) {
    return (
      '<div class="wrap page-head"><nav class="crumbs">' +
      crumbs.map((c, i) => (c.href ? '<a href="' + c.href + '">' + esc(c.label) + '</a>' : esc(c.label)) + (i < crumbs.length - 1 ? '<span>/</span>' : '')).join('') +
      '</nav><h1>' + esc(title) + '</h1><p class="lede">' + esc(lede) + '</p></div>'
    );
  }

  /* What we do — an editorial ledger: one numbered row per service, a dark
   * process band, then the questions. Everything a shopper needs is on this
   * page; nothing here sends them back to the furniture grid. */
  function services() {
    const rows = [
      { key: 'living', href: '/shop?cat=sofas' },
      { key: 'bedroom', href: '/shop?cat=beds' },
      { key: 'dining', href: '/shop?cat=dining' },
      { key: 'office', href: '/shop?cat=office' },
      { key: 'custom', href: 'tel:' + P.phoneHref },
    ];
    return (
      '<section class="sv-head"><div class="wrap">' +
      '<p class="sv-kicker">' + esc(t('nav.services')) + '</p>' +
      '<h1 class="sv-title">' + esc(t('services.title')) + '</h1>' +
      '<p class="sv-lede">' + esc(t('services.lede')) + '</p>' +
      '<div class="sv-actions">' +
      '<a class="btn btn-primary" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a>' +
      '<a class="btn btn-ghost" href="/showroom">' + esc(t('nav.showroom')) + icon('arrow') + '</a>' +
      '</div></div></section>' +
      '<section class="wrap sv-rows">' +
      rows
        .map(
          (r, i) =>
            '<article class="sv-row"><span class="sv-row-num">0' + (i + 1) + '</span>' +
            '<div class="sv-row-main"><h2>' + esc(t('services.' + r.key + '.t')) + '</h2>' +
            '<p>' + esc(t('services.' + r.key + '.d')) + '</p></div>' +
            '<ul class="sv-row-list">' +
            ['b1', 'b2', 'b3'].map((b) => '<li>' + esc(t('svc.' + r.key + '.' + b)) + '</li>').join('') +
            '</ul>' +
            '<a class="sv-row-go" href="' + r.href + '"><span>' +
            esc(t(r.key === 'custom' ? 'visit.call' : 'services.browse')) + '</span>' + icon('arrow') + '</a></article>'
        )
        .join('') +
      '</section>' +
      '<section class="sv-process"><div class="wrap">' +
      '<p class="sv-kicker">' + esc(t('custom.eyebrow')) + '</p>' +
      '<h2 class="sv-h2">' + esc(t('services.process')) + '</h2>' +
      '<p class="sv-sub">' + esc(t('services.processSub')) + '</p>' +
      '<ol class="sv-steps">' +
      [1, 2, 3]
        .map(
          (n) =>
            '<li><span>0' + n + '</span><h3>' + esc(t('custom.step' + n + '.t')) + '</h3>' +
            '<p>' + esc(t('custom.step' + n + '.d')) + '</p></li>'
        )
        .join('') +
      '</ol></div></section>' +
      '<section class="wrap sv-faq">' +
      '<div class="sv-faq-head"><p class="sv-kicker">' + esc(t('services.faqEyebrow')) + '</p>' +
      '<h2 class="sv-h2">' + esc(t('services.faq')) + '</h2></div>' +
      '<div class="acc">' +
      [1, 2, 3, 4]
        .map((n) => U.accItem(t('services.faq' + n + '.q'), '<p>' + esc(t('services.faq' + n + '.a')) + '</p>', n === 1))
        .join('') +
      '</div></section>' +
      '<section class="wrap sv-close"><div class="sv-close-in"><div>' +
      '<h2 class="sv-h2">' + esc(t('home.help.title')) + '</h2><p>' + esc(t('home.help.body')) + '</p></div>' +
      '<div class="sv-close-actions">' +
      '<a class="btn btn-primary" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a>' +
      '<a class="btn btn-ghost" href="/showroom">' + esc(t('home.help.branches')) + '</a></div></div></section>'
    );
  }

  /* Showrooms — a photo-led visit page: a wide editorial hero, the three
   * rooms as image cards, what is on the floor, and a practical plan-your-visit
   * section. Branch details stay real: no invented map or opening hours. */
  function showroom() {
    return (
      '<section class="show-hero"><div class="wrap show-hero-in">' +
      '<div class="show-hero-copy">' +
      '<p class="show-kicker">' + esc(t('visit.eyebrow')) + '</p>' +
      '<h1>' + esc(t('visit.title')) + '</h1>' +
      '<p class="show-lede">' + esc(t('visit.lede')) + '</p>' +
      '<div class="show-actions">' +
      '<a class="btn btn-primary btn-lg" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a>' +
      '<a class="btn btn-ghost btn-lg" href="#rooms">' + esc(tx('Find a showroom', 'ሾውሩም ያግኙ')) + icon('arrow') + '</a>' +
      '</div>' +
      '<dl class="show-mini">' +
      '<div><dt>' + esc(t('visit.hoursLabel')) + '</dt><dd>' + esc(t('visit.hours')) + '</dd></div>' +
      '<div><dt>' + esc(tx('Showrooms', 'ሾውሩሞች')) + '</dt><dd>' + esc(t('contact.threeShowrooms')) + '</dd></div>' +
      '<div><dt>' + esc(tx('Parking', 'መኪና ማቆሚያ')) + '</dt><dd>' + esc(tx('Roadside, free', 'በመንገድ ዳር፣ በነጻ')) + '</dd></div>' +
      '</dl></div>' +
      '<div class="show-hero-art">' +
      '<figure class="show-hero-main">' + photo('sofas', 4, '(max-width: 900px) 100vw, 42vw') +
      '<figcaption>' + esc(tx('The sofa floor, Ambasel', 'የሶፋ ፎቅ፣ አምባሳል')) + '</figcaption></figure>' +
      '<div class="show-hero-small">' +
      '<figure>' + photo('bedroom', 0, '20vw') + '</figure>' +
      '<figure>' + photo('dining', 0, '20vw') + '</figure>' +
      '</div>' +
      '<span class="show-stamp">' + esc(tx('Open Mon–Sat', 'ከሰኞ–ቅዳሜ ክፍት')) + '<strong>9:00–17:00</strong></span>' +
      '</div></div></section>' +

      '<section class="wrap show-strip">' +
      '<div><strong>03</strong><span>' + esc(tx('showrooms in Debre Markos', 'በደብረ ማርቆስ የሚገኙ ሾውሩሞች')) + '</span></div>' +
      '<div><strong>45+</strong><span>' + esc(tx('pieces on the floor', 'በሾውሩም ያሉ ዕቃዎች')) + '</span></div>' +
      '<div><strong>12</strong><span>' + esc(tx('years of making and importing', 'ዓመታት የማምረትና የማስመጣት ልምድ')) + '</span></div>' +
      '<div><strong>01</strong><span>' + esc(tx('number for all three rooms', 'ለሦስቱም ክፍሎች አንድ ቁጥር')) + '</span></div>' +
      '</section>' +

      '<section class="wrap show-rooms" id="rooms">' +
      '<div class="show-sechead"><p class="show-kicker">' + esc(t('visit.branchesTitle')) + '</p>' +
      '<h2>' + esc(tx('Choose the room closest to you', 'በአቅራቢያዎ ያለውን ክፍል ይምረጡ')) + '</h2>' +
      '<p>' + esc(t('showroom.callFirst')) + '</p></div>' +
      '<div class="show-room-grid">' +
      P.branches
        .map(
          (b, i) =>
            '<article class="show-room">' +
            '<a class="show-room-media" href="' + esc(b.directions) + '" target="_blank" rel="noopener">' +
            photo(['sofas', 'bedroom', 'dining'][i] || 'sofas', i + 1, '(max-width: 900px) 100vw, 33vw') +
            '<span class="show-room-tag">0' + (i + 1) + '</span></a>' +
            '<div class="show-room-body">' +
            '<p class="show-room-kicker">' + esc(tx('Showroom', 'ሾውሩም')) + ' 0' + (i + 1) + '</p>' +
            '<h3>' + esc(L(b)) + '</h3>' +
            '<p class="show-room-note">' + esc(FF.getLang() === 'am' ? b.noteAm : b.note) + '</p>' +
            '<p class="show-room-landmark">' + icon('pin') + esc(b.landmark) + '</p>' +
            '<div class="show-room-actions">' +
            '<a class="btn btn-primary btn-sm" href="' + esc(b.directions) + '" target="_blank" rel="noopener">' +
            esc(t('showroom.directions')) + '</a>' +
            '<a class="show-room-link" href="' + esc(b.maps) + '" target="_blank" rel="noopener">' +
            esc(tx('See on map', 'በካርታ ይመልከቱ')) + icon('arrow') + '</a></div>' +
            '</div></article>'
        )
        .join('') +
      '</div></section>' +

      '<section class="show-visit"><div class="wrap show-visit-in">' +
      '<figure class="show-visit-media">' + photo('chairs', 2, '(max-width: 900px) 100vw, 46vw') +
      '<figcaption>' + esc(tx('Sit on it. Open the doors. Check the weave in daylight.', 'ተቀመጡ። በሮቹን ክፈቱ። ሽፋኑን በብርሃን ይመልከቱ።')) + '</figcaption></figure>' +
      '<div class="show-visit-copy">' +
      '<p class="show-kicker">' + esc(t('showroom.plan')) + '</p>' +
      '<h2>' + esc(t('showroom.before')) + '</h2>' +
      '<p class="show-lede">' + esc(t('showroom.beforeSub')) + '</p>' +
      '<ol class="show-steps">' +
      [1, 2, 3]
        .map(
          (n) =>
            '<li><span>0' + n + '</span><div><h3>' + esc(t('showroom.b' + n + '.t')) + '</h3>' +
            '<p>' + esc(t('showroom.b' + n + '.d')) + '</p></div></li>'
        )
        .join('') +
      '</ol>' +
      '<div class="show-visit-actions">' +
      '<a class="btn btn-primary" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a>' +
      '<a class="btn btn-ghost" href="/contact">' + esc(t('nav.contact')) + icon('arrow') + '</a>' +
      '</div></div></div></section>' +

      '<section class="wrap show-cats">' +
      '<div class="show-sechead"><p class="show-kicker">' + esc(t('showroom.see')) + '</p>' +
      '<h2>' + esc(tx('What is on the floor', 'በሾውሩም ያለው')) + '</h2>' +
      '<p>' + esc(t('showroom.seeSub')) + '</p></div>' +
      '<div class="show-cat-grid">' +
      [
        ['living', 'sofas', '/shop?cat=sofas'],
        ['bedroom', 'beds', '/shop?cat=beds'],
        ['dining', 'dining', '/shop?cat=dining'],
        ['office', 'office', '/shop?cat=office'],
      ]
        .map(
          (row, i) =>
            '<a class="show-cat" href="' + row[2] + '">' +
            '<span class="show-cat-media">' + photo(row[1], i + 2, '(max-width: 900px) 50vw, 25vw') + '</span>' +
            '<span class="show-cat-body"><strong>' + esc(t('services.' + row[0] + '.t')) + '</strong>' +
            '<span>' + esc(tx('See the collection', 'ስብስባቡን ይመልከቱ')) + icon('arrow') + '</span></span></a>'
        )
        .join('') +
      '</div></section>' +

      '<section class="show-cta"><div class="wrap show-cta-in">' +
      '<div><p class="show-kicker">' + esc(t('visit.call')) + '</p>' +
      '<h2>' + esc(tx('Not sure which room has the piece?', 'ዕቃው የትኛው ክፍል እንዳለ አልዎትም?')) + '</h2>' +
      '<p>' + esc(t('showroom.callFirst')) + '</p></div>' +
      '<div class="show-cta-actions">' +
      '<a class="btn btn-light btn-lg" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a>' +
      '<a class="btn btn-outline btn-lg" href="/shop">' + esc(tx('Browse everything', 'ሁሉንም ይመልከቱ')) + icon('arrow') + '</a>' +
      '</div></div></section>'
    );
  }

  /* Contact — a two-column front desk: a real conversation starter on the
   * left, the practical details and the three addresses on the right. */
  function contact() {
    return (
      '<section class="contact-hero"><div class="wrap contact-hero-in">' +
      '<div class="contact-copy">' +
      '<p class="show-kicker">' + esc(t('nav.contact')) + '</p>' +
      '<h1>' + esc(t('contact.title')) + '</h1>' +
      '<p class="show-lede">' + esc(t('contact.lede')) + '</p>' +
      '<div class="contact-call">' +
      '<span>' + esc(t('contact.callTitle')) + '</span>' +
      '<a href="tel:' + P.phoneHref + '">' + esc(P.phone) + '</a>' +
      '<p>' + esc(t('contact.callBody')) + '</p></div>' +
      '<div class="contact-actions">' +
      '<a class="btn btn-primary btn-lg" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(tx('Call now', 'አሁን ይደውሉ')) + '</a>' +
      '<a class="btn btn-ghost btn-lg" href="' + P.telegram + '" target="_blank" rel="noopener">' + icon('telegram') + 'Telegram</a>' +
      '</div></div>' +
      '<div class="contact-hero-art">' +
      '<figure>' + photo('sofas', 2, '(max-width: 900px) 100vw, 44vw') + '</figure>' +
      '<div class="contact-hours"><span>' + esc(t('visit.hoursLabel')) + '</span><strong>' + esc(t('visit.hours')) + '</strong>' +
      '<em>' + esc(tx('Walk in — no appointment needed', 'ያለ ቀጠሮ ይምጡ')) + '</em></div>' +
      '</div></div></section>' +

      '<section class="wrap contact-rooms">' +
      '<div class="show-sechead"><p class="show-kicker">' + esc(t('contact.threeShowrooms')) + '</p>' +
      '<h2>' + esc(tx('Three addresses, one number', 'ሦስት አድራሻዎች፣ አንድ ቁጥር')) + '</h2></div>' +
      '<div class="contact-room-grid">' +
      P.branches
        .map(
          (b, i) =>
            '<article class="contact-room">' +
            '<div class="contact-room-head"><span>0' + (i + 1) + '</span>' +
            '<h3>' + esc(L(b)) + '</h3></div>' +
            '<p>' + esc(FF.getLang() === 'am' ? b.noteAm : b.note) + '</p>' +
            '<p class="contact-room-landmark">' + icon('pin') + esc(b.landmark) + '</p>' +
            '<div class="contact-room-actions">' +
            '<a href="tel:' + P.phoneHref + '">' + icon('phone') + esc(tx('Call', 'ይደውሉ')) + '</a>' +
            '<a href="' + esc(b.directions) + '" target="_blank" rel="noopener">' + esc(t('showroom.directions')) + icon('arrow') + '</a>' +
            '</div></article>'
        )
        .join('') +
      '</div></section>' +

      '<section class="wrap contact-split">' +
      '<div class="contact-form-card contact-directory">' +
      '<p class="show-kicker">' + esc(tx('Talk to the shop', 'ከሱቁ ጋር ይነጋገሩ')) + '</p>' +
      '<h2>' + esc(tx('Call, message or walk in', 'ይደውሉ፣ ይላኩ ወይም ይምጡ')) + '</h2>' +
      '<p>' + esc(tx('The same number answers for all three showrooms. Call about a piece, a size or whether it is still on the floor — or send a message and we will reply during opening hours.', 'ለሦስቱም ሾውሩሞች የሚመልሰው አንድ ቁጥር ነው። ስለ ዕቃ፣ ስለ መጠን ወይም ዕቃው አሁንም መኖሩን ይደውሉ — ወይም መልዕክት ይላኩ፤ በስራ ሰዓት እንመልስልዎታለን።')) + '</p>' +
      '<a class="contact-big-phone" href="tel:' + P.phoneHref + '">' + esc(P.phone) + '</a>' +
      '<div class="contact-actions">' +
      '<a class="btn btn-primary btn-lg" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(tx('Call now', 'አሁን ይደውሉ')) + '</a>' +
      '<a class="btn btn-ghost btn-lg" href="' + P.telegram + '" target="_blank" rel="noopener">' + icon('telegram') + 'Telegram</a>' +
      '</div>' +
      '<dl class="contact-dl"><div><dt>' + esc(t('visit.hoursLabel')) + '</dt><dd>' + esc(t('visit.hours')) + '</dd></div>' +
      '<div><dt>' + esc(tx('Showrooms', 'ሾውሩሞች')) + '</dt><dd>' + esc(t('contact.threeShowrooms')) + ' — ' + esc(tx('see the addresses above', 'አድራሻዎቹን ከላይ ይመልከቱ')) + '</dd></div>' +
      '<div><dt>' + esc(tx('Collection', 'መውሰድ')) + '</dt><dd>' + esc(t('contact.collection')) + '</dd></div></dl>' +
      '</div>' +
      '<aside class="contact-aside">' +
      '<div class="contact-aside-card is-dark">' +
      '<p class="show-kicker">' + esc(tx('Find us', 'ያግኙን')) + '</p>' +
      '<p>' + esc(t('home.help.branches')) + '</p>' +
      '<a class="btn btn-light btn-sm" href="/showroom">' + icon('pin') + esc(tx('All showrooms and directions', 'ሁሉም ሾውሩሞችና አቅጣጫዎች')) + '</a>' +
      '</div>' +
      '<div class="contact-aside-card">' +
      '<p class="show-kicker">' + esc(t('contact.socialTitle')) + '</p>' +
      '<p>' + esc(t('contact.socialBody')) + '</p>' +
      '<div class="contact-socials">' +
      '<a href="' + P.telegram + '" target="_blank" rel="noopener">' + icon('telegram') + '<span>Telegram<em>' + esc(t('contact.telegramHandle')) + '</em></span></a>' +
      '<a href="' + P.facebook + '" target="_blank" rel="noopener">' + icon('facebook') + '<span>Facebook<em>' + esc(t('brand.name')) + '</em></span></a>' +
      '<a href="' + P.tiktok + '" target="_blank" rel="noopener">' + icon('tiktok') + '<span>TikTok<em>' + esc(t('contact.tiktokHandle')) + '</em></span></a>' +
      '</div></div>' +
      '</aside></section>'
    );
  }


  function privacy() {
    const block = (titleEn, titleAm, body) =>
      '<section class="legal-block"><h2>' + tx(titleEn, titleAm) + '</h2>' + body + '</section>';
    const list = (items) => '<ul class="legal-list">' + items.map((i) => '<li>' + i + '</li>').join('') + '</ul>';

    return (
      pageHead(
        [{ href: '/', label: t('nav.home') }, { label: tx('Privacy', 'ግላዊነት') }],
        tx('Privacy and your data', 'ግላዊነትና የእርስዎ መረጃ'),
        tx(
          'What this website stores, why it stores it, and how to have it removed. This page describes this website only — not Facebook, TikTok, Telegram or Google Maps.',
          'ይህ ድረ-ገጽ ምን እንደሚያከማች፣ ለምን እንደሚያከማችና እንዴት እንዲወገድ እንደሚቻል። ይህ ገጽ ስለዚህ ድረ-ገጽ ብቻ ነው — ስለ Facebook፣ TikTok፣ Telegram ወይም Google Maps አይደለም።'
        )
      ) +
      '<div class="wrap legal">' +
      block(
        'What we collect',
        'የምንሰበስበው',
        '<p>' + tx('When you create an account we store your name, email address and a hashed password. When you save pieces or compare them, we store those choices against your account. When you contact us by phone, Telegram, Facebook or TikTok, that conversation is handled by that service under its own privacy policy.', 'መግቢያ ሲፈጥሩ ስምዎን፣ ኢሜይልዎንና የተመሰጠረ የይለፍ ቃል እናከማቻለን። ዕቃዎችን ሲያስቀምጡ ወይም ሲያወዳድሩ ምርጫዎችዎን ከመግቢያዎ ጋር እናስቀምጣለን። በስልክ፣ በTelegram፣ በFacebook ወይም በTikTok ሲያገኙን ውይይቱ በዚያ አገልግሎት የግላዊነት መመሪያ ይተዳደራል።') + '</p>'
      ) +
      block(
        'Cookies and local storage',
        'ኩኪዎችና የአካባቢ ማከማቻ',
        '<p>' + tx('The site keeps a small amount of data in your browser so the language choice, your saved pieces and your comparison list survive a page reload. No advertising or analytics cookies are set by this site.', 'ገጹ የቋንቋ ምርጫዎ፣ የተቀመጡ ዕቃዎችዎና የንጽጽር ዝርዝርዎ ገጽ ሲታደስ እንዲቆዩ ትንሽ መረጃ በአሳሽዎ ያስቀምጣል። ይህ ገጽ የማስታወቂያ ወይም የትንታኔ ኩኪ አያስቀምጥም።') + '</p>'
      ) +
      block(
        'How long we keep it',
        'ምን ያህል ጊዜ እናስቀምጣለን',
        '<p>' + tx('Account details stay until you ask for the account to be deleted. Security logs are kept only as long as needed to stop abuse. To see, correct or delete your account and shortlist, call 0920 282861 or visit any of the three showrooms — there is no automated deletion button yet, so a person will handle it.', 'የመግቢያ ዝርዝሮች መግቢያው እንዲሰረዝ እስኪጠይቁ ድረስ ይቆያሉ። የደህንነት መዝገቦች ጥቃትን ለመከላከል በሚያስፈልገው ጊዜ ብቻ ይቀመጣሉ። መግቢያዎንና ዝርዝርዎን ለማየት፣ ለማስተካከል ወይም ለመሰረዝ 0920 282861 ይደውሉ ወይም ሦስቱን ሾውሩሞች ይጎብኙ — አሁን ለራስ-ሰር ስረዛ ቁልፍ የለም፤ ሰው ይረዳዎታል።') + '</p>'
      ) +
      block(
        'Your choices',
        'ምርጫዎችዎ',
        list([
          tx('Ask us what we hold about you.', 'ስለእርስዎ ምን እንደምናስቀምጥ ይጠይቁን።'),
          tx('Ask us to correct a name, phone number or email address.', 'ስም፣ ስልክ ወይም ኢሜይል እንዲስተካከል ይጠይቁ።'),
          tx('Ask us to delete your account and shortlist.', 'መግቢያዎና ዝርዝርዎ እንዲሰረዙ ይጠይቁ።'),
          tx('Withdraw a consent you gave us at any time.', 'የሰጡትን ፈቃድ በማንኛውም ጊዜ ይቀልሉ።'),
        ])
      ) +
      '</div>'
    );
  }

  function terms() {
    return pageHead(
      [{ href: '/', label: t('nav.home') }, { label: tx('Terms', 'ውሎች') }],
      tx('Terms of use', 'የአጠቃቀም ውሎች'),
      tx('The short version: this catalogue is for keeping up with the collection. It is not an online shop, and no order or price is created by using it.', 'አጭሩ፡ ይህ ካታሎግ ስብስባቡን ለመከታተል ነው። የመስመር ላይ ሱቅ አይደለም፤ በመጠቀምዎም ትዕዛዝ ወይም ዋጋ አይፈጠርም።')
    ) +
      '<div class="wrap legal">' +
      '<section class="legal-block"><h2>' + tx('Photographs and availability', 'ፎቶዎችና መገኘት') + '</h2>' +
      '<p>' + tx('Furniture is photographed in the showrooms or supplied by the maker. Wood grain, leather tone and fabric weave vary from piece to piece, so the piece you collect may not match the photograph exactly. Stock moves between the three showrooms; call 0920 282861 to confirm a piece is on the floor before you travel.', 'ዕቃዎች በሾውሩም ውስጥ ይፎቶግራፍ ይደረጋሉ ወይም ከአምራቹ ይመጣሉ። የእንጨት ጥብጣብ፣ የቆዳ ቀለምና የጨርቅ ሽፋን ከዕቃ ወደ ዕቃ ይለያያል፤ ስለዚህ የሚወስዱት ዕቃ ከፎቶው ጋር ልክ ላይሆን ይችላል። ክምችት በሦስቱ ሾውሩሞች መካከል ይንቀሳቀሳል፤ ከመምጣትዎ በፊት ዕቃው መኖሩን ለማረጋገጥ 0920 282861 ይደውሉ።') + '</p></section>' +
      '<section class="legal-block"><h2>' + tx('No online orders or payments', 'የመስመር ላይ ትዕዛዝ ወይም ክፍያ የለም') + '</h2>' +
      '<p>' + tx('This site displays the collection and lets you keep a shortlist. It does not take payment and does not create a contract. Prices, sizes, finishes and lead times are agreed with the shop in person or by phone. Any deposit or payment is handled directly with the shop.', 'ይህ ገጽ ስብስባቡን ያሳያል፤ የተመረጡ ዕቃዎችንም እንዲያስቀምጡ ያስችላል። ክፍያ አይቀበልም፤ ውልም አይፈጥርም። ዋጋ፣ መጠን፣ ቀለምና የማድረሻ ጊዜ ከሱቁ ጋር በአካል ወይም በስልክ ይስማማሉ። ማንኛውም ቅድሚያ ክፍያ ወይም ክፍያ ከሱቁ ጋር በቀጥታ ይደረጋል።') + '</p></section>' +
      '<section class="legal-block"><h2>' + tx('Care and wear', 'እንክብካቤና ልብስ') + '</h2>' +
      '<p>' + tx('Leather, solid wood and hand-woven textiles change with use. Follow the care notes on each piece and the care guide on this site. Damage caused by heat, sun, spills or improper cleaning is not a manufacturing fault.', 'ቆዳ፣ ጠንካራ እንጨትና በእጅ የተሸመነ ጨርቅ ከአገልግሎት ጋር ይለወጣል። በየዕቃው ላይ ያሉትን የእንክብካቤ ማስታወሻዎችና በዚህ ገጽ ላይ ያለውን የእንክብካቤ መመሪያ ይከተሉ። በሙቀት፣ በፀሐይ፣ በፈሰሰ ነገር ወይም በተሳሳተ ጽዳት የሚደርስ ጉዳት የምርት ጉድለት አይደለም።') + '</p></section>' +
      '</div>';
  }

  function faq() {
    return (
      pageHead(
        [{ href: '/', label: t('nav.home') }, { label: tx('Questions', 'ጥያቄዎች') }],
        tx('Questions, answered', 'የተመለሱ ጥያቄዎች'),
        tx('The things people ask most often before they visit a showroom.', 'ሾውሩም ከመጎብኘታቸው በፊት ብዙ ሰዎች የሚጠይቁት።')
      ) +
      '<div class="wrap legal"><div class="acc">' +
      [1, 2, 3, 4, 5, 6, 7, 8]
        .map((n) => (t('faq.q' + n) !== 'faq.q' + n ? U.accItem(t('faq.q' + n), '<p>' + esc(t('faq.a' + n)) + '</p>', n === 1) : ''))
        .join('') +
      '</div></div>'
    );
  }

  function delivery() {
    return pageHead(
      [{ href: '/', label: t('nav.home') }, { label: tx('Delivery', 'ማድረስ') }],
      tx('Delivery and collection', 'ማድረስና መውሰድ'),
      tx('Everything leaves from a showroom. How it gets to your room is arranged with the shop.', 'ሁሉም ከሾውሩም ይወጣል። ወደ ክፍልዎ እንዴት እንደሚደርስ ከሱቁ ጋር ይዘጋጃል።')
    ) +
      '<div class="wrap legal">' +
      '<section class="legal-block"><h2>' + tx('Collection from Debre Markos', 'ከደብረ ማርቆስ መውሰድ') + '</h2>' +
      '<p>' + tx('Every piece is prepared, checked and handed over at one of the three showrooms. Bring a vehicle that fits the piece and a person to help load it; the team will help you get it into the vehicle.', 'እያንዳንዱ ዕቃ በሦስቱ ሾውሩሞች አንዱ ተዘጋጅቶ፣ ተመርምሮና ይሰጣል። ዕቃውን የሚይዝ ተሽከርካሪና ለመጫን የሚረዳ ሰው ይዘው ይምጡ፤ ቡድኑ ወደ ተሽከርካሪው ለመጫን ይረዳዎታል።') + '</p></section>' +
      '<section class="legal-block"><h2>' + tx('Delivery outside Debre Markos', 'ከደብረ ማርቆስ ውጭ ማድረስ') + '</h2>' +
      '<p>' + tx('Delivery can be arranged to nearby towns and to Addis Ababa. The cost depends on the piece, the distance and whether you need help carrying it upstairs. Ask when you call; the shop confirms the price before anything is loaded.', 'ወደ አቅራቢያ ከተሞችና ወደ አዲስ አበባ ማድረስ ይቻላል። ወጪው በዕቃው፣ በርቀቱና ደረጃ መሸከም በሚያስፈልግ ላይ ይወሰናል። ሲደውሉ ይጠይቁ፤ ሱቁ ምንም ከመጫኑ በፊት ዋጋውን ያረጋግጣል።') + '</p></section>' +
      '<section class="legal-block"><h2>' + tx('Before it leaves', 'ከመውጣቱ በፊት') + '</h2>' +
      '<p>' + tx('Open the doors, sit on the seat, check the stitching and the edges with the team. Once a piece leaves the showroom it is yours; ask about the shop’s warranty for frames and workmanship when you are there.', 'በሮቹን ይክፈቱ፣ ይቀመጡ፣ ስፌቱንና ጠርዞቹን ከቡድኑ ጋር ያረጋግጡ። ዕቃው ከሾውሩም ከወጣ በኋላ የእርስዎ ነው፤ ስለ ክፈፍና ስለ ሥራ ዋስትና በዚያ ሲኖሩ ይጠይቁ።') + '</p></section>' +
      '</div>';
  }

  FF.views = FF.views || {};
  FF.views.notFound = notFound;
  FF.views.services = services;
  FF.views.showroom = showroom;
  FF.views.contact = contact;
  FF.views.privacy = privacy;
  FF.views.terms = terms;
  FF.views.faq = faq;
  FF.views.delivery = delivery;
})();
