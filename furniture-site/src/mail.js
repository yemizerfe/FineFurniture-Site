/**
 * Password-reset email.
 *
 * Mail goes out through Resend's HTTP API when RESEND_API_KEY and MAIL_FROM are
 * set on the deployment. Without them the reset endpoint says so plainly
 * instead of pretending a message was sent.
 */

export function mailConfigured(env) {
  return !!(env && env.RESEND_API_KEY && env.MAIL_FROM);
}

function textBody({ name, link, origin }) {
  return [
    `Hello${name ? ' ' + name : ''},`,
    '',
    'Someone asked to reset the password for this FineFurniture account.',
    'Open this link within one hour to choose a new password:',
    link,
    '',
    'If it was not you, ignore this message — the password stays as it is.',
    '',
    `FineFurniture, Debre Markos — ${origin}`,
  ].join('\n');
}

function htmlBody({ name, link, origin }) {
  const safeName = String(name || '').replace(/[<>&"]/g, '');
  const safeOrigin = String(origin || '').replace(/[<>&"]/g, '');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f2ea;font-family:Georgia,'Times New Roman',serif;color:#211914">
  <div style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e7ddcd;border-radius:16px;padding:28px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a7a68">FineFurniture</p>
    <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25">Choose a new password</h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6">Hello${safeName ? ' ' + safeName : ''}, someone asked to reset the password for this account.</p>
    <p style="margin:0 0 22px"><a href="${link}" style="display:inline-block;background:#2f5d50;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px">Choose a new password</a></p>
    <p style="margin:0 0 8px;font-size:13px;color:#6d5f50">The link works for one hour and only once.</p>
    <p style="margin:0;font-size:13px;color:#6d5f50">If it was not you, ignore this message — your password stays the same.</p>
  </div>
  <p style="max-width:520px;margin:14px auto 0;font-size:12px;color:#8a7a68;text-align:center">FineFurniture, Debre Markos · ${safeOrigin}</p>
</body></html>`;
}

export async function sendPasswordReset(env, { to, name, link, origin }) {
  if (!mailConfigured(env)) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [to],
        subject: 'Choose a new FineFurniture password',
        text: textBody({ name, link, origin }),
        html: htmlBody({ name, link, origin }),
      }),
    });
    if (!response.ok) {
      console.error('reset email failed', response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error('reset email error', error && error.message);
    return false;
  }
}
