/** Signup/login form parsing and validation. */

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/** Read a urlencoded or multipart form body, rejecting other content types. */
export async function readForm(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('application/x-www-form-urlencoded') && !type.includes('multipart/form-data')) {
    return null;
  }
  try {
    const form = await request.formData();
    const out = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return null;
  }
}

function text(form, key, max = 320) {
  const raw = form[key];
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, max);
}

export function validateSignup(form) {
  const values = {
    username: text(form, 'username', 60),
    email: text(form, 'email', 320),
    password: typeof form.password === 'string' ? form.password : '',
    confirm: typeof form.confirm === 'string' ? form.confirm : '',
  };
  const shown = { username: values.username, email: values.email };

  if (!values.username) {
    return { values: shown, field: 'username', error: 'Choose a username.' };
  }
  if (!USERNAME_RE.test(values.username)) {
    return {
      values: shown,
      field: 'username',
      error: 'Usernames are 3–30 characters: letters, numbers, dot, dash or underscore.',
    };
  }
  if (!values.email) {
    return { values: shown, field: 'email', error: 'Enter your email address.' };
  }
  if (!EMAIL_RE.test(values.email)) {
    return { values: shown, field: 'email', error: 'That does not look like an email address.' };
  }
  if (values.password.length < 8) {
    return { values: shown, field: 'password', error: 'Use a password with at least 8 characters.' };
  }
  if (values.password.length > 200) {
    return { values: shown, field: 'password', error: 'That password is too long (200 characters max).' };
  }
  if (values.password !== values.confirm) {
    return { values: shown, field: 'confirm', error: 'The two passwords do not match.' };
  }
  return { values: shown, field: null, error: null };
}

export function validateLogin(form) {
  const identifier = text(form, 'identifier', 320);
  const password = typeof form.password === 'string' ? form.password : '';
  const shown = { identifier };

  if (!identifier) return { values: shown, error: 'Enter your username or email.' };
  if (!password) return { values: shown, error: 'Enter your password.' };
  return { values: shown, error: null };
}
