/**
 * Template rendering. Mustache is the template engine here: each page template
 * is injected as the `page` partial of the shared layout.
 *
 * Templates are compiled from strings that esbuild inlines at build time
 * (`.mustache` files are imported with the text loader), so no filesystem
 * access is needed at runtime.
 */
import Mustache from 'mustache';
import layout from '../views/layout.mustache';

export function renderPage(pageTemplate, data = {}) {
  return Mustache.render(layout, data, { page: pageTemplate });
}

export function formatDate(iso, fallback = 'unknown') {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  try {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function initials(username) {
  const clean = String(username || '?').replace(/[^a-zA-Z0-9]/g, '');
  return (clean.slice(0, 2) || '?').toUpperCase();
}
