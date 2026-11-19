/* FineFurniture — side-by-side comparison of up to three pieces, for signed-in
 * shoppers. There are no prices in this table: it compares the things you can
 * judge in a showroom. */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const t = U.t;
  const L = U.L;
  const esc = U.esc;
  const icon = U.icon;

  const tx = (en, am) => (FF.getLang() === 'am' ? am : en);

  function materialsText(p) {
    if (!p.materials || !p.materials.length) return '—';
    return p.materials.map((m) => FF.materialName(m, FF.getLang())).join(', ');
  }

  function compare(products) {
    const list = (products || []).slice(0, 3);
    if (list.length < 2) {
      return (
        '<div class="wrap section compare-page"><nav class="crumbs"><a href="/">' + esc(t('nav.home')) +
        '</a><span>/</span>' + tx('Compare', 'ንጽጽር') + '</nav>' +
        '<div class="compare-empty">' + icon('compare') +
        '<h1>' + tx('Choose two pieces to compare', 'ለማነጻጸር ሁለት ዕቃዎች ይምረጡ') + '</h1>' +
        '<p class="lede">' + tx('Use the compare button on any piece. Your choice is saved to your account, so it is still here when you come back.', 'በማንኛውም ዕቃ ላይ የንጽጽር ቁልፉን ይጠቀሙ። ምርጫዎ በመግቢያዎ ስለሚቀመጥ በሚመለሱበት ጊዜ ያገኙታል።') + '</p>' +
        '<a class="btn btn-primary" href="/shop">' + esc(t('account.browse')) + icon('arrow') + '</a></div></div>'
      );
    }

    const row = (label, cells) =>
      '<tr><th scope="row">' + esc(label) + '</th>' + cells.map((c) => '<td>' + c + '</td>').join('') + '</tr>';

    return (
      '<div class="wrap section compare-page"><nav class="crumbs"><a href="/">' + esc(t('nav.home')) +
      '</a><span>/</span>' + tx('Compare', 'ንጽጽር') + '</nav>' +
      '<div class="compare-head"><div><p class="eyebrow">' + tx('Compare', 'ንጽጽር') + '</p>' +
      '<h1>' + tx('Side by side', 'ጎን ለጎን') + '</h1>' +
      '<p class="lede">' + tx('Materials, origin and availability, so the choice is about the room — not the label.', 'ቁሳቁስ፣ መነሻና አገኘት፤ ምርጫው ስለ ክፍሉ እንዲሆን እንጂ ስለ ስሙ አይደለም።') + '</p></div>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-act="compare-clear">' + tx('Clear', 'አጽዳ') + '</button></div>' +
      '<div class="compare-scroll"><table class="compare-table"><thead><tr><th></th>' +
      list
        .map(
          (p) =>
            '<th scope="col"><a class="cmp-head-card" href="/product/' + p.slug + '">' +
            '<span class="cmp-head-media">' + U.media(p) + '</span>' +
            '<strong>' + esc(L(p.name)) + '</strong></a></th>'
        )
        .join('') +
      '</tr></thead><tbody>' +
      row(tx('Collection', 'ስብስብ'), list.map((p) => esc(FF.categoryName(p.category, FF.getLang())))) +
      row(tx('Materials', 'ቁሳቁሶች'), list.map((p) => esc(materialsText(p)))) +
      row(tx('In the showroom', 'በሾውሩም'), list.map((p) => '<span class="cmp-stock' + (p.stock ? ' is-in' : '') + '">' +
        (p.stock ? tx('Yes', 'አዎ') : tx('Ask us', 'ይጠይቁን')) + '</span>')) +
      row(tx('Origin', 'መነሻ'), list.map((p) => esc(p.origin || '—'))) +
      row(
        '',
        list.map(
          (p) =>
            '<a class="btn btn-primary btn-sm" href="/product/' + p.slug + '">' + tx('View piece', 'ዕቃውን ይመልከቱ') + '</a>' +
            '<button class="cmp-remove" type="button" data-act="compare-toggle" data-slug="' + p.slug + '">' +
            tx('Remove', 'አስወግድ') + '</button>'
        )
      ) +
      '</tbody></table></div>' +
      '<p class="compare-note">' + icon('phone') + tx('Questions about a piece? Call the shop on 0920 282861 or visit any of the three showrooms.', 'ስለ ዕቃው ጥያቄ አለዎት? 0920 282861 ይደውሉ ወይም ሦስቱን ሾውሩሞች ይጎብኙ።') + '</p>' +
      '</div>'
    );
  }

  FF.views = FF.views || {};
  FF.views.compare = compare;
})();
