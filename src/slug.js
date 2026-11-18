/** Slug helpers: turn a title into a URL-friendly, unique-enough slug. */

export function slugify(input) {
  const base = String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return base || 'untitled';
}

/**
 * Find a free slug, appending -2, -3, ... when the base is already taken.
 * `exists` is an async predicate so it can hit the database.
 */
export async function uniqueSlug(base, exists) {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let i = 2; i < 500; i += 1) {
    const candidate = `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now()}`;
}
