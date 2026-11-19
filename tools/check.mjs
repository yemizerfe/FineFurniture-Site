/**
 * Cheap production checks that need no browser: syntax, metadata plumbing,
 * price-free client code, image variants and cache-safe asset sizes.
 * Run with `npm test`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SHOWCASE } from '../src/showcase.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const ok = (label) => console.log('PASS ' + label);
const fail = (label, detail) => { failures.push(label + (detail ? ': ' + detail : '')); console.log('FAIL ' + label + (detail ? ' — ' + detail : '')); };

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|mjs)$/.test(entry.name)) files.push(full);
  }
};
walk(path.join(root, 'src'));
walk(path.join(root, 'public/assets/js'));
walk(path.join(root, 'tools'));
files.push(path.join(root, 'worker.js'));

let syntaxBad = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { syntaxBad++; console.log(result.stderr.split('\n').slice(0, 3).join('\n')); }
}
syntaxBad ? fail('javascript syntax', syntaxBad + ' file(s)') : ok('javascript syntax');

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('public/index.html');
if (html.includes('/assets/js/site.min.js') && html.includes('/assets/css/site.min.css')) ok('html uses built assets');
else fail('html uses built assets');

if (!/fonts\.googleapis|fonts\.gstatic/.test(html)) ok('no third-party fonts in html');
else fail('no third-party fonts in html');

const bundlePath = path.join(root, 'public/assets/js/site.min.js');
const bundle = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf8') : '';
if (bundle && !/\bETB\b|formatPrice|PRICE_BUCKETS/.test(bundle)) ok('client bundle has no prices');
else fail('client bundle has no prices');

const slugs = SHOWCASE.map((piece) => piece.slug);
let imageBad = 0;
let biggest = 0;
for (const piece of SHOWCASE) {
  const base = piece.image.replace(/-960\.webp$/, '');
  for (const suffix of ['-480.webp', '-960.webp']) {
    const file = path.join(root, 'public', base.replace(/^\//, '') + suffix);
    if (!fs.existsSync(file)) { imageBad++; continue; }
    biggest = Math.max(biggest, fs.statSync(file).size);
  }
}
imageBad ? fail('responsive image variants', imageBad + ' missing') : ok('responsive image variants (' + slugs.length + ' pieces)');
biggest < 380 * 1024 ? ok('largest gallery image ' + Math.round(biggest / 1024) + ' kB') : fail('largest gallery image', Math.round(biggest / 1024) + ' kB');

const manifest = read('public/site.webmanifest');
JSON.parse(manifest) ? ok('web manifest parses') : fail('web manifest parses');

const builtJs = fs.existsSync(path.join(root, 'public/assets/js/site.min.js'));
builtJs ? ok('built javascript exists') : fail('built javascript exists (run npm run build)');

if (!failures.length) {
  console.log('\nall checks passed');
  process.exit(0);
}
console.log('\n' + failures.length + ' failing check(s)');
process.exit(1);
