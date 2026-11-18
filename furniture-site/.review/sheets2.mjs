import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const dir='incoming';
const uniq=fs.readFileSync('.review/unique.txt','utf8').trim().split('\n').map(l=>l.slice(4));
const W=300,H=240,COLS=5,ROWS=4,PER=COLS*ROWS;
for(let s=0;s*PER<uniq.length;s++){
  const chunk=uniq.slice(s*PER,(s+1)*PER); const tiles=[];
  for(let i=0;i<chunk.length;i++){
    const img=await sharp(path.join(dir,chunk[i])).resize(W,H,{fit:'cover'}).jpeg({quality:82}).toBuffer();
    tiles.push({input:img,left:(i%COLS)*W,top:Math.floor(i/COLS)*H});
  }
  await sharp({create:{width:W*COLS,height:H*ROWS,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(`.review/sheet-${s+1}.png`);
}
console.log('done');
