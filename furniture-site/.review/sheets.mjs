import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const dir = 'incoming';
const rows = JSON.parse(fs.readFileSync('.review/incoming-index.json','utf8'));
const files = rows.map(r=>r.f);
const seen = new Set();
const uniq = [];
for (const f of files) { const r = rows.find(x=>x.f===f); if (seen.has(r.sha)) continue; seen.add(r.sha); uniq.push(f); }
fs.writeFileSync('.review/unique.txt', uniq.map((f,i)=>`${String(i+1).padStart(3,'0')} ${f}`).join('\n'));
const W=300,H=240,COLS=5,ROWS=4,PER=COLS*ROWS;
for (let s=0;s*PER<uniq.length;s++) {
  const chunk=uniq.slice(s*PER,(s+1)*PER);
  const tiles=[];
  for (let i=0;i<chunk.length;i++) {
    const idx=s*PER+i+1;
    const img=await sharp(path.join(dir,chunk[i])).resize(W-16,H-48,{fit:'contain',background:'#f5f5f2'}).jpeg({quality:80}).toBuffer();
    const label=(idx+' '+chunk[i]).slice(0,52).replace(/&/g,'&amp;').replace(/</g,'&lt;');
    const svg=Buffer.from(`<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="${H-16}" font-family="sans-serif" font-size="13" fill="#111">${label}</text></svg>`);
    tiles.push({input:img,left:(i%COLS)*W+8,top:Math.floor(i/COLS)*H+8});
    tiles.push({input:svg,left:(i%COLS)*W,top:Math.floor(i/COLS)*H});
  }
  await sharp({create:{width:W*COLS,height:H*ROWS,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(`.review/incoming-sheet-${s+1}.png`);
  console.log('sheet',s+1,chunk.length);
}
