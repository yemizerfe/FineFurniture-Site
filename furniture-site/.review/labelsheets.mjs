import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const FONT={ '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'], '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'], '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'], '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'], '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'] };
function label(w,h,text){ const buf=Buffer.alloc(w*h*3,255); const s=3, tw=text.length*6*s, x=Math.floor((w-tw)/2), y=Math.floor((h-7*s)/2); for(let ci=0;ci<text.length;ci++){ const g=FONT[text[ci]]; if(!g) continue; for(let r=0;r<7;r++) for(let c=0;c<5;c++) if(g[r][c]==='1') for(let dy=0;dy<s;dy++) for(let dx=0;dx<s;dx++){ const px=x+ci*6*s+c*s+dx, py=y+r*s+dy; if(px>=0&&px<w&&py>=0&&py<h){ const i=(py*w+px)*3; buf[i]=17;buf[i+1]=17;buf[i+2]=17; } } } return buf; }
const uniq=fs.readFileSync('.review/unique.txt','utf8').trim().split('\n').map(l=>l.slice(4));
const W=260,H=210,LAB=36,COLS=5,ROWS=4,PER=COLS*ROWS;
for(let s=0;s*PER<uniq.length;s++){
  const chunk=uniq.slice(s*PER,(s+1)*PER); const tiles=[];
  for(let i=0;i<chunk.length;i++){
    const idx=s*PER+i+1;
    const img=await sharp(path.join('incoming',chunk[i])).resize(W,H-LAB,{fit:'cover'}).toBuffer();
    const lab=await sharp(label(W,LAB,String(idx)),{raw:{width:W,height:LAB,channels:3}}).png().toBuffer();
    tiles.push({input:img,left:(i%COLS)*W,top:Math.floor(i/COLS)*H});
    tiles.push({input:lab,left:(i%COLS)*W,top:Math.floor(i/COLS)*H+H-LAB});
  }
  await sharp({create:{width:W*COLS,height:H*ROWS,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(`.review/label-${s+1}.png`);
}
console.log('done',uniq.length);
