/**
 * Turns an admin form payload into database values.
 *
 * The allow-list lives in the `fields` object below: a request can only ever
 * write these columns, and every value is validated before it reaches SQL.
 */
import {
  ApiError,
  BADGES,
  CATEGORY_IDS,
  MATERIAL_IDS,
  ROOM_IDS,
  STATUSES,
  STOCK_STATUSES,
  decimal,
  httpUrl,
  imageSource,
  integer,
  jsonArray,
  longText,
  oneOf,
  slugify,
  text,
} from './validate.js';

const SOCIAL_HOSTS = {
  social_tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
  social_facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch', 'web.facebook.com'],
  social_telegram: ['t.me', 'telegram.me', 'www.t.me'],
};

/** A link to the shop's own post about this piece, on one of its three channels. */
function socialUrl(value, field) {
  if (!value) return '';
  const url = httpUrl(value, field);
  if (!url) return '';
  const host = new URL(url).hostname.toLowerCase();
  if (!SOCIAL_HOSTS[field].includes(host)) {
    throw new ApiError(422, `${field} must be a link on that platform`, {
      [field]: `Use ${SOCIAL_HOSTS[field][0]}`,
    });
  }
  return url;
}

const ART_TYPES = ['sofa', 'armchair', 'bed', 'dining', 'chair', 'coffee', 'shelf', 'wardrobe', 'desk', 'console', 'sideboard'];

function colour(entry, i) {
  if (!entry || typeof entry !== 'object') throw new ApiError(422, 'Invalid colour', { colors: `Row ${i + 1} is invalid` });
  const nameEn = text(entry.name_en ?? entry.name?.en, { field: `colors[${i}].name_en`, max: 60, required: true });
  const nameAm = text(entry.name_am ?? entry.name?.am, { field: `colors[${i}].name_am`, max: 60 }) || nameEn;
  const hex = text(entry.hex, { field: `colors[${i}].hex`, max: 7, required: true });
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new ApiError(422, 'Invalid colour', { colors: `Row ${i + 1} needs a hex value` });
  return { id: slugify(entry.id || nameEn, 'colors'), name: { en: nameEn, am: nameAm }, hex };
}

function size(entry, i) {
  if (!entry || typeof entry !== 'object') throw new ApiError(422, 'Invalid size', { sizes: `Row ${i + 1} is invalid` });
  const labelEn = text(entry.label_en ?? entry.label?.en, { field: `sizes[${i}].label_en`, max: 80, required: true });
  const labelAm = text(entry.label_am ?? entry.label?.am, { field: `sizes[${i}].label_am`, max: 80 }) || labelEn;
  const delta = integer(entry.delta ?? 0, { field: `sizes[${i}].delta`, min: -1000000, max: 1000000 }) || 0;
  return { id: slugify(entry.id || labelEn, 'sizes'), label: { en: labelEn, am: labelAm }, delta };
}

function review(entry, i) {
  if (!entry || typeof entry !== 'object') throw new ApiError(422, 'Invalid review', { reviews: `Row ${i + 1} is invalid` });
  return {
    name: text(entry.name, { field: `reviews[${i}].name`, max: 80, required: true }),
    rating: integer(entry.rating ?? 5, { field: `reviews[${i}].rating`, min: 1, max: 5 }) || 5,
    text_en: text(entry.text_en ?? entry.text?.en, { field: `reviews[${i}].text_en`, max: 600 }),
    text_am: text(entry.text_am ?? entry.text?.am, { field: `reviews[${i}].text_am`, max: 600 }),
    date: text(entry.date, { field: `reviews[${i}].date`, max: 20 }),
  };
}

/**
 * Validates a complete product (existing values merged with the request) and
 * returns the DB column values.
 */
export function normaliseProduct(input, existing = null) {
  const value = (key, fallback) => (input[key] === undefined ? (existing ? existing[key] : fallback) : input[key]);

  const nameEn = text(value('name_en'), { field: 'name_en', max: 120, required: true });
  const nameAm = text(value('name_am'), { field: 'name_am', max: 160, required: true });
  const slug = input.slug !== undefined || !existing ? slugify(input.slug || nameEn) : existing.slug;
  const sku = text(value('sku'), { field: 'sku', max: 40, required: true }).toUpperCase();

  const price = integer(value('price'), { field: 'price', min: 1, max: 100000000, required: true });
  const compareAtRaw = value('compare_at');
  const compareAt = integer(compareAtRaw, { field: 'compare_at', min: 0, max: 100000000 });
  if (compareAt && compareAt <= price) {
    throw new ApiError(422, 'Compare-at price must be higher than the price', {
      compare_at: 'Must be higher than the price',
    });
  }

  const stockStatus = oneOf(value('stock_status'), STOCK_STATUSES, { field: 'stock_status', fallback: 'in_stock' });
  const stockQty = integer(value('stock_qty'), { field: 'stock_qty', min: 0, max: 100000 }) || 0;

  const art = value('art') && typeof value('art') === 'object' ? value('art') : {};
  const artType = ART_TYPES.includes(art.type) ? art.type : 'sofa';
  const artVariant = integer(art.variant ?? 1, { field: 'art.variant', min: 1, max: 6 }) || 1;

  const dims = value('dims') && typeof value('dims') === 'object' ? value('dims') : {};
  const dim = (k) => (dims[k] === '' || dims[k] === undefined || dims[k] === null ? null : decimal(dims[k], { field: `dims.${k}`, min: 0, max: 400 }));

  return {
    slug,
    sku,
    name_en: nameEn,
    name_am: nameAm,
    tagline_en: text(value('tagline_en'), { field: 'tagline_en', max: 160 }),
    tagline_am: text(value('tagline_am'), { field: 'tagline_am', max: 200 }),
    desc_en: longText(value('desc_en'), 'desc_en'),
    desc_am: longText(value('desc_am'), 'desc_am'),
    category: oneOf(value('category'), CATEGORY_IDS, { field: 'category', required: true }),
    room: oneOf(value('room'), ROOM_IDS, { field: 'room', fallback: '' }) || '',
    price,
    compare_at: compareAt,
    badge: oneOf(value('badge'), BADGES, { field: 'badge' }),
    stock_status: stockStatus,
    stock_qty: stockQty,
    lead_time_days: integer(value('lead_time_days'), { field: 'lead_time_days', min: 0, max: 365 }) ?? 3,
    origin: text(value('origin'), { field: 'origin', max: 60 }),
    art: JSON.stringify({ type: artType, variant: artVariant }),
    materials: JSON.stringify(
      jsonArray(value('materials') || [], { field: 'materials', max: 7 }).filter((m) => MATERIAL_IDS.includes(m))
    ),
    colors: JSON.stringify(jsonArray(value('colors') || [], { field: 'colors', max: 12, item: colour })),
    sizes: JSON.stringify(jsonArray(value('sizes') || [], { field: 'sizes', max: 8, item: size })),
    dims: JSON.stringify({ w: dim('w'), d: dim('d'), h: dim('h'), seat: dim('seat') }),
    weight: decimal(value('weight'), { field: 'weight', min: 0, max: 5000 }),
    rating: decimal(value('rating'), { field: 'rating', min: 0, max: 5 }),
    review_count: integer(value('review_count'), { field: 'review_count', min: 0, max: 100000 }) || 0,
    reviews: JSON.stringify(jsonArray(value('reviews') || [], { field: 'reviews', max: 30, item: review })),
    features: JSON.stringify(jsonArray(value('features') || [], { field: 'features', max: 12 })),
    care_en: longText(value('care_en'), 'care_en'),
    care_am: longText(value('care_am'), 'care_am'),
    image_url: imageSource(value('image_url'), 'image_url'),
    gallery: JSON.stringify(
      jsonArray(value('gallery') || [], { field: 'gallery', max: 8 }).map((url, i) => imageSource(url, `gallery[${i}]`)).filter(Boolean)
    ),
    status: oneOf(value('status'), STATUSES, { field: 'status', fallback: 'draft' }),
    featured: value('featured') ? 1 : 0,
    seo_title: text(value('seo_title'), { field: 'seo_title', max: 70 }),
    seo_desc: text(value('seo_desc'), { field: 'seo_desc', max: 170 }),
    social_tiktok: socialUrl(value('social_tiktok'), 'social_tiktok'),
    social_facebook: socialUrl(value('social_facebook'), 'social_facebook'),
    social_telegram: socialUrl(value('social_telegram'), 'social_telegram'),
  };
}
