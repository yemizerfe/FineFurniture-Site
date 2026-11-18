/* FineFurniture — the gallery grid and a piece's page. No prices anywhere:
 * the visit, the material and the phone number are the call to action. */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const t = U.t;
  const L = U.L;
  const esc = U.esc;
  const icon = U.icon;
  const card = U.productCard;

  const tx = (en, am) => (FF.getLang() === 'am' ? am : en);

  function pageHref(params, page) {
    const next = new URLSearchParams(params.toString());
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    next.delete('price');
    const qs = next.toString();
    return '/shop' + (qs ? '?' + qs : '');
  }

  function pager(params, page, pages) {
    if (pages <= 1) return '';
    const nums = [];
    const from = Math.max(1, Math.min(page - 2, pages - 4));
    const to = Math.min(pages, from + 4);
    for (let n = from; n <= to; n += 1) nums.push(n);
    return (
      '<nav class="pagination" aria-label="' + esc(t('shop.pages')) + '">' +
      '<a class="page-btn page-step" href="' + pageHref(params, Math.max(1, page - 1)) + '"' +
      (page === 1 ? ' aria-disabled="true" tabindex="-1"' : '') + '>' + esc(t('shop.prev')) + '</a>' +
      nums
        .map(
          (n) =>
            '<a class="page-btn' + (n === page ? ' is-active' : '') + '" href="' + pageHref(params, n) + '"' +
            (n === page ? ' aria-current="page"' : '') + '>' + n + '</a>'
        )
        .join('') +
      '<a class="page-btn page-step" href="' + pageHref(params, Math.min(pages, page + 1)) + '"' +
      (page === pages ? ' aria-disabled="true" tabindex="-1"' : '') + '>' + esc(t('shop.next')) + '</a>' +
      '</nav>'
    );
  }

  function emptyShop() {
    return (
      '<div class="wrap gx-head"><nav class="crumbs"><a href="/">' + esc(t('nav.home')) + '</a><span>/</span>' +
      esc(t('shop.title')) + '</nav><h1>' + esc(t('shop.title')) + '</h1></div>' +
      '<div class="wrap"><div class="empty"><h3>' + esc(t('shop.noProducts')) + '</h3>' +
      '<p>' + esc(t('shop.noProductsBody')) + '</p>' +
      '<a class="btn btn-primary" href="tel:' + U.P.phoneHref + '">' + esc(t('visit.call')) + ' · ' + U.P.phone + '</a></div></div>'
    );
  }

  function shop(params, data) {
    if (!data) {
      if (!FF.hasCatalogue) return '<div class="wrap section"><p class="muted">' + esc(t('shop.loading')) + '</p></div>';
      return emptyShop();
    }
    if (!data.total) return emptyShop();

    const cats = (params.get('cat') || '').split(',').filter(Boolean);
    const q = (params.get('q') || '').trim();
    const sort = params.get('sort') || 'featured';
    const material = (params.get('material') || '').trim();
    const materialLabel = material
      ? material.split(',').filter(Boolean).map((id) => FF.materialName(id, FF.getLang())).join(' · ')
      : '';
    const items = data.products || [];

    const pills =
      '<a class="gx-pill' + (cats.length ? '' : ' is-active') + '" href="/shop">' + tx('All', 'ሁሉም') + '</a>' +
      FF.CATEGORIES.map(
        (c) =>
          '<a class="gx-pill' + (cats.includes(c.id) ? ' is-active' : '') + '" href="/shop?cat=' + c.id + '">' +
          esc(L(c.name)) + '</a>'
      ).join('');

    const body = items.length
      ? '<div class="gx-grid">' + items.map(card).join('') + '</div>' + pager(params, data.page, data.pages)
      : '<div class="empty"><h3>' + esc(t('shop.empty')) + '</h3><p>' + esc(t('shop.noResults')) + '</p>' +
        '<button class="btn btn-primary" type="button" data-act="filter-clear">' + tx('Show everything', 'ሁሉንም አሳይ') + '</button></div>';

    return (
      '<section class="gx-head"><div class="wrap">' +
      '<nav class="crumbs"><a href="/">' + esc(t('nav.home')) + '</a><span>/</span>' + esc(t('shop.title')) + '</nav>' +
      '<div class="gx-head-row"><div>' +
      '<p class="eyebrow">' + tx('The gallery', 'ጋለሪ') + '</p>' +
      '<h1>' + esc(t('shop.title')) + '</h1>' +
      '<p class="gx-lede">' + tx(
        'Every piece here is in Debre Markos. Tap one to read its story, or call the shop and we will tell you which showroom has it on the floor today.',
        'እዚህ ያለው ሁሉ በደብረ ማርቆስ ነው። የአንዱን ታሪክ ለማንበብ ይጫኑ፤ ወይም ደውለው ዛሬ የትኛው ሾውሩም እንዳለ ይጠይቁ።'
      ) + '</p>' +
      '</div></div>' +
      '</div></section>' +
      '<div class="wrap gx-body">' +
      '<div class="gx-toolbar">' +
      '<div class="gx-pills">' + pills + '</div>' +
      '<div class="gx-tools">' +
      '<form class="gx-search" data-form="filter-search" role="search">' +
      '<input class="input" type="search" name="q" value="' + esc(q) + '" placeholder="' + esc(t('shop.searchPlaceholder')) + '" />' +
      '</form>' +
      '<select class="select" data-filter="sort" aria-label="' + esc(t('shop.sort')) + '">' +
      '<option value="featured"' + (sort === 'featured' ? ' selected' : '') + '>' + esc(t('shop.sort.featured')) + '</option>' +
      '<option value="newest"' + (sort === 'newest' ? ' selected' : '') + '>' + esc(t('shop.sort.newest')) + '</option>' +
      '<option value="name"' + (sort === 'name' ? ' selected' : '') + '>' + tx('A – Z', 'ከሀ – ከፐ') + '</option>' +
      '</select>' +
      '</div></div>' +
      (material
        ? '<div class="gx-material"><span>' + tx('Showing pieces in', 'የሚታዩት ዕቃዎች በ') + ' <strong>' + esc(materialLabel) + '</strong></span>' +
          '<a href="/shop">' + tx('Clear material', 'ቁሳቁሱን አጽዳ') + '</a></div>'
        : '') +
      body +
      '</div>'
    );
  }

  function dimsRow(label, value) {
    return value ? '<tr><th scope="row">' + esc(label) + '</th><td>' + esc(value) + '</td></tr>' : '';
  }

  /** Two scale drawings — front elevation and plan — so a measurement can be
   *  judged against a wall instead of imagined from a list of numbers. */
  function dimensionFigure(p) {
    const d = p.dims || {};
    if (!d.w || !d.h) return '';
    const boxW = 168;
    const boxH = 104;
    const s = Math.min(boxW / d.w, boxH / d.h);
    const w = Math.max(18, Math.round(d.w * s));
    const h = Math.max(18, Math.round(d.h * s));
    const left = 62 + (boxW - w) / 2;
    const top = 26 + (boxH - h) / 2;
    const bottom = top + h;
    const seatY = d.seat ? bottom - Math.min(h, d.seat * s) : null;

    const front =
      '<figure class="dim-panel"><svg viewBox="0 0 300 190" role="img" aria-label="' +
      esc(tx('Front drawing', 'የፊት ስዕል') + ': ' + d.w + ' × ' + d.h + ' cm') + '">' +
      '<rect class="dim-body" x="' + left + '" y="' + top + '" width="' + w + '" height="' + h + '" rx="3" />' +
      '<line class="dim-floor" x1="' + (left - 18) + '" y1="' + (bottom + 6) + '" x2="' + (left + w + 18) + '" y2="' + (bottom + 6) + '" />' +
      (seatY
        ? '<line class="dim-dash" x1="' + left + '" y1="' + seatY + '" x2="' + (left + w + 30) + '" y2="' + seatY + '" />' +
          '<text class="dim-note" x="' + (left + w + 34) + '" y="' + (seatY + 4) + '">' + tx('seat', 'መቀመጫ') + ' ' + d.seat + '</text>'
        : '') +
      '<line class="dim-line" x1="' + left + '" y1="' + (bottom + 22) + '" x2="' + (left + w) + '" y2="' + (bottom + 22) + '" />' +
      '<line class="dim-tick" x1="' + left + '" y1="' + (bottom + 17) + '" x2="' + left + '" y2="' + (bottom + 27) + '" />' +
      '<line class="dim-tick" x1="' + (left + w) + '" y1="' + (bottom + 17) + '" x2="' + (left + w) + '" y2="' + (bottom + 27) + '" />' +
      '<text class="dim-value" x="' + (left + w / 2) + '" y="' + (bottom + 38) + '" text-anchor="middle">' + d.w + ' cm</text>' +
      '<line class="dim-line" x1="' + (left + w + 20) + '" y1="' + top + '" x2="' + (left + w + 20) + '" y2="' + bottom + '" />' +
      '<line class="dim-tick" x1="' + (left + w + 15) + '" y1="' + top + '" x2="' + (left + w + 25) + '" y2="' + top + '" />' +
      '<line class="dim-tick" x1="' + (left + w + 15) + '" y1="' + bottom + '" x2="' + (left + w + 25) + '" y2="' + bottom + '" />' +
      '<text class="dim-value" x="' + (left + w + 34) + '" y="' + (top + 14) + '">' + d.h + ' cm</text>' +
      '<text class="dim-caption" x="150" y="184" text-anchor="middle">' + esc(tx('Front', 'ፊት')) + '</text></svg></figure>';

    let plan = '';
    if (d.d) {
      const s2 = Math.min(boxW / d.w, boxH / d.d);
      const pw = Math.max(18, Math.round(d.w * s2));
      const pd = Math.max(18, Math.round(d.d * s2));
      const px = 62 + (boxW - pw) / 2;
      const py = 26 + (boxH - pd) / 2;
      plan =
        '<figure class="dim-panel"><svg viewBox="0 0 300 190" role="img" aria-label="' +
        esc(tx('Plan drawing', 'የላይ ስዕል') + ': ' + d.w + ' × ' + d.d + ' cm') + '">' +
        '<rect class="dim-body" x="' + px + '" y="' + py + '" width="' + pw + '" height="' + pd + '" rx="3" />' +
        '<line class="dim-line" x1="' + px + '" y1="' + (py + pd + 22) + '" x2="' + (px + pw) + '" y2="' + (py + pd + 22) + '" />' +
        '<line class="dim-tick" x1="' + px + '" y1="' + (py + pd + 17) + '" x2="' + px + '" y2="' + (py + pd + 27) + '" />' +
        '<line class="dim-tick" x1="' + (px + pw) + '" y1="' + (py + pd + 17) + '" x2="' + (px + pw) + '" y2="' + (py + pd + 27) + '" />' +
        '<text class="dim-value" x="' + (px + pw / 2) + '" y="' + (py + pd + 38) + '" text-anchor="middle">' + d.w + ' cm</text>' +
        '<line class="dim-line" x1="' + (px + pw + 20) + '" y1="' + py + '" x2="' + (px + pw + 20) + '" y2="' + (py + pd) + '" />' +
        '<line class="dim-tick" x1="' + (px + pw + 15) + '" y1="' + py + '" x2="' + (px + pw + 25) + '" y2="' + py + '" />' +
        '<line class="dim-tick" x1="' + (px + pw + 15) + '" y1="' + (py + pd) + '" x2="' + (px + pw + 25) + '" y2="' + (py + pd) + '" />' +
        '<text class="dim-value" x="' + (px + pw + 34) + '" y="' + (py + pd / 2 + 4) + '">' + d.d + ' cm</text>' +
        '<text class="dim-caption" x="150" y="184" text-anchor="middle">' + esc(tx('Plan', 'ላይ')) + '</text></svg></figure>';
    }

    return (
      '<figure class="dim-figure"><div class="dim-panels">' + front + plan + '</div>' +
      '<figcaption>' + esc(tx(
        'Drawn to scale from the measurements the shop uses. Check the doorway and the stair before you collect.',
        'ከሱቁ መለኪያ ጋር በተመጣጠነ መልኩ የተሳለ። ከመውሰድዎ በፊት በሩንና ደረጃውን ያረጋግጡ።'
      )) + '</figcaption></figure>'
    );
  }

  function specSheet(p) {
    const row = (label, value) => (value ? '<tr><th>' + esc(label) + '</th><td>' + esc(value) + '</td></tr>' : '');
    return (
      '<section class="spec-sheet" aria-hidden="true">' +
      '<p class="spec-kicker">Fine Furniture · Debre Markos</p>' +
      '<h2>' + esc(L(p.name)) + '</h2>' +
      '<p class="spec-sub">' + esc(L(p.tagline)) + '</p>' +
      '<table><tbody>' +
      row(tx('Reference', 'ማጣቀሻ'), p.sku) +
      row(tx('Collection', 'ስብስብ'), FF.categoryName(p.category, FF.getLang())) +
      row(tx('Materials', 'ቁሳቁሶች'), (p.materials || []).map((m) => FF.materialName(m, FF.getLang())).join(', ')) +
      row(tx('Origin', 'መነሻ'), p.origin) +
      row(tx('In the showroom', 'በሾውሩም'), p.stock ? tx('Yes — call to confirm', 'አዎ — ለማረጋገጥ ይደውሉ') : tx('Ask the shop', 'ሱቁን ይጠይቁ')) +
      detailRows(p).map(function (r) { return row(r[0], r[1]); }).join('') +
      '</tbody></table>' +
      '<p class="spec-note">' + esc(tx('Collection only from Debre Markos · 0920 282861 · Monday to Saturday, 9:00–17:00. This sheet is a specification, not an order.', 'ከደብረ ማርቆስ ብቻ ይወሰዳል · 0920 282861 · ከሰኞ እስከ ቅዳሜ፣ 9:00–17:00። ይህ ሰነድ መረጃ ነው፣ ትዕዛዝ አይደለም።')) + '</p>' +
      '</section>'
    );
  }

  /* What this piece is made of, using only the materials on its record. */
  function detailRows(p) {
    const mats = p.materials || [];
    const has = (m) => mats.indexOf(m) !== -1;
    const upholstered = has('leather') || has('linen') || has('cotton') || has('velvet') || has('boucle') || has('foam');
    const wood = has('oak') || has('walnut') || has('solid-wood');
    const rows = [];
    if (upholstered) {
      if (wood) rows.push([tx('Frame', 'ክፈፍ'), tx('Wooden frame', 'የእንጨት ክፈፍ')]);
      if (p.category === 'sofas' || p.category === 'chairs' || p.category === 'office') {
        rows.push([tx('Suspension', 'የመቀመጫ ድጋፍ'), tx('Spring suspension under the seat', 'ከመቀመጫው ስር የስፕሪንግ ድጋፍ')]);
      }
      rows.push([tx('Filling', 'ሙሌት'), tx('Foam-filled seat and back', 'በስፖንጅ የተሞላ መቀመጫና ጀርባ')]);
    }
    if (has('leather')) rows.push([tx('Upholstery', 'ሽፋን'), tx('Leather', 'ቆዳ')]);
    if (has('boucle')) rows.push([tx('Upholstery', 'ሽፋን'), tx('Bouclé (looped yarn)', 'ቡክሌ (የቀለበት ክር)')]);
    if (has('linen') || has('cotton')) rows.push([tx('Upholstery', 'ሽፋን'), tx('Woven fabric', 'የተሸመነ ጨርቅ')]);
    if (wood) rows.push([tx('Finish', 'ጨረቃ'), tx('Sealed wood surface', 'የታተመ የእንጨት ገጽ')]);
    if (has('stone')) rows.push([tx('Stone', 'ድንጋይ'), tx('Stone surface — ask us about the finish', 'የድንጋይ ገጽ — ስለ ጨረቃው ይጠይቁን')]);
    if (has('glass')) rows.push([tx('Glass', 'መስታወት'), tx('Tempered glass', 'የተጠናከረ መስታወት')]);
    if (has('metal')) rows.push([tx('Metalwork', 'የብረት ሥራ'), tx('Metal base and fittings', 'የብረት መሠረትና መገጣጠሚያዎች')]);
    rows.push([tx('Assembly', 'ጥምረት'), tx('Assembled before collection; the showroom fits legs, handles and shelves', 'ከመውሰድዎ በፊት ይገጣጠማል፤ ሾውሩሙ እግሮችን፣ እጀታዎችንና መደርደሪያዎችን ያስተካክላል')]);
    if (p.lead_time_days) rows.push([tx('Lead time', 'የሚዘጋጅበት ጊዜ'), tx(p.lead_time_days + ' days from confirmation, then collection from Debre Markos', 'ከማረጋገጫ በኋላ ' + p.lead_time_days + ' ቀናት፣ ከዚያ ከደብረ ማርቆስ ይወሰዳል')]);
    return rows;
  }

  /* Sourced general guidance from the furniture trade. These are category facts,
   * not claims that this individual piece carries a certificate. */
  function tradeNotes(p) {
    const mats = p.materials || [];
    const has = (m) => mats.indexOf(m) !== -1;
    const notes = [];
    const officeChair = p.category === 'office' && /chair|bench|seating/i.test(p.name.en);

    if (officeChair) {
      notes.push([
        'General-purpose office chairs are tested to ANSI/BIFMA X5.1, which is built around a 125 kg user and a ten-year, single-shift life. EN 1335-1 sets office-chair sizes A, B and C.',
        'የተለመዱ የቢሮ ወንበሮች በ ANSI/BIFMA X5.1 ይፈተናሉ፤ መለኪያው ለ125 ኪ.ግ ተጠቃሚና ለአስር ዓመት የአንድ ፈረቃ ሥራ የተዘጋጀ ነው። EN 1335-1 የወንበር መጠኖችን A፣ B እና C ይወስናል።',
      ]);
      notes.push([
        'The gas lift is a wear part. EN 16955 replaced DIN 4550 for gas springs; class 4 is the heaviest duty, but the class alone does not certify the whole chair.',
        'የከፍታ ማስተካከያው (ጋዝ ሊፍት) የሚለበስ ክፍል ነው። EN 16955 ለጋዝ ስፕሪንግ DIN 4550ን ተክቷል፤ ክላስ 4 ከፍተኛው የሥራ ጫና ነው፣ ነገር ግን ክላሱ ብቻውን መላውን ወንበር አያረጋግጥም።',
      ]);
      if (!has('leather')) {
        notes.push([
          'Castor tread is matched to the floor: hard tread for carpet, soft tread for tile and wood (EN 12529 types H and W).',
          'የጎማዎቹ ሽፋን ከመሬቱ ጋር ይመሳሰላል፡ ለምንጣፍ ጠንካራ፣ ለሰድርና ለእንጨት ለስላሳ (EN 12529 ዓይነት H እና W)።',
        ]);
      }
    }
    if (p.category === 'bedroom') {
      notes.push([
        'A slatted base lets air circulate under the mattress and spreads weight; slat spacing should match the mattress maker\'s warranty.',
        'የእንጨት ስላት መሰረት ከፎጣው ስር አየር እንዲዘዋወር ያደርጋል፣ ክብደቱንም ያሰራጫል፤ የስላቶቹ ክፍተት ከፎጣ አምራቹ ዋስትና ጋር መስማማት አለበት።',
      ]);
    }
    if (has('stone')) {
      notes.push([
        'Marble is calcium carbonate: lemon, vinegar and wine etch it, and sealer resists stains but does not stop etching. A honed finish hides marks better than a polished one.',
        'እምነት ድንጋይ (ማርብል) ካልሲየም ካርቦኔት ነው፡ ሎሚ፣ ኮምጣጤና ወይን ያቀልጡታል፤ ማከለያው ለምልክት ይቋቋማል ግን መቅለጥን አያቆምም። የተለሰለሰ (ሆንድ) ጨረቃ ምልክቶችን ከተወለወለው የበለጠ ይደብቃል።',
      ]);
    }
    if (has('leather')) {
      notes.push([
        'Full-grain leather keeps the whole outer grain, so it is the strongest and most breathable grade and develops a patina. Top-grain is sanded for uniformity, resists stains better but ages less.',
        'ሙሉ እህል (full-grain) ቆዳ ሙሉውን የውጭ እህል ይይዛል፤ ስለዚህ ጠንካራውና አየር የሚያስተላልፈው ደረጃ ነው፣ በጊዜም ያምራል። ቶፕ-ግሬይን ለአንድነት ይቦረሻል፤ ለምልክት የበለጠ ይቋቋማል፣ ግን በዕድሜ አይጨምርም።',
      ]);
    }
    if (has('boucle')) {
      notes.push([
        'Bouclé is looped yarn. The loops can snag on rings, zips and claws — trim a pulled loop with scissors rather than pulling it.',
        'ቡክሌ በቀለበት የተሠራ ክር ነው። ቀለበቶቹ በቀለብ፣ በዚፕና በጥፍር ሊሳቡ ይችላሉ — የተሳበውን ቀለበት አትጎትቱ፤ በቁርጥ ይቁረጡት።',
      ]);
    }
    if ((has('linen') || has('cotton')) && !officeChair) {
      notes.push([
        'Linen is flax fibre: it is stronger wet than dry, softens with washing and wrinkles naturally. Cotton is softer at first but pills more with friction.',
        'ተልባ ከፍላክስ ፋይበር የተሠራ ነው፡ እርጥብ ሲሆን ከደረቁ የበለጠ ጠንካራ ነው፣ በመታጠብ ይለሰልሳል፣ በተፈጥሮም ይታጠፋል። ጥጥ መጀመሪያ ለስላሳ ነው፣ ግን በግጭት ይጠራረጋል።',
      ]);
    }
    if (has('foam') && notes.length < 3) {
      notes.push([
        'Sofa and chair frames last when they are kiln-dried hardwood, joined with dowels, glue and screws, with corner blocks. Seat foam is graded by density, not firmness; below 1.8 lb/ft³ (about 29 kg/m³) it collapses sooner.',
        'የሶፋና የወንበር ክፈፍ በምድጃ የደረቀ ጠንካራ እንጨት ሆኖ በውቅር፣ በሙጫና በመጠምዘዣ ሲገጣጠም፣ በማዕዘን ብሎኮችም ሲደገፍ ይቆያል። የመቀመጫ ስፖንጅ በጥንካሬ ሳይሆን በክብደት (density) ይመዘናል፤ ከ1.8 ፓውንድ/ኪዩቢክ ጫማ (29 ኪ.ግ/ሜ³) በታች በፍጥነት ይደፋል።',
      ]);
    }
    if ((has('oak') || has('walnut') || has('solid-wood')) && notes.length < 3) {
      notes.push([
        'Solid wood moves with humidity. Keep it out of direct sun and away from radiators, and expect small seasonal gaps or movement.',
        'ጠንካራ እንጨት ከእርጥበት ጋር ይንቀሳቀሳል። ከፀሐይና ከማሞቂያ ያርቁት፤ በየወቅቱ ትንሽ ክፍተት ወይም መንቀሳቀስ ይጠብቁ።',
      ]);
    }
    return notes.slice(0, 3);
  }

  function pdp(p) {
    const photos = [p.imageUrl].concat(p.gallery || []).filter(Boolean);
    const related = (p.related || FF.PRODUCTS.filter((x) => x.slug !== p.slug && x.category === p.category)).slice(0, 4);
    const available = p.stock;

    const materialChips = (p.materials || []).length
      ? '<div class="pd-materials">' + p.materials.map((m) => '<span>' + esc(FF.materialName(m, FF.getLang())) + '</span>').join('') + '</div>'
      : '';

    return (
      '<div class="wrap pd-wrap">' +
      '<nav class="crumbs crumbs-top"><a href="/">' + esc(t('nav.home')) + '</a><span>/</span>' +
      '<a href="/shop?cat=' + p.category + '">' + esc(FF.categoryName(p.category, FF.getLang())) + '</a><span>/</span>' +
      esc(L(p.name)) + '</nav>' +
      '<div class="pd">' +
      '<div class="pd-gallery">' +
      '<div class="pd-main">' + U.media(p, { eager: true, sizes: '(max-width: 900px) 100vw, 55vw' }) + '</div>' +
      (photos.length > 1
        ? '<div class="pd-thumbs">' + photos.map(
            (url, i) =>
              '<button class="pd-thumb' + (i === 0 ? ' is-active' : '') + '" type="button" data-act="pdp-photo" data-src="' + esc(url) + '" aria-label="' + (i + 1) + '">' +
              '<img src="' + esc(url) + '" alt="" loading="lazy" /></button>'
          ).join('') + '</div>'
        : '') +
      '</div>' +
      '<div class="pd-info">' +
      '<p class="pd-cat">' + esc(FF.categoryName(p.category, FF.getLang())) + '</p>' +
      '<h1>' + esc(L(p.name)) + '</h1>' +
      (L(p.tagline) ? '<p class="pd-tagline">' + esc(L(p.tagline)) + '</p>' : '') +
      '<div class="pd-tools">' + U.heartButton(p, true) + U.compareButton(p) + '</div>' +
      '<div class="pd-status"><span class="pd-stock' + (available ? ' is-in' : '') + '">' +
      (available ? tx('In the showroom now', 'አሁን በሾውሩም አለ') : tx('Available to order', 'በትዕዛዝ ይገኛል')) + '</span>' +
      '<span class="pd-lead">' + tx('Ask us which showroom', 'የትኛው ሾውሩም እንዳለ ይጠይቁ') + '</span></div>' +
      materialChips +
      '<div class="pd-actions">' +
      '<a class="btn btn-primary btn-lg" href="tel:' + U.P.phoneHref + '">' + icon('phone') + tx('Call the shop', 'ወደ ሱቁ ይደውሉ') + '</a>' +
      '<a class="btn btn-ghost btn-lg" href="/showroom">' + icon('pin') + tx('Visit a showroom', 'ሾውሩም ይጎብኙ') + '</a>' +
      '<button class="btn btn-ghost btn-lg" type="button" data-act="print-spec">' + icon('ruler') + tx('Print specification', 'መረጃ ሰነዱን ያትሙ') + '</button>' +
      '</div>' +
      '<p class="pd-note">' + tx(
        'Collection only — everything leaves from a showroom in Debre Markos. Call 0920 282861 to check the piece is still on the floor.',
        'የሚወሰደው ከሾውሩም ነው። ዕቃው አሁንም እንዳለ ለማረጋገጥ 0920 282861 ይደውሉ።'
      ) + '</p>' +
      '<div class="acc">' +
      (L(p.desc) ? U.accItem(tx('The piece', 'ዕቃው'), '<p>' + esc(L(p.desc)) + '</p>' +
        ((p.features || []).length ? '<ul>' + p.features.map((f) => '<li>' + esc(typeof f === 'object' ? L(f) : f) + '</li>').join('') + '</ul>' : ''), true) : '') +
      '<div class="acc-item"><button class="acc-btn" type="button" data-act="acc" aria-expanded="false"><span>' + tx('Materials & origin', 'ቁሳቁስና መነሻ') + '</span><span class="sign"></span></button>' +
      '<div class="acc-body"><table class="dim-table">' +
      dimsRow(tx('Materials', 'ቁሳቁሶች'), (p.materials || []).map((m) => FF.materialName(m, FF.getLang())).join(', ')) +
      dimsRow(tx('Origin', 'መነሻ'), p.origin) +
      dimsRow(tx('Collection', 'ስብስብ'), FF.categoryName(p.category, FF.getLang())) +
      '</table></div></div>' +
      U.accItem(tx('Construction & finish', 'አሠራርና ጨርቃጨርቅ'), '<table class="dim-table">' + detailRows(p).map(function (r) { return dimsRow(r[0], r[1]); }).join('') + '</table>') +
      U.accItem(tx('What the trade checks', 'የንግዱ ማረጋገጫዎች'), '<ul class="fact-list">' + tradeNotes(p).map(function (n) { return '<li>' + esc(FF.getLang() === 'am' ? n[1] : n[0]) + '</li>'; }).join('') + '</ul>' +
        '<p class="fact-source">' + tx('General trade guidance, not a certificate for this individual piece. Sources:', 'አጠቃላይ የዕቃ ንግድ መመሪያ ነው፣ ለዚህ የተለየ ዕቃ የምስክር ወረቀት አይደለም። ምንጮች፡') +
        ' <a href="https://www.bifma.org/page/5-1-overview" target="_blank" rel="noopener">BIFMA X5.1</a>, <a href="https://iba.online/en/knowledge/space-planning/regulations/product-standards" target="_blank" rel="noopener">EN 1335</a>, <a href="https://www.dinmedia.de/en/standard/din-en-16955/271018041" target="_blank" rel="noopener">EN 16955</a>, <a href="https://store.uni.com/en/uni-en-12529-2001" target="_blank" rel="noopener">EN 12529</a>, <a href="https://www.leatherworkinggroup.com/fileadmin/uploads/lwg/Knowledge/LWG_List_of_Definitions_v1.1.pdf" target="_blank" rel="noopener">Leather Working Group</a>, <a href="https://www.naturalstoneinstitute.org/" target="_blank" rel="noopener">Natural Stone Institute</a>.</p>', true) +
      (L(p.care) ? U.accItem(tx('Care', 'እንክብካቤ'), '<p>' + esc(L(p.care)) + '</p>' +
        '<a class="link-arrow" href="/care">' + tx('The full care guide', 'ሙሉ የእንክብካቤ መመሪያ') + icon('arrow') + '</a>') : '') +
      U.accItem(tx('Seeing it in person', 'በአካል ማየት'), '<p>' + tx(
        'Call 0920 282861 before you travel and we will tell you which of the three showrooms has this piece on the floor. Monday to Saturday, 9:00 – 17:00.',
        'ከመምጣትዎ በፊት 0920 282861 ይደውሉ፤ ዕቃው ከሦስቱ ሾውሩሞች በየትኛው እንዳለ እንነግርዎታለን። ከሰኞ እስከ ቅዳሜ፣ 9:00 – 17:00።'
      ) + '</p>') +
      '</div></div>' + specSheet(p) + '</div>' +
      (related.length
        ? '<section class="pd-related"><div class="wrap">' +
          '<div class="gx-sechead"><div><p class="eyebrow">' + tx('In the same room', 'በአንድ ክፍል') + '</p><h2>' + tx('Pairs well with', 'ከዚህ ጋር ይስማማል') + '</h2></div>' +
          '<a class="link-arrow" href="/shop?cat=' + p.category + '">' + tx('More ' + FF.categoryName(p.category, 'en').toLowerCase(), 'ተጨማሪ') + icon('arrow') + '</a></div>' +
          '<div class="gx-grid">' + related.map(card).join('') + '</div></div></section>'
        : '') +
      '</div>'
    );
  }

  function skeleton(kind) {
    if (kind === 'product') {
      return (
        '<div class="wrap skl-pdp"><div class="skl skl-media"></div>' +
        '<div class="skl-copy"><div class="skl skl-line tiny"></div><div class="skl skl-line big"></div>' +
        '<div class="skl skl-line short"></div><div class="skl skl-line price"></div>' +
        '<div class="skl skl-line"></div><div class="skl skl-line short"></div>' +
        '<div class="skl skl-button"></div></div></div>'
      );
    }
    if (kind === 'account') {
      return (
        '<div class="wrap section skl-account"><div class="skl skl-line big"></div>' +
        '<div class="skl skl-line short"></div><div class="skl-grid">' +
        [1, 2, 3, 4, 5, 6].map(() => '<div class="skl skl-card"></div>').join('') +
        '</div></div>'
      );
    }
    if (kind === 'compare') {
      return '<div class="wrap section"><div class="skl skl-line big"></div><div class="skl skl-table"></div></div>';
    }
    return (
      '<div class="wrap page-head"><div class="skl skl-line tiny"></div><div class="skl skl-line big"></div>' +
      '<div class="skl skl-line short"></div></div>' +
      '<div class="wrap shop-layout"><div class="skl skl-side"></div><div class="skl-grid">' +
      [1, 2, 3, 4, 5, 6, 7, 8].map(() => '<div class="skl skl-card"></div>').join('') +
      '</div></div>'
    );
  }

  function searchPager(params, page, pages) {
    if (pages <= 1) return '';
    const href = (n) => {
      const next = new URLSearchParams(params.toString());
      if (n > 1) next.set('page', String(n));
      else next.delete('page');
      return '/search?' + next.toString();
    };
    const nums = [];
    const from = Math.max(1, Math.min(page - 2, pages - 4));
    const to = Math.min(pages, from + 4);
    for (let n = from; n <= to; n += 1) nums.push(n);
    return (
      '<nav class="pagination" aria-label="' + esc(t('shop.pages')) + '">' +
      '<a class="page-btn page-step" href="' + href(Math.max(1, page - 1)) + '"' +
      (page === 1 ? ' aria-disabled="true" tabindex="-1"' : '') + '>' + esc(t('shop.prev')) + '</a>' +
      nums.map((n) => '<a class="page-btn' + (n === page ? ' is-active' : '') + '" href="' + href(n) + '"' +
        (n === page ? ' aria-current="page"' : '') + '>' + n + '</a>').join('') +
      '</nav>'
    );
  }

  function searchPage(opts) {
    const o = opts || {};
    const q = String(o.q || '').trim();
    const data = o.data;
    const params = o.params || new URLSearchParams();
    const items = (data && data.products) || [];
    const total = data ? data.total : 0;

    const form =
      '<form class="search-page-form" data-form="search" role="search">' +
      '<input class="input" type="search" name="q" value="' + esc(q) + '" placeholder="' +
      esc(t('shop.searchPlaceholder')) + '" aria-label="' + esc(t('shop.searchLabel')) + '" autocomplete="off" />' +
      '<button class="btn btn-primary" type="submit">' + esc(t('nav.search')) + icon('arrow') + '</button>' +
      '</form>';

    const popular =
      '<div class="search-page-chips"><span>' + esc(t('search.try')) + '</span>' +
      ['sofa', 'chair', 'dining table', 'bed', 'sideboard', 'desk']
        .map((term) => '<a class="pill" href="/search?q=' + encodeURIComponent(term) + '">' + esc(term) + '</a>')
        .join('') +
      '</div>';

    let body;
    if (!q) {
      body =
        '<div class="search-blank"><h2>' + esc(t('search.title')) + '</h2>' +
        '<p>' + esc(t('search.lede')) + '</p>' + form + popular +
        '<a class="link-arrow" href="/shop">' + esc(t('search.shopAll')) + icon('arrow') + '</a></div>';
    } else if (!items.length) {
      body =
        '<div class="search-blank"><p class="eyebrow">' + esc(t('search.title')) + '</p>' +
        '<h1>' + esc(t('search.emptyTitle')) + '</h1>' +
        '<p>' + esc(t('search.emptyBody')) + '</p>' + form + popular + '</div>';
    } else {
      body =
        '<div class="search-result-head"><div>' +
        '<p class="eyebrow">' + esc(t('search.title')) + '</p>' +
        '<h1>' + esc(t('search.resultsFor')) + ' “' + esc(q) + '”</h1></div>' +
        '<a class="btn btn-ghost btn-sm" href="/shop?q=' + encodeURIComponent(q) + '">' +
        icon('tools') + esc(t('shop.title')) + '</a></div>' +
        form +
        '<div class="gx-grid">' + items.map(card).join('') + '</div>' +
        searchPager(params, data.page, data.pages);
    }

    return (
      '<div class="wrap page-head search-page"><nav class="crumbs"><a href="/">' + esc(t('nav.home')) +
      '</a><span>/</span>' + esc(t('search.title')) + '</nav></div>' +
      '<div class="wrap search-page-body">' + body + '</div>'
    );
  }

  FF.views = FF.views || {};
  FF.views.shop = shop;
  FF.views.searchPage = searchPage;
  FF.views.skeleton = skeleton;
  FF.views.product = function (slug, loaded) {
    const p = loaded || FF.productBySlug(slug);
    if (!p) {
      if (!FF.hasCatalogue) return '<div class="wrap section"><p class="muted">' + esc(t('shop.loading')) + '</p></div>';
      return FF.views.notFound();
    }
    if (!U.state.pdp || U.state.pdp.slug !== p.slug) U.state.pdp = { slug: p.slug, color: 0, size: 0 };
    return pdp(p);
  };
})();
