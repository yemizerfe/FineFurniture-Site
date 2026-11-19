/* FineFurniture — the shopper's private dashboard.
 *
 * /account is only reachable while signed in. Saved pieces, the comparison
 * shelf and recently viewed pieces are all stored against the account, so they
 * follow the shopper between devices.
 */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const t = U.t;
  const esc = U.esc;
  const icon = U.icon;
  const card = U.productCard;

  const tx = (en, am) => (FF.getLang() === 'am' ? am : en);

  function emptyState(iconName, title, body, href, cta) {
    return (
      '<div class="db-empty">' + icon(iconName) +
      '<h3>' + esc(title) + '</h3><p>' + esc(body) + '</p>' +
      (href ? '<a class="btn btn-primary btn-sm" href="' + href + '">' + esc(cta) + '</a>' : '') + '</div>'
    );
  }

  function menuLink(href, iconName, label, count, active) {
    return (
      '<a class="db-link' + (active ? ' is-active' : '') + '" href="' + href + '"' +
      (active ? ' aria-current="page"' : '') + '>' + icon(iconName) +
      '<span>' + esc(label) + '</span>' +
      (typeof count === 'number' ? '<em>' + count + '</em>' : '') + '</a>'
    );
  }

  function grid(items, emptyIcon, emptyTitle, emptyBody) {
    if (!items || !items.length) {
      return emptyState(emptyIcon, emptyTitle, emptyBody, '/shop', t('account.browse'));
    }
    return '<div class="gx-grid db-grid">' + items.map(card).join('') + '</div>';
  }

  function account(data) {
    const obj = data || {};
    const user = obj.user || (U.state.session || {});
    const wishlist = obj.wishlist || [];
    const recent = obj.recent || [];
    const compare = obj.compare || [];
    const tabs = ['overview', 'saved', 'compare', 'recent'];
    const tab = tabs.indexOf(obj.tab) > -1 ? obj.tab : 'overview';
    const initial = String(user.name || user.username || 'F').trim().charAt(0).toUpperCase();

    const side =
      '<aside class="db-side">' +
      '<a class="db-home" href="/" aria-label="' + tx('Home', 'መነሻ') + '" title="' + tx('Home', 'መነሻ') + '">' + icon('home') + '</a>' +
      '<div class="db-id"><span class="db-avatar" aria-hidden="true">' + esc(initial) + '</span>' +
      '<div><strong>' + esc(user.name || user.username) + '</strong>' +
      '<em>' + esc(user.email || user.username || '') + '</em></div></div>' +
      '<nav class="db-menu" aria-label="' + esc(t('account.menu')) + '">' +
      menuLink('/account', 'user', tx('Overview', 'አጠቃላይ'), null, tab === 'overview') +
      menuLink('/account?tab=saved', 'heart', tx('Saved', 'የተቀመጡ'), wishlist.length, tab === 'saved') +
      menuLink('/account?tab=compare', 'compare', tx('Compare', 'ንጽጽር'), compare.length, tab === 'compare') +
      menuLink('/account?tab=recent', 'clock', tx('Recently viewed', 'በቅርቡ የታዩ'), recent.length, tab === 'recent') +
      menuLink('/shop', 'sofa', tx('The gallery', 'ጋለሪ'), null, false) +
      '</nav>' +
      '<div class="db-side-foot">' +
      '<a class="btn btn-light btn-sm btn-block" href="/">' + icon('home') + tx('Back to the shop', 'ወደ ሱቁ ተመለስ') + '</a>' +
      '<button class="db-signout" type="button" data-act="signout">' + icon('logout') + esc(t('auth.signOut')) + '</button>' +
      '</div></aside>';

    let main = '';
    if (tab === 'saved') {
      main =
        '<header class="db-head"><h1>' + esc(t('account.tabSaved')) + '</h1>' +
        '<p>' + tx('Everything you saved, kept on your account. Tap a piece to see its page again.', 'ያስቀመጡት ሁሉ በመግቢያዎ ተቀምጧል። ገጹን እንደገና ለማየት ይጫኑ።') + '</p></header>' +
        grid(wishlist, 'heart', tx('Nothing saved yet', 'እስካሁን ምንም አልተቀመጠም'), tx('Tap the heart on any piece in the gallery and it will appear here.', 'በጋለሪው ውስጥ በልብ ምልክቱ ላይ ይጫኑ፤ እዚህ ይታያል።'));
    } else if (tab === 'compare') {
      main =
        '<header class="db-head"><h1>' + tx('Compare', 'ንጽጽር') + '</h1>' +
        '<p>' + tx('Up to three pieces, side by side. Dimensions, materials and finishes only — come and see the rest in person.', 'እስከ ሦስት ዕቃዎች ጎን ለጎን። መጠን፣ ቁሳቁስና ቀለም ብቻ — ቀሪውን በአካል ይመልከቱ።') + '</p></header>' +
        (compare.length >= 2
          ? '<div class="db-compare"><div class="db-compare-grid">' + compare.slice(0, 3).map(card).join('') + '</div>' +
            '<a class="btn btn-primary" href="/compare">' + icon('compare') + tx('Open the comparison', 'ንጽጽሩን ክፈት') + '</a></div>'
          : emptyState('compare', tx('Choose two pieces to compare', 'ለማነጻጸር ሁለት ዕቃዎች ይምረጡ'), tx('Use the compare button on any piece. Your list is saved to your account.', 'በማንኛውም ዕቃ ላይ የንጽጽር ቁልፉን ይጠቀሙ። ዝርዝሩ በመግቢያዎ ይቀመጣል።'), '/shop', t('account.browse')));
    } else if (tab === 'recent') {
      main =
        '<header class="db-head"><h1>' + esc(t('account.tabRecent')) + '</h1>' +
        '<p>' + tx('The last pieces you opened, so you do not have to find them twice.', 'በመጨረሻ የከፈቷቸው ዕቃዎች፤ ሁለት ጊዜ መፈለግ አያስፈልግም።') + '</p></header>' +
        grid(recent, 'clock', t('recent.title'), tx('Open any piece in the gallery and it will appear here.', 'በጋለሪው ውስጥ ያለውን ዕቃ ከከፈቱ እዚህ ይታያል።'));
    } else {
      main =
        '<header class="db-head"><p class="eyebrow">' + esc(t('account.signedInAs')) + ' ' + esc(user.email || user.username || '') + '</p>' +
        '<h1>' + esc(tx('Welcome back, ', 'እንኳን ደህና መጡ፣ ')) + esc(String(user.name || user.username || '').split(' ')[0]) + '.</h1>' +
        '<p>' + tx('Your saved pieces, your comparison shelf and the pieces you have already looked at — all in one place.', 'የተቀመጡ ዕቃዎችዎ፣ የንጽጽር ዝርዝርዎና ያዩአቸው ዕቃዎች — በአንድ ቦታ።') + '</p></header>' +
        '<div class="db-stats">' +
        '<a class="db-stat" href="/account?tab=saved"><span>' + wishlist.length + '</span><em>' + tx('saved pieces', 'የተቀመጡ') + '</em></a>' +
        '<a class="db-stat" href="/account?tab=compare"><span>' + compare.length + '</span><em>' + tx('in comparison', 'በንጽጽር') + '</em></a>' +
        '<a class="db-stat" href="/account?tab=recent"><span>' + recent.length + '</span><em>' + tx('recently viewed', 'በቅርቡ የታዩ') + '</em></a>' +
        '</div>' +
        '<section class="db-section"><div class="db-section-head"><h2>' + tx('Saved for later', 'ለበኋላ የተቀመጡ') + '</h2>' +
        '<a class="link-arrow" href="/account?tab=saved">' + tx('See all', 'ሁሉንም') + icon('arrow') + '</a></div>' +
        (wishlist.length
          ? '<div class="db-rail">' + wishlist.slice(0, 4).map(card).join('') + '</div>'
          : emptyState('heart', tx('Nothing saved yet', 'እስካሁን ምንም አልተቀመጠም'), tx('Tap the heart on any piece and it will be waiting here.', 'በማንኛውም ዕቃ ላይ ልቡን ይጫኑ፤ እዚህ ይጠብቅዎታል።'), '/shop', t('account.browse'))) +
        '</section>' +
        '<section class="db-section"><div class="db-section-head"><h2>' + tx('Recently viewed', 'በቅርቡ የታዩ') + '</h2>' +
        '<a class="link-arrow" href="/account?tab=recent">' + tx('See all', 'ሁሉንም') + icon('arrow') + '</a></div>' +
        (recent.length
          ? '<div class="db-rail">' + recent.slice(0, 6).map(card).join('') + '</div>'
          : emptyState('clock', tx('No pieces yet', 'እስካሁን ዕቃ የለም'), tx('Open any piece in the gallery and it will appear here.', 'በጋለሪው ውስጥ ያለውን ዕቃ ከከፈቱ እዚህ ይታያል።'), '/shop', t('account.browse'))) +
        '</section>' +
        '<section class="db-section db-compare"><div class="db-section-head"><h2>' + tx('Comparison', 'ንጽጽር') + '</h2></div>' +
        '<p>' + tx('Put two or three pieces side by side and compare the details that matter: dimensions, materials, finish.', 'ሁለት ወይም ሦስት ዕቃዎችን ጎን ለጎን አስቀምጠው ዋና ዋና ጉዳዮችን ያነጻጽሩ፡ መጠን፣ ቁሳቁስና ቀለም።') + '</p>' +
        '<a class="btn btn-ghost btn-sm" href="/compare">' + icon('compare') + tx('Open comparison', 'ንጽጽሩን ክፈት') + '</a></section>';
    }

    return (
      '<section class="db-hero"><div class="wrap db-hero-in">' +
      '<a class="db-hero-home" href="/" aria-label="' + tx('Home', 'መነሻ') + '">' + icon('home') + '</a>' +
      '<p class="eyebrow">' + tx('Your dashboard', 'የእርስዎ ዳሽቦርድ') + '</p>' +
      '<h1>' + esc(user.name || user.username) + '</h1>' +
      '<p class="db-sub">' + wishlist.length + ' ' + tx('saved', 'የተቀመጡ') + ' · ' + compare.length + ' ' + tx('to compare', 'ለንጽጽር') + '</p>' +
      '</div></section>' +
      '<div class="wrap db"><div class="db-grid-wrap">' + side + '<div class="db-main">' + main + '</div></div></div>'
    );
  }

  FF.views = FF.views || {};
  FF.views.account = account;
})();
