/* FineFurniture — editorial pages: room notes, the material library and the
 * care and craft guide. These pages help someone judge a piece before making
 * the trip to Debre Markos. There is no cart and no ordering anywhere. */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const t = U.t;
  const L = U.L;
  const esc = U.esc;
  const icon = U.icon;
  const P = U.P;

  const tx = (en, am) => (FF.getLang() === 'am' ? am : en);
  const withPhoto = (list) => (list || []).filter((p) => p.imageUrl);

  function head(kicker, title, lede, action) {
    return (
      '<section class="ed-head"><div class="wrap">' +
      '<p class="sv-kicker">' + esc(kicker) + '</p>' +
      '<h1 class="sv-title">' + esc(title) + '</h1>' +
      '<p class="sv-lede">' + esc(lede) + '</p>' +
      (action || '') +
      '</div></section>'
    );
  }

  /* ------------------------------------------------------------- room notes */

  const ROOM_NOTES = [
    {
      id: 'living',
      titleEn: 'A living room that is easy to sit in',
      titleAm: 'በቀላሉ የሚቀመጡበት ሳሎን',
      bodyEn:
        'Start with the piece you use every day. A low sofa keeps the room open, a lounge chair gives the corner a purpose, and one solid table gives the eye somewhere to rest. Leave a clear path to the window.',
      bodyAm:
        'በየቀኑ የሚጠቀሙበትን ዕቃ በመጀመሪያ ይምረጡ። ዝቅተኛ ሶፋ ክፍሉን ሰፊ ያደርገዋል፣ ማረፊያ ወንበር ለማዕዘኑ ዓላማ ይሰጣል፣ አንድ ጠንካራ ጠረጴዛ ዓይን የሚያርፍበት ቦታ ይሆናል። ወደ መስኮቱ የሚወስደውን መንገድ ክፍት ያድርጉ።',
      noteEn: 'Sit first, measure second.',
      noteAm: 'መጀመሪያ ይቀመጡ፣ ከዚያ ይለኩ።',
    },
    {
      id: 'bedroom',
      titleEn: 'A bedroom with room to breathe',
      titleAm: 'የሚተነፍስበት መኝታ ቤት',
      bodyEn:
        'The bed is the anchor. Give it space on both sides, keep the wardrobe on the wall that does not face the window, and use one bedside table rather than two crowded ones if the room is narrow.',
      bodyAm:
        'አልጋው መሠረቱ ነው። በሁለቱም ጎን ክፍተት ይስጡት፣ ቁምሳጥኑን መስኮቱን የማይመለከተው ግድግዳ ላይ ያድርጉ፤ ክፍሉ ጠባብ ከሆነ ከሁለት የተጨናነቁ ጠረጴዛዎች ይልቅ አንድ የአልጋ ጎን ጠረጴዛ ይጠቀሙ።',
      noteEn: 'Leave at least one quiet wall.',
      noteAm: 'ቢያንስ አንድ ጸጥ ያለ ግድግዳ ይተው።',
    },
    {
      id: 'dining',
      titleEn: 'A dining room built around the table',
      titleAm: 'በጠረጴዛው ዙሪያ የተሠራ የመመገቢያ ክፍል',
      bodyEn:
        'Choose the table for the number of people who actually eat there, then check the chair pull-out distance to the wall. A sideboard earns its place when it holds what you use at the table every day.',
      bodyAm:
        'ጠረጴዛውን በትክክል ለሚመገቡበት ሰዎች ቁጥር ይምረጡ፣ ከዚያ ወንበሩ ከግድግዳው ለመውጣት የሚያስፈልገውን ክፍተት ያረጋግጡ። ሳይድቦርድ በየቀኑ በጠረጴዛው ላይ የሚጠቀሙበትን ሲይዝ ቦታውን ያገኛል።',
      noteEn: 'A table needs 90 cm behind each chair.',
      noteAm: 'ከየወንበሩ ጀርባ 90 ሴ.ሜ ያስፈልጋል።',
    },
    {
      id: 'office',
      titleEn: 'An office that stays out of the way',
      titleAm: 'ከመንገድ የማይግድ ቢሮ',
      bodyEn:
        'Put the desk where the light comes from the side, not straight into the screen. A filing cabinet and one open shelf hold more than a stack of small tables, and a comfortable chair is worth more than another surface.',
      bodyAm:
        'ጠረጴዛውን ብርሃኑ ከጎን በሚመጣበት ቦታ ያድርጉ፣ በቀጥታ ወደ ስክሪኑ እንዳይሆን። የፋይል ማስቀመጫና አንድ ክፍት መደርደሪያ ከብዙ ትናንሽ ጠረጴዛዎች የበለጠ ይይዛሉ፤ ምቹ ወንበርም ከተጨማሪ ገጽ የበለጠ ዋጋ አለው።',
      noteEn: 'Keep the working surface clear.',
      noteAm: 'የሥራ ገጹን ንጹህ ያድርጉ።',
    },
  ];

  function roomPieces(room) {
    const direct = withPhoto(FF.PRODUCTS.filter((p) => p.room === room.id));
    const fallback = {
      living: ['sofas', 'chairs', 'tables'],
      bedroom: ['bedroom', 'storage', 'chairs'],
      dining: ['dining', 'tables', 'chairs'],
      office: ['tables', 'chairs', 'storage'],
    }[room.id] || [];
    const extras = withPhoto(FF.PRODUCTS.filter(
      (p) => direct.indexOf(p) === -1 && fallback.indexOf(p.category) > -1
    ));
    return direct.concat(extras);
  }

  function lookItem(p) {
    return (
      '<a class="room-item" href="/product/' + p.slug + '">' +
      '<span class="room-item-photo">' + U.media(p, { sizes: '92px' }) + '</span>' +
      '<span class="room-item-copy"><strong>' + esc(L(p.name)) + '</strong>' +
      '<em>' + esc(FF.categoryName(p.category, FF.getLang())) + '</em></span>' +
      icon('arrow') + '</a>'
    );
  }

  function roomStory(room, index) {
    const pieces = roomPieces(room).slice(0, 3);
    const lead = pieces[0];
    if (!lead) return '';
    const note = ROOM_NOTES[index] || ROOM_NOTES[0];
    return (
      '<article class="room' + (index % 2 ? ' is-flip' : '') + '" id="room-' + room.id + '">' +
      '<figure class="room-media">' + U.media(lead, { sizes: '(max-width: 900px) 100vw, 52vw' }) +
      '<figcaption><span>' + esc(t('rooms.' + room.id)) + '</span><em>' + esc(L(lead.name)) + '</em></figcaption></figure>' +
      '<div class="room-copy">' +
      '<span class="room-num">0' + (index + 1) + '</span>' +
      '<p class="eyebrow">' + esc(tx('Room notes', 'የክፍል ማስታወሻ')) + ' · ' + esc(t('rooms.' + room.id)) + '</p>' +
      '<h2>' + esc(tx(note.titleEn, note.titleAm)) + '</h2>' +
      '<p>' + esc(tx(note.bodyEn, note.bodyAm)) + '</p>' +
      '<p class="room-rule">' + icon('ruler') + esc(tx(note.noteEn, note.noteAm)) + '</p>' +
      '<h3>' + esc(tx('In this room', 'በዚህ ክፍል')) + '</h3>' +
      '<div class="room-list">' + pieces.map(lookItem).join('') + '</div>' +
      '<a class="link-arrow" href="/shop?room=' + room.id + '">' +
      esc(tx('All pieces for this room', 'ሁሉንም የዚህ ክፍል ዕቃዎች')) + icon('arrow') + '</a>' +
      '</div></article>'
    );
  }

  function inspiration(products) {
    const list = products || FF.PRODUCTS;
    const total = list.length;
    return (
      head(
        tx('Inspiration', 'መነሳሳት'),
        tx('Rooms, not catalogues.', 'ክፍሎች፣ ካታሎግ አይደሉም።'),
        tx(
          'The same thirty pieces look different depending on what sits beside them. These are four ways to start a room, using furniture that is in the showrooms now — so you can come and check the scale in person.',
          'ተመሳሳዮቹ ሠላሳ ዕቃዎች ከጎናቸው በሚቀመጠው ዕቃ ላይ ተመስርተው ይለያያሉ። አሁን በሾውሩሞች ባለው ዕቃ አራት ክፍሎችን ለመጀመር የሚያገለግሉ መንገዶች ናቸው — መጠኑንም በአካል ማረጋገጥ ይችላሉ።'
        ),
        '<div class="sv-actions"><a class="btn btn-primary" href="/shop">' +
          esc(tx('Open the gallery', 'ጋለሪውን ይክፈቱ')) + icon('arrow') + '</a>' +
          '<a class="btn btn-ghost" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a></div>'
      ) +
      '<div class="wrap ed-ledger"><div><strong>' + total + '</strong><span>' + esc(tx('pieces in the collection', 'ዕቃዎች በስብስባቡ')) + '</span></div>' +
      '<div><strong>04</strong><span>' + esc(tx('rooms to start from', 'የሚጀምሩባቸው ክፍሎች')) + '</span></div>' +
      '<div><strong>03</strong><span>' + esc(tx('showrooms to see them in', 'የሚያዩባቸው ሾውሩሞች')) + '</span></div></div>' +
      '<div class="wrap rooms">' + FF.ROOMS.map((room, i) => roomStory(room, i)).join('') + '</div>' +
      '<section class="ed-quiet"><div class="wrap ed-quiet-in"><div>' +
      '<p class="eyebrow">' + esc(tx('Before you measure', 'ከመለካት በፊት')) + '</p>' +
      '<h2>' + esc(tx('Three rules that save a room.', 'ክፍልን የሚያድኑ ሦስት ሕጎች።')) + '</h2></div>' +
      '<ol class="ed-rules">' +
      [
        [tx('Walk the path', 'መንገዱን ይራመዱ'), tx('Leave 60–90 cm between the sofa and the table, and never block the route to a door.', 'በሶፋውና በጠረጴዛው መካከል 60–90 ሴ.ሜ ይተው፤ ወደ በር የሚወስደውን መንገድ አይዘጉ።')],
        [tx('Mix two textures', 'ሁለት ጨርቆችን ያዋህዱ'), tx('One smooth surface and one woven one. Too much of the same finish makes a room feel flat.', 'አንድ ለስላሳ ገጽና አንድ የተሸመነ። አንድ ዓይነት ጨርቅ መብዛቱ ክፍሉን ወጥ ያደርገዋል።')],
        [tx('Buy the anchor first', 'መሠረቱን መጀመሪያ ይግዙ'), tx('Choose the sofa or bed before the side pieces. Everything else follows its height and colour.', 'ከጎን ዕቃዎች በፊት ሶፋውን ወይም አልጋውን ይምረጡ። ሌላው ሁሉ ቁመቱንና ቀለሙን ይከተላል።')],
      ]
        .map((row) => '<li><span></span><strong>' + esc(row[0]) + '</strong><p>' + esc(row[1]) + '</p></li>')
        .join('') +
      '</ol></div></section>' +
      '<section class="wrap ed-close"><div><h2>' + esc(tx('The photographs are honest. The room has to be yours.', 'ፎቶዎቹ እውነተኛ ናቸው። ክፍሉ ግን የእርስዎ መሆን አለበት።')) + '</h2>' +
      '<p>' + esc(tx('Bring the measurements of the room and we will tell you what fits. If nothing does, the workshop can make it to size.', 'የክፍሉን መለኪያ ይዘው ይምጡ፤ ምን እንደሚገጥም እንነግርዎታለን። የማይገጥም ካለ ወርክሾፓችን በመጠኑ ይሠራል።')) + '</p></div>' +
      '<a class="btn btn-primary" href="/showroom">' + icon('pin') + esc(tx('Plan a showroom visit', 'የሾውሩም ጉብኝት ያቅዱ')) + '</a></div></section>'
    );
  }

  /* -------------------------------------------------------- material library */

  const FAMILIES = [
    {
      key: 'leather',
      ids: ['leather'],
      titleEn: 'Leather',
      titleAm: 'ቆዳ',
      blurbEn:
        'Full-grain leather is a living surface. It takes the light differently across a seat, softens where you sit and darkens slowly instead of wearing out. Every hide has its own grain, so no two pieces are identical.',
      blurbAm:
        'ሙሉ ቆዳ በሕይወት ያለ ገጽ ነው። በመቀመጫው ላይ ብርሃንን በተለያየ መንገድ ይይዛል፣ በሚቀመጡበት ቦታ ይለሰልሳል፣ ከመልበስ ይልቅ ቀስ በቀስ ይጨልማል። እያንዳንዱ ቆዳ የራሱ ጥብጣብ አለው፤ ሁለት ዕቃዎች አንድ ዓይነት አይሆኑም።',
      careEn: 'Dust weekly with a dry cloth. Condition twice a year. Blot spills immediately and keep the piece out of direct sun.',
      careAm: 'በሳምንት አንድ ጊዜ በደረቅ ጨርቅ ያጽዱ። በዓመት ሁለት ጊዜ ያንከባክቡ። ፈሳሽ ከፈሰሰ ወዲያውኑ ይጠርጉ፤ ከፀሐይ ቀጥታ ያርቁ።',
    },
    {
      key: 'textiles',
      ids: ['linen', 'cotton', 'velvet', 'boucle', 'foam'],
      titleEn: 'Woven textiles & upholstery',
      titleAm: 'የተሸመኑ ጨርቆችና ስፖንጅ',
      blurbEn:
        'Linen, hand-woven cotton, velvet and bouclé each catch the light differently. Look at the weave up close, then sit on it: the fabric and the foam together decide whether a chair is soft, firm or somewhere in between.',
      blurbAm:
        'ተልባ፣ በእጅ የተሸመነ ጥጥ፣ ቬልቬትና ቡክሌ ብርሃንን በተለያየ መንገድ ይይዛሉ። ሽመናውን በቅርብ ይመልከቱ፣ ከዚያ ይቀመጡ፡ ጨርቁና ስፖንጁ አንድ ላይ ሆነው ወንበሩ ለስላሳ፣ ጠንካራ ወይም መካከለኛ መሆኑን ይወስናሉ።',
      careEn: 'Vacuum weekly with a soft brush. Removable covers wash cold on a gentle cycle. Never rub a stain — blot it and air-dry away from heat.',
      careAm: 'በሳምንት አንድ ጊዜ በለስላሳ ብሩሽ በቫኪዩም ያጽዱ። የሚወጡ ሽፋኖች በቀዝቃዛ ውሃ በለስላሳ ሁኔታ ይታጠባሉ። ነጠብጣብን አይጥረጉ — ይጠርጉት፣ ከሙቀት ርቀው ያድሩ።',
    },
    {
      key: 'wood',
      ids: ['solid-wood', 'oak', 'walnut'],
      titleEn: 'Solid wood, oak & walnut',
      titleAm: 'ጠንካራ እንጨት፣ ኦክና ዋልነት',
      blurbEn:
        'Oak is pale and open; walnut is dark and quiet. A solid frame can be tightened and refinished years later, which is why we look at the joinery before the finish. The grain is the piece’s fingerprint.',
      blurbAm:
        'ኦክ ቀላልና ክፍት ነው፤ ዋልነት ጥቁርና ጸጥ ያለ ነው። ጠንካራ ክፈፍ ከዓመታት በኋላ ሊጠናከርና ሊታደስ ይችላል፤ ስለዚህ ከገጽታው በፊት መገጣጠሚያውን እንመለከታለን። ጥብጣቡ የዕቃው የጣት አሻራ ነው።',
      careEn: 'Wipe with a barely damp cloth and dry immediately. Use coasters, avoid standing water, and re-oil or wax only when the surface starts to look dry.',
      careAm: 'በትንሹ እርጥብ ጨርቅ ያጽዱና ወዲያውኑ ያድሩ። የመጠጥ ማስቀመጫ ይጠቀሙ፣ ውሃ እንዲቆም አይተዉ፤ ገጹ መድረቅ ሲጀምር ብቻ ዘይት ወይም ሰም ይቀቡ።',
    },
    {
      key: 'stone',
      ids: ['metal', 'glass', 'stone'],
      titleEn: 'Metal, glass & stone',
      titleAm: 'ብረት፣ መስታወትና ድንጋይ',
      blurbEn:
        'These are the quiet materials: slim steel legs, a glass top, a honed stone surface. They keep a heavy piece from looking heavy, and they are the easiest surfaces in the collection to live with.',
      blurbAm:
        'እነዚህ ጸጥ ያሉ ቁሳቁሶች ናቸው፡ ቀጭን የብረት እግሮች፣ የመስታወት ገጽ፣ የተለሰለሰ ድንጋይ። ከባድ ዕቃ እንዳይከብድ ያደርጋሉ፤ በስብስባቡ ውስጥም ለመኖር ቀላሉ ገጾች ናቸው።',
      careEn: 'Use a soft damp cloth and dry with a clean one. No abrasive powder or scouring pad. Glass cleaner belongs on glass only, never on stone.',
      careAm: 'በለስላሳ እርጥብ ጨርቅ ያጽዱ፣ በንጹህ ጨርቅ ያድሩ። አሊያም የሚቧጭ ዱቄት ወይም ሰፍን አይጠቀሙ። የመስታወት ማጽጃ ለመስታወት ብቻ ነው፣ በድንጋይ ላይ አይደለም።',
    },
  ];

  function swatchesFor(pieces) {
    const seen = {};
    const out = [];
    pieces.forEach((p) => {
      (p.colors || []).forEach((c) => {
        if (!c || !c.hex || seen[c.hex]) return;
        seen[c.hex] = true;
        out.push(c);
      });
    });
    return out;
  }

  function materialPiece(p) {
    return (
      '<a class="mat-piece" href="/product/' + p.slug + '">' +
      '<span class="mat-piece-photo">' + U.media(p, { sizes: '140px' }) + '</span>' +
      '<span><strong>' + esc(L(p.name)) + '</strong><em>' +
      esc(FF.categoryName(p.category, FF.getLang())) + '</em></span></a>'
    );
  }

  function familyCard(family, index) {
    // A piece belongs to the family of its primary material. A leather sofa
    // with foam and steel legs is leather here, not three families at once.
    const pieces = withPhoto(FF.PRODUCTS.filter((p) => family.ids.indexOf((p.materials || [])[0]) > -1));
    if (!pieces.length) return '';
    const swatches = swatchesFor(pieces).slice(0, 10);
    const names = family.ids
      .map((id) => FF.materialName(id, FF.getLang()))
      .filter((name, i, arr) => arr.indexOf(name) === i)
      .join(' · ');
    return (
      '<article class="mat-family" id="material-' + family.key + '">' +
      '<div class="mat-family-side"><span class="mat-num">0' + (index + 1) + '</span>' +
      '<p class="eyebrow">' + esc(tx('Material family', 'የቁሳቁስ ቤተሰብ')) + '</p></div>' +
      '<div class="mat-family-main">' +
      '<div class="mat-family-head"><h2>' + esc(tx(family.titleEn, family.titleAm)) + '</h2>' +
      '<span class="mat-count">' + pieces.length + ' ' + esc(tx(pieces.length === 1 ? 'piece' : 'pieces', 'ዕቃ')) + '</span></div>' +
      '<p class="mat-names">' + esc(names) + '</p>' +
      '<p class="mat-blurb">' + esc(tx(family.blurbEn, family.blurbAm)) + '</p>' +
      '<div class="mat-finishes"><span>' + esc(tx('Finishes in this family', 'በዚህ ቤተሰብ ያሉ ቀለሞች')) + '</span>' +
      '<div class="mat-swatches">' + swatches.map((c) => '<i class="mat-swatch" style="background:' + esc(c.hex) + '" title="' + esc(L(c.name)) + '"></i>').join('') + '</div></div>' +
      '<p class="mat-care">' + icon('leaf') + '<span><strong>' + esc(tx('Care at a glance', 'የእንክብካቤ ማጠቃለያ')) + '</strong> ' +
      esc(tx(family.careEn, family.careAm)) + '</span></p>' +
      '<div class="mat-pieces">' + pieces.slice(0, 3).map(materialPiece).join('') + '</div>' +
      '<a class="link-arrow" href="/shop?material=' + encodeURIComponent(family.ids.join(',')) + '">' +
      esc(tx('See the pieces in this material', 'በዚህ ቁሳቁስ የተሠሩትን ይመልከቱ')) + icon('arrow') + '</a>' +
      '</div></article>'
    );
  }

  function materials(products) {
    const list = products || FF.PRODUCTS;
    const used = FF.MATERIALS.filter((m) => list.some((p) => (p.materials || []).indexOf(m.id) > -1));
    const finishes = swatchesFor(list);
    return (
      head(
        tx('Materials & finishes', 'ቁሳቁሶችና ቀለሞች'),
        tx('The part you cannot photograph properly.', 'በፎቶ በትክክል የማይታየው ክፍል።'),
        tx(
          'Colour changes with the light, and a weave only makes sense under your hand. This is what the collection is made from — then come and touch it in Debre Markos.',
          'ቀለም ከብርሃን ጋር ይቀያየራል፤ ሽመናም በእጅዎ ሥር ብቻ ትርጉም ይኖረዋል። ስብስባቡ ከምን እንደተሠራ ይህ ነው — ከዚያ በደብረ ማርቆስ መጥተው ይዳሰሱት።'
        ),
        '<div class="sv-actions"><a class="btn btn-primary" href="/shop">' + esc(tx('Shop by material', 'በቁሳቁስ ይምረጡ')) + icon('arrow') + '</a>' +
          '<a class="btn btn-ghost" href="/care">' + esc(tx('How to care for it', 'እንዴት እንደሚንከባከቡ')) + '</a></div>'
      ) +
      '<div class="wrap ed-ledger"><div><strong>' + used.length + '</strong><span>' + esc(tx('materials in use', 'በዕቃዎቹ የሚገኙ ቁሳቁሶች')) + '</span></div>' +
      '<div><strong>' + finishes.length + '</strong><span>' + esc(tx('finishes to see in person', 'በአካል የሚታዩ ቀለሞች')) + '</span></div>' +
      '<div><strong>03</strong><span>' + esc(tx('showrooms, one phone number', 'ሾውሩሞች፣ አንድ ስልክ ቁጥር')) + '</span></div></div>' +
      '<div class="wrap mat-body">' + FAMILIES.map(familyCard).join('') + '</div>' +
      '<section class="mat-honest"><div class="wrap mat-honest-in">' +
      '<div><p class="eyebrow">' + esc(tx('One honest note', 'አንድ እውነተኛ ማስታወሻ')) + '</p>' +
      '<h2>' + esc(tx('Screens lie about colour.', 'ስክሪኖች ስለ ቀለም ይዋሻሉ።')) + '</h2></div>' +
      '<p>' + esc(tx('A photograph cannot show how walnut catches a window, or how cognac leather changes through the day. Every finish here can be seen in daylight in the showroom before you decide. Call 0920 282861 and we will tell you which showroom has the piece.', 'ፎቶ ዋልነት በመስኮት ብርሃን እንዴት እንደሚታይ ወይም ኮኛክ ቆዳ በቀን ውስጥ እንዴት እንደሚቀያየር ማሳየት አይችልም። እዚህ ያለው እያንዳንዱ ቀለም ከመወሰንዎ በፊት በሾውሩም በተፈጥሮ ብርሃን ይታያል። 0920 282861 ይደውሉ፤ ዕቃው ያለበትን ሾውሩም እንነግርዎታለን።')) + '</p>' +
      '<a class="btn btn-primary" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a>' +
      '</div></section>'
    );
  }

  /* ------------------------------------------------------------ care & craft */

  const CARE = [
    {
      key: 'leather',
      icon: 'leaf',
      titleEn: 'Leather',
      titleAm: 'ቆዳ',
      bodyEn: 'Dust with a dry cloth every week. Condition twice a year with a leather cream, working it in sparingly. Blot spills at once; do not rub. Keep the piece out of direct sun and away from radiators.',
      bodyAm: 'በሳምንት አንድ ጊዜ በደረቅ ጨርቅ ያጽዱ። በዓመት ሁለት ጊዜ በቆዳ ክሬም በትንሹ ያንከባክቡ። ፈሳሽ ከፈሰሰ ወዲያውኑ ይጠርጉ፤ አይጥረጉ። ከፀሐይ ቀጥታና ከሙቀት ማሞቂያ ያርቁ።',
    },
    {
      key: 'textiles',
      icon: 'sofa',
      titleEn: 'Linen, cotton & velvet',
      titleAm: 'ተልባ፣ ጥጥና ቬልቬት',
      bodyEn: 'Vacuum weekly with a soft brush. Removable covers: cold wash, gentle cycle, air-dry away from heat. Blot stains, never scrub. Velvet and bouclé are best professionally cleaned.',
      bodyAm: 'በሳምንት አንድ ጊዜ በለስላሳ ብሩሽ በቫኪዩም ያጽዱ። የሚወጡ ሽፋኖች፡ በቀዝቃዛ ውሃ፣ በለስላሳ ሁኔታ ያጠቡ፣ ከሙቀት ርቀው ያድሩ። ነጠብጣብን ይጠርጉ፣ አይጥረጉ። ቬልቬትና ቡክሌ በሙያ ማጽዳት ይመረጣል።',
    },
    {
      key: 'wood',
      icon: 'tools',
      titleEn: 'Oak, walnut & solid wood',
      titleAm: 'ኦክ፣ ዋልነትና ጠንካራ እንጨት',
      bodyEn: 'Wipe with a barely damp cloth, then dry immediately. Use coasters and avoid standing water. Re-oil or wax only when the surface looks dry — not on a fixed schedule. Small cracks in solid wood are normal as it moves with the seasons.',
      bodyAm: 'በትንሹ እርጥብ ጨርቅ ያጽዱ፣ ወዲያውኑ ያድሩ። የመጠጥ ማስቀመጫ ይጠቀሙ፤ ውሃ እንዲቆም አይተዉ። ገጹ መድረቅ ሲጀምር ብቻ ዘይት ወይም ሰም ይቀቡ — በተወሰነ ጊዜ አይደለም። ጠንካራ እንጨት ከወቅት ጋር ሲንቀሳቀስ ትንሽ ስንጥቅ መኖሩ የተለመደ ነው።',
    },
    {
      key: 'stone',
      icon: 'shield',
      titleEn: 'Metal, glass & stone',
      titleAm: 'ብረት፣ መስታወትና ድንጋይ',
      bodyEn: 'Use a soft damp cloth and a clean dry one. No abrasive powders or scouring pads. Glass cleaner on glass only. Wipe stone spills before they dry, especially oil, wine and citrus.',
      bodyAm: 'በለስላሳ እርጥብ ጨርቅና በንጹህ ደረቅ ጨርቅ ይጠቀሙ። የሚቧጭ ዱቄት ወይም ሰፍን አይጠቀሙ። የመስታወት ማጽጃ ለመስታወት ብቻ። በድንጋይ ላይ የፈሰሰውን ከመድረቁ በፊት ያጽዱ፣ በተለይ ዘይት፣ ወይንና ሎሚ።',
    },
    {
      key: 'cushions',
      icon: 'sparkle',
      titleEn: 'Cushions & foam',
      titleAm: 'ትራሶችና ስፖንጅ',
      bodyEn: 'Plump back cushions daily and rotate seat cushions monthly so they wear evenly. Vacuum the seams. If a seat starts to feel flat, ask the workshop — foam and covers can often be replaced rather than the whole piece.',
      bodyAm: 'የጀርባ ትራሶችን በየቀኑ ያስተካክሉ፣ የመቀመጫ ትራሶችን በየወሩ ያዙሩ፤ እኩል እንዲለበሱ። መገጣጠሚያዎቹን በቫኪዩም ያጽዱ። መቀመጫው ጠፍ እያለ ከተሰማዎት ወርክሾፑን ይጠይቁ — ስፖንጁና ሽፋኑ ሙሉ ዕቃውን ሳይተኩ ሊተኩ ይችላሉ።',
    },
    {
      key: 'firstmonth',
      icon: 'clock',
      titleEn: 'The first month',
      titleAm: 'የመጀመሪያው ወር',
      bodyEn: 'Keep new pieces out of strong direct sun and away from heat. Let leather and wood settle to your room. Vacuum textiles before they are used, and keep the care card that comes with the piece.',
      bodyAm: 'አዲሶቹን ዕቃዎች ከፀሐይ ቀጥታና ከሙቀት ያርቁ። ቆዳና እንጨት ከክፍልዎ ጋር እንዲስማሙ ይተዉ። ጨርቆችን ከመጠቀም በፊት በቫኪዩም ያጽዱ፤ ከዕቃው ጋር የሚሰጠውን የእንክብካቤ ካርድ ያስቀምጡ።',
    },
  ];

  const CRAFT = [
    [tx('The frame', 'ክፈፉ'), tx('A hardwood frame is the difference between a sofa that lasts and one that creaks. Ask what is inside before you look at the cover.', 'ጠንካራ የእንጨት ክፈፍ ሶፋ የሚቆይና የሚጨናነቅ መሆኑን ይወስናል። ሽፋኑን ከመመልከትዎ በፊት ውስጡ ምን እንደሆነ ይጠይቁ።')],
    [tx('The joinery', 'መገጣጠሚያው'), tx('Joints should be tight and repairable. A piece that can be tightened in five years is worth more than one that cannot be opened at all.', 'መገጣጠሚያዎች ጥብቅና የሚጠገኑ መሆን አለባቸው። ከአምስት ዓመት በኋላ ሊጠናከር የሚችል ዕቃ ሲከፈት ከማይችል ይበልጣል።')],
    [tx('The upholstery', 'ጨርቁና ስፖንጁ'), tx('Feather, foam or a mix — the feel is decided under the fabric, not by the colour. Sit on it for ten minutes, not ten seconds.', 'ላባ፣ ስፖንጅ ወይም ድብልቅ — ስሜቱ በጨርቁ ስር ይወሰናል፣ በቀለሙ አይደለም። ለአስር ደቂቃ ይቀመጡ፣ ለአስር ሰከንድ አይደለም።')],
    [tx('The workshop', 'ወርክሾፑ'), tx('If the size does not exist, it can be made. Bring a photo, a drawing or the measurements of the wall and agree the size and price before work starts.', 'መጠኑ ከሌለ ሊሠራ ይችላል። ፎቶ፣ ስዕል ወይም የግድግዳውን መለኪያ ይዘው ይምጡ፤ ሥራው ከመጀመሩ በፊት መጠኑንና ዋጋውን ይስማማሉ።')],
  ];

  function care() {
    const photo = withPhoto(FF.PRODUCTS.filter((p) => (p.materials || []).indexOf('solid-wood') > -1))[0] || withPhoto(FF.PRODUCTS)[0];
    return (
      head(
        tx('Care & craft', 'እንክብካቤና ሥራ'),
        tx('Look after it and it outlives the fashion.', 'ተንከባክበውት ከፋሽኑ ይበልጥ ይቆያል።'),
        tx(
          'Furniture is not delicate, but it does have a memory. These are the habits that keep leather soft, wood stable and covers looking new — and the construction details worth asking about before you choose.',
          'የቤት ዕቃ ለስላሳ አይደለም፣ ግን ትውስታ አለው። ቆዳ ለስላሳ፣ እንጨት የተረጋጋና ሽፋን አዲስ እንዲሆን የሚያደርጉ ልምዶች — ከመምረጥዎ በፊት መጠየቅ የሚገባቸው የግንባታ ዝርዝሮችም እነዚህ ናቸው።'
        ),
        '<div class="sv-actions"><a class="btn btn-primary" href="/materials">' + esc(tx('See the materials', 'ቁሳቁሶቹን ይመልከቱ')) + icon('arrow') + '</a>' +
          '<a class="btn btn-ghost" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(P.phone) + '</a></div>'
      ) +
      '<section class="wrap care-body"><div class="care-grid">' +
      CARE.map(
        (c) =>
          '<article class="care-card"><span class="care-ico">' + icon(c.icon) + '</span>' +
          '<h2>' + esc(tx(c.titleEn, c.titleAm)) + '</h2>' +
          '<p>' + esc(tx(c.bodyEn, c.bodyAm)) + '</p></article>'
      ).join('') +
      '</div></section>' +
      '<section class="craft"><div class="wrap craft-grid">' +
      '<figure class="craft-media">' + (photo ? U.media(photo, { sizes: '(max-width: 900px) 100vw, 46vw' }) : '') +
      '<figcaption>' + esc(tx('Built to be repaired, not replaced.', 'ለመጠገን የተሠራ፣ ለመተካት አይደለም።')) + '</figcaption></figure>' +
      '<div class="craft-copy"><p class="eyebrow">' + esc(tx('How it is made', 'እንዴት እንደሚሠራ')) + '</p>' +
      '<h2>' + esc(tx('Four things worth asking about.', 'ሊጠይቁባቸው የሚገቡ አራት ነገሮች።')) + '</h2>' +
      '<ol class="craft-list">' + CRAFT.map((row) => '<li><strong>' + esc(row[0]) + '</strong><p>' + esc(row[1]) + '</p></li>').join('') + '</ol>' +
      '<a class="link-arrow" href="/services">' + esc(tx('What the workshop can make', 'ወርክሾፑ ምን ማሠራት እንደሚችል')) + icon('arrow') + '</a></div>' +
      '</div></section>' +
      '<section class="wrap ed-close"><div><h2>' + esc(tx('A care question is always worth a phone call.', 'የእንክብካቤ ጥያቄ ሁልጊዜ ስልክ ይገባዋል።')) + '</h2>' +
      '<p>' + esc(tx('Tell us the material and what happened. We will tell you what to use — and what not to. There is no charge for asking.', 'ቁሳቁሱንና የሆነውን ይንገሩን። ምን እንደሚጠቀሙ — ምንም እንዳይጠቀሙ እንነግርዎታለን። መጠየቅ ክፍያ የለውም።')) + '</p></div>' +
      '<a class="btn btn-primary" href="tel:' + P.phoneHref + '">' + icon('phone') + esc(tx('Call the shop', 'ሱቁን ይደውሉ')) + '</a></div></section>'
    );
  }

  FF.views.inspiration = inspiration;
  FF.views.materials = materials;
  FF.views.care = care;
})();
