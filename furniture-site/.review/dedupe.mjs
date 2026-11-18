import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const dir = 'incoming';
const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
const rows = [];
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f));
  const meta = await sharp(buf).metadata();
  const { data } = await sharp(buf).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y*9+x] < data[y*9+x+1] ? '1' : '0';
  rows.push({ f, sha: crypto.createHash('sha1').update(buf).digest('hex'), w: meta.width, h: meta.height, bytes: buf.length, dhash: BigInt('0b'+bits).toString(16).padStart(16,'0') });
}
const hamming = (a,b) => { let x = BigInt('0x'+a) ^ BigInt('0x'+b), n=0; while(x){ n += Number(x & 1n); x >>= 1n; } return n; };
console.log('files', rows.length);
const seen = new Map();
for (const r of rows) { (seen.get(r.sha) || seen.set(r.sha, []).get(r.sha)).push(r.f); }
console.log('\nEXACT DUPLICATES');
for (const [sha, fs] of seen) if (fs.length > 1) console.log(fs.join('  ||  '));
console.log('\nNEAR DUPLICATES (dhash <= 6)');
for (let i=0;i<rows.length;i++) for (let j=i+1;j<rows.length;j++) {
  if (rows[i].sha === rows[j].sha) continue;
  const d = hamming(rows[i].dhash, rows[j].dhash);
  if (d <= 6) console.log(d, rows[i].f, '||', rows[j].f);
}
fs.writeFileSync('.review/incoming-index.json', JSON.stringify(rows, null, 2));
