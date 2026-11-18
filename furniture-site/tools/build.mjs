/**
 * Reproducible production build:
 *   1. concatenate and minify the design sheets into one cached CSS file
 *   2. concatenate and minify the browser scripts into one deferred file
 *   3. bundle the Worker for Cloudflare
 * and print every output size (raw / gzip / brotli) so regressions are visible.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');

const CSS_FILES = [
  'assets/css/fonts.css',
  'assets/css/styles.css',
  'assets/css/next.css',
  'assets/css/responsive.css',
];
const JS_FILES = [
  'assets/js/i18n.js',
  'assets/js/images.js',
  'assets/js/products.js',
  'assets/js/ui.js',
  'assets/js/views-home.js',
  'assets/js/views-shop.js',
  'assets/js/views-editorial.js',
  'assets/js/views-pages.js',
  'assets/js/views-auth.js',
  'assets/js/views-account.js',
  'assets/js/views-compare.js',
  'assets/js/app.js',
];

const missing = CSS_FILES.concat(JS_FILES).filter((f) => !fs.existsSync(path.join(pub, f)));
if (missing.length) {
  console.error('Missing source files:\n' + missing.join('\n'));
  process.exit(1);
}

const concat = (files) =>
  files
    .map((f) => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(pub, f), 'utf8'))
    .join('\n');

const cssSource = concat(CSS_FILES);
const css = await transform(cssSource, { loader: 'css', minify: true, charset: 'utf8' });
fs.writeFileSync(path.join(pub, 'assets/css/site.min.css'), css.code);
const cssVersion = crypto.createHash('sha256').update(css.code).digest('hex').slice(0, 8);

const jsSource = concat(JS_FILES);
const js = await transform(jsSource, { loader: 'js', minify: true, target: 'es2020', charset: 'utf8' });
fs.writeFileSync(path.join(pub, 'assets/js/site.min.js'), js.code);
const jsVersion = crypto.createHash('sha256').update(js.code).digest('hex').slice(0, 8);

await build({
  entryPoints: [path.join(root, 'worker.js')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: path.join(root, 'dist/worker.js'),
  logLevel: 'silent',
});

const report = (label, file) => {
  const bytes = fs.readFileSync(file);
  const gzip = zlib.gzipSync(bytes, { level: 9 }).length;
  const brotli = zlib.brotliCompressSync(bytes).length;
  console.log(
    `${label.padEnd(18)} ${(bytes.length / 1024).toFixed(1).padStart(7)} kB raw  ` +
      `${(gzip / 1024).toFixed(1).padStart(6)} kB gzip  ${(brotli / 1024).toFixed(1).padStart(6)} kB br`
  );
};

report('site.min.css', path.join(pub, 'assets/css/site.min.css'));
report('site.min.js', path.join(pub, 'assets/js/site.min.js'));
report('dist/worker.js', path.join(root, 'dist/worker.js'));

const indexPath = path.join(pub, 'index.html');
const html = fs
  .readFileSync(indexPath, 'utf8')
  .replace(/\/assets\/css\/site\.min\.css(?:\?v=[^"']*)?/g, `/assets/css/site.min.css?v=${cssVersion}`)
  .replace(/\/assets\/js\/site\.min\.js(?:\?v=[^"']*)?/g, `/assets/js/site.min.js?v=${jsVersion}`);
if (!html.includes('/assets/css/site.min.css') || !html.includes('/assets/js/site.min.js')) {
  console.error('index.html does not reference the built assets.');
  process.exit(1);
}
fs.writeFileSync(indexPath, html);
console.log('build complete');
