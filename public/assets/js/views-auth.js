/* FineFurniture — sign in, create account, forgot password, new password.
 *
 * Shoppers have two ways in: an email address and password, or Google.
 * Password reset is a one-hour, single-use link. There is no separate owner
 * login: the shop has no admin panel.
 */
(function () {
  'use strict';

  const FF = window.FF;
  const U = FF.U;
  const t = U.t;
  const esc = U.esc;
  const icon = U.icon;

  function field(name, label, type, hint, autocomplete, value) {
    return (
      '<label class="auth2-field"><span>' + esc(label) + '</span>' +
      '<input class="input" type="' + (type || 'text') + '" name="' + name + '"' +
      (type === 'password' ? ' required minlength="8"' : ' required') +
      ' autocomplete="' + (autocomplete || 'on') + '"' +
      (value ? ' value="' + esc(value) + '"' : '') + ' />' +
      (hint ? '<small class="auth2-hint">' + esc(hint) + '</small>' : '') + '</label>'
    );
  }

  function passwordField(name, label, hint, autocomplete) {
    return (
      '<label class="auth2-field"><span>' + esc(label) + '</span>' +
      '<span class="auth2-pass">' +
      '<input class="input" type="password" name="' + name + '" required minlength="8" autocomplete="' +
      (autocomplete || 'current-password') + '" />' +
      '<button class="auth2-eye" type="button" data-act="pw-toggle" aria-label="' + esc(t('auth.showPassword')) + '">' +
      icon('eye') + '</button></span>' +
      (hint ? '<small class="auth2-hint">' + esc(hint) + '</small>' : '') + '</label>'
    );
  }

  function googleMark() {
    return (
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
      '<path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"/>' +
      '<path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"/>' +
      '<path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z"/>' +
      '<path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"/></svg>'
    );
  }

  function googleButton(next, label) {
    return (
      '<a class="auth2-google" href="/api/auth/google' + (next ? '?next=' + encodeURIComponent(next) : '') + '">' +
      '<span class="auth2-google-mark">' + googleMark() + '</span>' +
      '<span>' + esc(label || t('auth.google')) + '</span></a>'
    );
  }

  function divider() {
    return '<div class="auth2-or"><span>' + esc(t('auth.or')) + '</span></div>';
  }

  function notice(code) {
    if (!code) return '';
    const info = { sent: 1, done: 1, 'google-cancelled': 1 }[code];
    const key = {
      sent: 'auth.resetSent',
      done: 'auth.resetDone',
      'google-unconfigured': 'auth.err.googleUnconfigured',
      'google-cancelled': 'auth.err.googleCancelled',
      'google-state': 'auth.err.googleFailed',
      'google-failed': 'auth.err.googleFailed',
      'google-email': 'auth.err.googleEmail',
      'google-busy': 'auth.err.googleBusy',
      expired: 'auth.err.resetExpired',
    }[code];
    if (!key) return '';
    return '<p class="auth2-notice ' + (info ? 'is-info' : 'is-bad') + '">' + icon(info ? 'check' : 'shield') + esc(t(key)) + '</p>';
  }

  function perks() {
    const item = (iconName, title, body) =>
      '<li><span class="auth2-perk-ico">' + icon(iconName) + '</span>' +
      '<span><strong>' + esc(title) + '</strong><em>' + esc(body) + '</em></span></li>';
    return (
      '<ul class="auth2-perks">' +
      item('heart', t('auth.p1Title'), t('auth.p1Body')) +
      item('clock', t('auth.p2Title'), t('auth.p2Body')) +
      item('compare', t('auth.p3Title'), t('auth.p3Body')) +
      '</ul>'
    );
  }

  function shell(inner, options) {
    const o = options || {};
    return (
      '<div class="auth2">' +
      '<aside class="auth2-aside">' +
      '<a class="auth2-brand" href="/">' +
      '<img src="/assets/img/logo.svg" alt="" width="46" height="46" />' +
      '<span><strong>' + esc(t('brand.name')) + '</strong><em>' + esc(t('brand.tagline')) + '</em></span></a>' +
      '<div class="auth2-copy">' +
      '<p class="eyebrow">' + esc(o.eyebrow || t('auth.title')) + '</p>' +
      '<h1>' + esc(o.headline || t('brand.name')) + '</h1>' +
      '<p class="auth2-intro">' + esc(o.intro || t('auth.lede')) + '</p>' +
      (o.perks === false ? '' : perks()) +
      '</div>' +
      '<div class="auth2-aside-foot">' +
      '<a href="tel:' + esc(U.P.phoneHref) + '">' + icon('phone') + esc(U.P.phone) + '</a>' +
      '<span>' + esc(t('brand.place')) + '</span>' +
      '</div></aside>' +
      '<main class="auth2-main"><div class="auth2-card">' + inner + '</div></main>' +
      '</div>'
    );
  }

  function signedIn(session) {
    return shell(
      '<p class="eyebrow">' + esc(t('nav.account')) + '</p>' +
      '<h2>' + esc(t('auth.welcome')) + '</h2>' +
      '<p class="auth2-name">' + esc(session.name || session.username) + '</p>' +
      '<p class="auth2-lede">' + esc(t('account.lede')) + '</p>' +
      '<div class="auth2-actions">' +
      '<a class="btn btn-primary btn-block" href="/account">' + esc(t('nav.dashboard')) + icon('arrow') + '</a>' +
      '<a class="btn btn-ghost btn-block" href="/shop">' + esc(t('account.browse')) + '</a>' +
      '<button class="auth2-signout" type="button" data-act="signout">' + icon('logout') + esc(t('auth.signOut')) + '</button>' +
      '</div>',
      { eyebrow: t('nav.account'), headline: t('auth.welcome'), perks: false }
    );
  }

  function authView(opts) {
    const o = opts || {};
    const session = o.session;
    if (session && session.signedIn) return signedIn(session);
    const mode = o.mode === 'register' ? 'register' : 'signin';
    const next = o.next || '';
    const withNext = next ? '?next=' + encodeURIComponent(next) : '';
    const switchHref = (mode === 'register' ? '/login' : '/register') + withNext;
    const canReset = !!(session && session.emailReset);
    const google = !!(session && session.googleSignIn);

    return shell(
      '<div class="auth2-tabs" role="tablist">' +
      '<a class="auth2-tab' + (mode === 'signin' ? ' is-active' : '') + '" role="tab" aria-selected="' +
      (mode === 'signin') + '" href="/login' + withNext + '">' + esc(t('auth.signin')) + '</a>' +
      '<a class="auth2-tab' + (mode === 'register' ? ' is-active' : '') + '" role="tab" aria-selected="' +
      (mode === 'register') + '" href="/register' + withNext + '">' + esc(t('auth.register')) + '</a></div>' +
      '<h2>' + esc(mode === 'register' ? t('auth.registerTitle') : t('auth.signinTitle')) + '</h2>' +
      '<p class="auth2-lede">' + esc(mode === 'register' ? t('auth.registerLede') : t('auth.signinLede')) + '</p>' +
      notice(o.notice) +
      (google
        ? googleButton(next) + divider()
        : '') +
      '<form data-form="' + mode + '" class="auth2-form" data-next="' + esc(next) + '" novalidate>' +
      (mode === 'register' ? field('name', t('auth.name'), 'text', '', 'name') : '') +
      field('email', t('auth.email'), 'email', mode === 'register' ? t('auth.emailHint') : '', 'email') +
      passwordField(
        'password',
        t('auth.password'),
        mode === 'register' ? t('auth.passwordHint') : '',
        mode === 'register' ? 'new-password' : 'current-password'
      ) +
      (mode === 'register' ? passwordField('confirm', t('auth.confirm'), '', 'new-password') : '') +
      '<p class="auth-error auth2-error-slot"></p>' +
      (mode === 'signin' && canReset
        ? '<p class="auth2-forgot"><a href="/forgot">' + esc(t('auth.forgot')) + '</a></p>'
        : '') +
      '<button class="btn btn-primary btn-block auth2-submit" type="submit">' +
      esc(mode === 'register' ? t('auth.register') : t('auth.signin')) + icon('arrow') + '</button>' +
      '</form>' +
      '<p class="auth2-switch">' +
      (mode === 'register' ? esc(t('auth.haveAccount')) : esc(t('auth.noAccount'))) + ' ' +
      '<a href="' + switchHref + '">' + esc(mode === 'register' ? t('auth.signin') : t('auth.register')) + '</a></p>' +
      '<p class="auth2-note">' + esc(t('auth.trust')) + '</p>',
      {
        eyebrow: t('auth.title'),
        headline: t('brand.tagline'),
        intro: t('auth.lede'),
      }
    );
  }

  function forgot(opts) {
    const o = opts || {};
    return shell(
      '<p class="eyebrow">' + esc(t('nav.account')) + '</p>' +
      '<h2>' + esc(t('auth.forgotTitle')) + '</h2>' +
      '<p class="auth2-lede">' + esc(t('auth.forgotLede')) + '</p>' +
      notice(o.notice) +
      '<form data-form="forgot" class="auth2-form" novalidate>' +
      field('email', t('auth.email'), 'email', '', 'email') +
      '<p class="auth-error auth2-error-slot"></p>' +
      '<button class="btn btn-primary btn-block auth2-submit" type="submit">' +
      esc(t('auth.forgotSubmit')) + icon('arrow') + '</button>' +
      '</form>' +
      '<p class="auth2-switch"><a href="/login">' + esc(t('auth.backToSignIn')) + '</a></p>' +
      '<p class="auth2-trust">' + icon('phone') + esc(t('showroom.b1.d')) + '</p>',
      { eyebrow: t('nav.account'), headline: t('auth.forgotTitle'), intro: t('auth.forgotLede'), perks: false }
    );
  }

  function reset(opts) {
    const o = opts || {};
    if (!o.token) {
      return shell(
        '<p class="eyebrow">' + esc(t('nav.account')) + '</p>' +
        '<h2>' + esc(t('auth.resetTitle')) + '</h2>' +
        '<p class="auth2-notice is-bad">' + icon('shield') + esc(t('auth.resetBad')) + '</p>' +
        '<a class="btn btn-primary btn-block" href="/forgot">' + esc(t('auth.askNew')) + icon('arrow') + '</a>' +
        '<p class="auth2-switch"><a href="/login">' + esc(t('auth.backToSignIn')) + '</a></p>',
        { eyebrow: t('nav.account'), headline: t('auth.resetTitle'), intro: t('auth.resetLede'), perks: false }
      );
    }
    return shell(
      '<p class="eyebrow">' + esc(t('nav.account')) + '</p>' +
      '<h2>' + esc(t('auth.resetTitle')) + '</h2>' +
      '<p class="auth2-lede">' + esc(t('auth.resetLede')) + '</p>' +
      '<form data-form="reset" class="auth2-form" data-token="' + esc(o.token) + '" novalidate>' +
      passwordField('password', t('auth.password'), t('auth.passwordHint'), 'new-password') +
      passwordField('confirm', t('auth.confirm'), '', 'new-password') +
      '<p class="auth-error auth2-error-slot"></p>' +
      '<button class="btn btn-primary btn-block auth2-submit" type="submit">' +
      esc(t('auth.resetSubmit')) + icon('arrow') + '</button>' +
      '</form>' +
      '<p class="auth2-switch"><a href="/login">' + esc(t('auth.backToSignIn')) + '</a></p>',
      { eyebrow: t('nav.account'), headline: t('auth.resetTitle'), intro: t('auth.resetLede'), perks: false }
    );
  }

  FF.views = FF.views || {};
  FF.views.auth = authView;
  FF.views.forgot = forgot;
  FF.views.reset = reset;
})();
