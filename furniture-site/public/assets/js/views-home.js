/* FineFurniture — home page: an editorial front door to the gallery. */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const t = U.t;
  const L = U.L;
  const esc = U.esc;
  const icon = U.icon;
  const card = U.productCard;
  const P = U.P;

  const tx = (en, am) => (FF.getLang() === 'am' ? am : en);
  const withPhoto = (list) => list.filter((p) => p.imageUrl);

  function cover(category) {
    return withPhoto(FF.PRODUCTS.filter((p) => p.category === category))[0] || withPhoto(FF.PRODUCTS)[0];
  }

  function hero() {
    const photos = withPhoto(FF.PRODUCTS);
    const lead = photos[0] || FF.PRODUCTS[0];
    const session = U.state.session || {};
    const signed = !!session.signedIn;
    const counts = {};
    FF.PRODUCTS.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const present = FF.CATEGORIES.filter((c) => counts[c.id]);

    return (
      '<section class="gh"><div class="wrap gh-grid">' +
      '<div class="gh-copy">' +
      '<p class="gh-kick"><span class="gh-dot"></span>' + tx('The collection · Debre Markos', 'ስብስባቡ · ደብረ ማርቆስ') + '</p>' +
      '<h1 class="gh-title">' + tx('Furniture with', 'ጣዕም ያለው') + ' <em>' + tx('a point of view.', 'የቤት ዕቃ።') + '</em></h1>' +
      '<p class="gh-lede">' +
      tx(
        'A small, deliberately chosen collection — Italian leather, Scandinavian oak, Japanese restraint, Ethiopian hand-weave — kept in three showrooms so you can sit on it, open it and see the finish in daylight before you decide.',
        'በጥንቃቄ የተመረጠ ትንሽ ስብስብ — የጣሊያን ቆዳ፣ የስካንዲኔቪያ ኦክ፣ የጃፓን ረጅም ጣዕም፣ የኢትዮጵያ በእጅ የተሸመነ ጨርቅ — በሦስት ሾውሩሞች ተቀምጠው ማየትና መሞከር ይችላሉ።'
      ) +
      '</p>' +
      '<div class="gh-actions">' +
      '<a class="btn btn-primary btn-lg" href="/shop">' + tx('Enter the gallery', 'ጋለሪውን ይግቡ') + icon('arrow') + '</a>' +
      '<a class="btn btn-ghost btn-lg" href="tel:' + P.phoneHref + '">' + icon('phone') + P.phone + '</a>' +
      '</div>' +
      (signed
        ? '<p class="gh-note"><a href="/account">' + icon('user') + tx('Your dashboard', 'የእርስዎ ዳሽቦርድ') + '</a> <span>·</span> ' +
          esc(tx('saved pieces and comparisons are waiting.', 'የተቀመጡ ዕቃዎችና ንጽጽሮች ይጠብቁዎታል።')) + '</p>'
        : '') +
      '</div>' +
      '<figure class="gh-hero">' +
      (lead ? U.media(lead, { eager: true, sizes: '(max-width: 900px) 100vw, 46vw' }) : '') +
      (lead
        ? '<figcaption><span>' + esc(FF.categoryName(lead.category, FF.getLang())) + '</span>' +
          '<a href="/product/' + lead.slug + '">' + esc(L(lead.name)) + '</a>' +
          '<em>' + tx('in the Ambasel showroom', 'በአምባሳል ሾውሩም') + '</em></figcaption>'
        : '') +
      '</figure>' +
      '</div></section>'
    );
  }

  function ribbon() {
    const words = [
      tx('Leather', 'ሙሉ ቆዳ'),
      tx('Solid oak', 'ጠንካራ ኦክ'),
      tx('Hand-woven cotton', 'በእጅ የተሸመነ ጥጥ'),
      tx('Walnut veneer', 'የዋልነት ገጽታ'),
      tx('Bouclé', 'ቡክሌ'),
      tx('Stone', 'የተለሰለሰ ድንጋይ'),
    ];
    return (
      '<div class="gh-ribbon" aria-hidden="true"><div class="gh-ribbon-track">' +
      words.map((w) => '<span>' + esc(w) + '</span><i></i>').join('') +
      words.map((w) => '<span>' + esc(w) + '</span><i></i>').join('') +
      '</div></div>'
    );
  }

  function categories() {
    const counts = {};
    FF.PRODUCTS.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    Object.assign(counts, FF.categoryCounts || {});
    const present = FF.CATEGORIES.filter((c) => counts[c.id] && withPhoto(FF.PRODUCTS.filter((p) => p.category === c.id)).length);
    if (!present.length) return '';
    return (
      '<section class="gx-section"><div class="wrap">' +
      '<div class="gx-sechead"><div>' +
      '<p class="eyebrow">' + tx('Browse by room', 'በክፍል ይመልከቱ') + '</p>' +
      '<h2>' + tx('Six ways into the collection', 'ወደ ስብስባቡ ስድስት መንገዶች') + '</h2>' +
      '</div><a class="link-arrow" href="/shop">' + tx('Everything', 'ሁሉም') + icon('arrow') + '</a></div>' +
      '<div class="gh-cats">' +
      present
        .map((c, i) => {
          const p = cover(c.id);
          return (
            '<a class="gh-cat' + (i === 0 ? ' is-wide' : '') + '" href="/shop?cat=' + c.id + '">' +
            '<span class="gh-cat-media">' + (p ? U.media(p) : '') + '</span>' +
            '<span class="gh-cat-body"><span class="gh-cat-name">' + esc(L(c.name)) + '</span></span>' +
            '<span class="gh-cat-arrow">' + icon('arrow') + '</span></a>'
          );
        })
        .join('') +
      '</div></div></section>'
    );
  }

  function pieces() {
    if (!FF.PRODUCTS.length) return '';
    const list = FF.PRODUCTS.slice(0, 12);
    return (
      '<section class="gx-section gx-tint"><div class="wrap">' +
      '<div class="gx-sechead"><div>' +
      '<p class="eyebrow">' + tx('Selected pieces', 'የተመረጡ ዕቃዎች') + '</p>' +
      '<h2>' + tx('Worth a closer look', 'በቅርብ ማየት የሚገባው') + '</h2>' +
      '<p>' + tx('Photographed in the showrooms, in ordinary daylight — no styling tricks.', 'በሾውሩሞች ውስጥ በተፈጥሮ ብርሃን የተነሱ — ያለ ማጋነን።') + '</p>' +
      '</div><a class="link-arrow" href="/shop">' + tx('See all pieces', 'ሁሉንም ይመልከቱ') + icon('arrow') + '</a></div>' +
      '<div class="gh-rail">' + list.map(card).join('') + '</div>' +
      '</div></section>'
    );
  }

  function world() {
    const photos = withPhoto(FF.PRODUCTS);
    const a = photos[1] || photos[0];
    const b = photos[7] || photos[2] || photos[0];
    return (
      '<section class="gx-section gh-world"><div class="wrap gh-world-grid">' +
      '<div class="gh-world-art">' +
      '<figure class="gh-world-a">' + (a ? U.media(a) : '') + '</figure>' +
      '<figure class="gh-world-b">' + (b ? U.media(b) : '') + '</figure>' +
      '<span class="gh-world-tag">' + tx('Three showrooms · Debre Markos', 'ሦስት ሾውሩሞች · ደብረ ማርቆስ') + '</span>' +
      '</div>' +
      '<div class="gh-world-copy">' +
      '<p class="eyebrow">' + tx('Why these pieces', 'ለምን እነዚህ') + '</p>' +
      '<h2>' + tx('Chosen for the way they age.', 'በሚያረጁበት መንገድ የተመረጡ።') + '</h2>' +
      '<p>' + tx(
        'A sofa should look better in its fifth year than its first. We look for solid frames, leather that patinas, covers that can be replaced and joinery that can be tightened — then we keep one or two of each, not a warehouse of everything.',
        'ሶፋ በአምስተኛው ዓመቱ ከመጀመሪያው የተሻለ መልክ ሊኖረው ይገባል። ጠንካራ ክፈፍ፣ በጊዜ የሚያምር ቆዳ፣ የሚተካ ሽፋንና የሚጠናከር መገጣጠሚያ እንፈልጋለን — ከየዓይነቱ አንድ ወይም ሁለት እንይዛለን።'
      ) + '</p>' +
      '<ul class="gh-world-list">' +
      '<li>' + icon('leaf') + '<div><strong>' + tx('Materials you can touch', 'በእጅ የሚዳሰሱ ቁሳቁሶች') + '</strong><span>' +
      tx('Leather, oak, walnut, linen, bouclé and stone — see the grain and the weave in person.', 'ቆዳ፣ ኦክ፣ ዋልነት፣ ተልባ፣ ቡክሌና ድንጋይ — ጥብጣቡንና ሽመናውን በአካል ይመልከቱ።') + '</span></div></li>' +
      '<li>' + icon('tools') + '<div><strong>' + tx('Made to your wall', 'ለግድግዳዎ የሚሠራ') + '</strong><span>' +
      tx('Wardrobes, tables and sideboards can be built to the exact size of your room in our workshop.', 'ቁምሳጥን፣ ጠረጴዛና ሳይድቦርድ በወርክሾፋችን በክፍልዎ መጠን ይሠራሉ።') + '</span></div></li>' +
      '<li>' + icon('pin') + '<div><strong>' + tx('No delivery promises', 'የማድረስ ቃል የለም') + '</strong><span>' +
      tx('Everything is collected from a showroom in Debre Markos, so you see it before it leaves.', 'ሁሉም ከደብረ ማርቆስ ሾውሩም ይወሰዳል፤ ከመውጣቱ በፊት ያዩታል።') + '</span></div></li>' +
      '</ul>' +
      '<a class="btn btn-primary" href="/services">' + tx('How we work', 'እንዴት እንሠራለን') + icon('arrow') + '</a>' +
      '</div></div></section>'
    );
  }

  function editorial() {
    const pick = (fn) => withPhoto(FF.PRODUCTS.filter(fn))[0] || withPhoto(FF.PRODUCTS)[0];
    const room = pick((p) => p.room === 'living');
    const wood = pick((p) => (p.materials || []).indexOf('solid-wood') > -1 || (p.materials || []).indexOf('oak') > -1);
    const soft = pick((p) => (p.materials || []).indexOf('linen') > -1 || (p.materials || []).indexOf('boucle') > -1);
    const cards = [
      {
        href: '/inspiration',
        photo: room,
        kicker: tx('Room notes', 'የክፍል ማስታወሻ'),
        title: tx('See pieces together, not one by one.', 'ዕቃዎችን አንድ ላይ ይመልከቱ።'),
        body: tx('Four rooms, built from what is on the floor now — and the measurements that make them work.', 'አራት ክፍሎች፣ አሁን ካለው ዕቃ የተዘጋጁ — እንዲሠሩም የሚያደርጉት መለኪያዎች።'),
      },
      {
        href: '/materials',
        photo: wood,
        kicker: tx('Materials & finishes', 'ቁሳቁሶችና ቀለሞች'),
        title: tx('Leather, oak, linen, stone.', 'ቆዳ፣ ኦክ፣ ተልባ፣ ድንጋይ።'),
        body: tx('What each material does over time, the finishes in the collection, and how to look after them.', 'እያንዳንዱ ቁሳቁስ በጊዜ ምን እንደሚሆን፣ በስብስባቡ ያሉ ቀለሞችና እንዴት እንደሚንከባከቡ።'),
      },
      {
        href: '/care',
        photo: soft,
        kicker: tx('Care & craft', 'እንክብካቤና ሥራ'),
        title: tx('Look after it and it lasts.', 'ተንከባክበውት ይቆያል።'),
        body: tx('Simple habits for leather, wood and woven covers, plus the construction details worth asking about.', 'ለቆዳ፣ እንጨትና ጨርቅ ቀላል ልምዶች፣ መጠየቅ የሚገባቸው የግንባታ ዝርዝሮችም።'),
      },
    ];
    return (
      '<section class="gx-section home-edit"><div class="wrap">' +
      '<div class="gx-sechead"><div><p class="eyebrow">' + tx('Before you decide', 'ከመወሰንዎ በፊት') + '</p>' +
      '<h2>' + tx('A little more context.', 'ትንሽ ተጨማሪ ዐውድ።') + '</h2>' +
      '<p>' + tx('The catalogue shows the piece. These pages show how it lives in a room, what it is made of, and how it ages.', 'ካታሎጉ ዕቃውን ያሳያል። እነዚህ ገጾች በክፍል ውስጥ እንዴት እንደሚኖር፣ ከምን እንደተሠራና እንዴት እንደሚያረጅ ያሳያሉ።') + '</p></div>' +
      '<a class="link-arrow" href="/inspiration">' + tx('Start with a room', 'ከክፍል ይጀምሩ') + icon('arrow') + '</a></div>' +
      '<div class="home-edit-grid">' +
      cards.map((c) =>
        '<a class="home-edit-card" href="' + c.href + '">' +
        '<span class="home-edit-media">' + (c.photo ? U.media(c.photo, { sizes: '(max-width: 800px) 100vw, 33vw' }) : '') + '</span>' +
        '<span class="home-edit-body"><em>' + esc(c.kicker) + '</em><strong>' + esc(c.title) + '</strong>' +
        '<span>' + esc(c.body) + '</span><i>' + tx('Read', 'ያንብቡ') + icon('arrow') + '</i></span></a>'
      ).join('') +
      '</div></div></section>'
    );
  }

  function visit() {
    return (
      '<section class="gx-section gh-visit"><div class="wrap">' +
      '<div class="gx-sechead"><div>' +
      '<p class="eyebrow">' + tx('Come and sit down', 'መጥተው ይቀመጡ') + '</p>' +
      '<h2>' + tx('Three showrooms, one phone number.', 'ሦስት ሾውሩሞች፣ አንድ ስልክ ቁጥር።') + '</h2>' +
      '<p>' + tx('Monday to Saturday, 9:00 – 17:00. Closed Sunday.', 'ከሰኞ እስከ ቅዳሜ፣ 9:00 – 17:00። እሁድ ዝግ።') + '</p>' +
      '</div><a class="btn btn-primary" href="tel:' + P.phoneHref + '">' + icon('phone') + P.phone + '</a></div>' +
      '<div class="gh-branches">' +
      P.branches
        .map(
          (b, i) =>
            '<a class="gh-branch" href="/showroom">' +
            '<span class="gh-branch-num">0' + (i + 1) + '</span>' +
            '<span class="gh-branch-body"><strong>' + esc(L(b)) + '</strong><em>' + esc(FF.getLang() === 'am' ? b.noteAm : b.note) + '</em></span>' +
            icon('arrow') + '</a>'
        )
        .join('') +
      '</div>' +
      '<div class="gh-visit-foot">' +
      '<a class="gh-visit-link" href="/showroom">' + tx('Directions and what to expect', 'አቅጣጫና ምን እንደሚጠብቁ') + icon('arrow') + '</a>' +
      '<a class="gh-visit-link" href="/contact">' + tx('Talk to the shop', 'ከሱቁ ጋር ይነጋገሩ') + icon('arrow') + '</a>' +
      '</div></div></section>'
    );
  }

  function closing() {
    return (
      '<section class="gh-cta"><div class="wrap gh-cta-in">' +
      '<div><p class="eyebrow">' + tx('Save what you like', 'የወደዱትን ያስቀምጡ') + '</p>' +
      '<h2>' + tx('Build a shortlist before you visit.', 'ከመምጣትዎ በፊት ዝርዝር ይሥሩ።') + '</h2>' +
      '<p>' + tx(
        'Create an account to save pieces, compare them side by side and keep a record of what you have already seen. It is free, and it takes one minute.',
        'ዕቃዎችን ለማስቀመጥ፣ ጎን ለጎን ለማነጻጸርና ያዩትን ለመዝገብ መግቢያ ይክፈቱ። ነፃ ነው፣ አንድ ደቂቃ ብቻ ይወስዳል።'
      ) + '</p></div>' +
      '<div class="gh-cta-actions">' +
      (U.state.session && U.state.session.signedIn
        ? '<a class="btn btn-primary btn-lg" href="/account">' + tx('Open my dashboard', 'ዳሽቦርዴን ክፈት') + icon('arrow') + '</a>'
        : '<a class="btn btn-primary btn-lg" href="/register">' + tx('Create an account', 'መግቢያ ይክፈቱ') + icon('arrow') + '</a>' +
          '<a class="btn btn-ghost btn-lg" href="/login">' + tx('Sign in', 'ይግቡ') + '</a>') +
      '</div></div></section>'
    );
  }

  FF.views = FF.views || {};
  FF.views.home = () => hero() + ribbon() + categories() + pieces() + editorial() + world() + visit() + closing();
})();
