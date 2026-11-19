/**
 * Input validation and normalisation.
 *
 * Every field the admin may write is listed here explicitly (allow-list), so a
 * crafted request cannot set columns the form does not expose. Anything that is
 * not listed is dropped, never bound into SQL.
 */

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

export const CATEGORY_IDS = ['sofas', 'chairs', 'tables', 'dining', 'bedroom', 'storage', 'office'];
export const MATERIAL_IDS = ['solid-wood', 'linen', 'velvet', 'boucle', 'leather', 'rattan', 'oak'];
export const ROOM_IDS = ['living', 'bedroom', 'dining', 'office'];
export const STATUSES = ['draft', 'published', 'archived'];
export const STOCK_STATUSES = ['in_stock', 'low_stock', 'special_order', 'out_of_stock'];
export const BADGES = [null, 'new', 'bestseller', 'last_chance', 'clearance'];
export const ORDER_STATUSES = ['new', 'confirmed', 'ready', 'collected', 'cancelled'];
export const PAYMENT_STATUSES = ['unpaid', 'deposit_paid', 'paid', 'refunded'];
export const TRANSPORT = ['pickup', 'own_transport', 'quote_requested'];

const MAX_TEXT = 2000;
const MAX_LONG = 6000;

export function text(value, { field, max = MAX_TEXT, required = false, min = 0 } = {}) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw new ApiError(422, `${field} must be text`, { [field]: 'Must be text' });
  const v = value.trim();
  if (required && v.length < Math.max(1, min)) throw new ApiError(422, `${field} is required`, { [field]: 'Required' });
  if (v.length > max) throw new ApiError(422, `${field} is too long`, { [field]: `Max ${max} characters` });
  return v;
}

export function longText(value, field) {
  return text(value, { field, max: MAX_LONG });
}

export function integer(value, { field, min = 0, max = 100000000, required = false } = {}) {
  if (value === '' || value === null || value === undefined) {
    if (required) throw new ApiError(422, `${field} is required`, { [field]: 'Required' });
    return null;
  }
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[,\s]/g, ''));
  if (!Number.isFinite(n)) throw new ApiError(422, `${field} must be a number`, { [field]: 'Must be a number' });
  const i = Math.round(n);
  if (i < min || i > max) throw new ApiError(422, `${field} is out of range`, { [field]: `${min}–${max}` });
  return i;
}

export function decimal(value, { field, min = 0, max = 1000 } = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ApiError(422, `${field} must be a number`, { [field]: 'Must be a number' });
  if (n < min || n > max) throw new ApiError(422, `${field} is out of range`, { [field]: `${min}–${max}` });
  return Math.round(n * 100) / 100;
}

export function oneOf(value, allowed, { field, required = false, fallback = null } = {}) {
  if (value === '' || value === null || value === undefined) {
    if (required) throw new ApiError(422, `${field} is required`, { [field]: 'Required' });
    return fallback;
  }
  const v = String(value);
  if (!allowed.includes(v)) throw new ApiError(422, `${field} is not allowed`, { [field]: 'Invalid value' });
  return v;
}

export function slugify(value, field = 'slug') {
  const base = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(base)) {
    throw new ApiError(422, `${field} must be at least two characters of letters, numbers or dashes`, {
      [field]: 'Use letters, numbers and dashes',
    });
  }
  return base;
}

const MEDIA_PATH = /^\/media\/[a-z0-9-]{8,80}\.(jpg|jpeg|png|webp|avif)$/i;

/** An uploaded photo on this site (`/media/…`) or a full https:// address. */
export function imageSource(value, field) {
  const v = text(value, { field, max: 500 });
  if (!v) return null;
  if (MEDIA_PATH.test(v)) return v;
  return httpUrl(v, field);
}

export function httpUrl(value, field) {
  const v = text(value, { field, max: 500 });
  if (!v) return null;
  let url;
  try {
    url = new URL(v);
  } catch {
    throw new ApiError(422, `${field} must be a full URL`, { [field]: 'Use https://…' });
  }
  if (url.protocol !== 'https:') throw new ApiError(422, `${field} must use https`, { [field]: 'Must start with https://' });
  return url.toString();
}

export function jsonArray(value, { field, max = 40, item } = {}) {
  let arr = value;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      throw new ApiError(422, `${field} must be a list`, { [field]: 'Invalid list' });
    }
  }
  if (!Array.isArray(arr)) throw new ApiError(422, `${field} must be a list`, { [field]: 'Invalid list' });
  if (arr.length > max) throw new ApiError(422, `${field} has too many entries`, { [field]: `Max ${max}` });
  return arr.map((entry, i) => (item ? item(entry, i) : entry));
}

export function readJson(request, limit = 64 * 1024) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new ApiError(415, 'Expected application/json');
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > limit) throw new ApiError(413, 'Request body too large');
  return request.text().then((raw) => {
    if (raw.length > limit) throw new ApiError(413, 'Request body too large');
    try {
      const body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
      return body;
    } catch {
      throw new ApiError(400, 'Malformed JSON body');
    }
  });
}
