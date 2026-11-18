/** Bundle the Worker, inlining .mustache templates as strings. */
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  loader: { '.mustache': 'text' },
  legalComments: 'none',
  logLevel: 'info',
});
