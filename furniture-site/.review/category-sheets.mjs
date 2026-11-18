import fs from 'node:fs';
import sharp from 'sharp';
import { SHOWCASE } from '../src/showcase.js';
const uniq=fs.readFileSync('.review/unique.txt','utf8').trim().split('\n').map(l=>l.slice(4));
const FONT={ '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'], '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'], '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'], '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'], '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'] };
function label(w,h,text){const buf=Buffer.alloc(w*h*3,255);const s=3,tw=text.length*6*s,x=Math.floor((w-tw)/2),y=Math.floor((h-7*s)/2);for(let ci=0;ci<text.length;ci++){const g=FONT[text[ci]];if(!g)continue;for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(g[r][c]==='1')for(let dy=0;dy<s;dy++)for(let dx=0;dx<s;dx++){const px=x+ci*6*s+c*s+dx,py=y+r*s+dy;if(px>=0&&px<w&&py>=0&&py<h){const i=(py*w+px)*3;buf[i]=17;buf[i+1]=17;buf[i+2]=17;}}}return buf;}
const cats=['sofas','chairs','dining','bedroom','tables','storage'];
for(const cat of cats){
 const list=SHOWCASE.filter(p=>p.category===cat);
 const W=250,H=210,LAB=34,COLS=Math.min(6,list.length),ROWS=Math.ceil(list.length/COLS),tiles=[];
 for(let i=0;i<list.length;i++){
  const p=list[i]; const idx=uniq.indexOf(p.source.replace('/incoming/',''))+1;
  const img=await sharp('public'+p.image).resize(W,H-LAB,{fit:'cover'}).toBuffer();
  const lab=await sharp(label(W,LAB,String(idx).padStart(3,'0')),{raw:{width:W,height:LAB,channels:3}}).png().toBuffer();
  tiles.push({input:img,left:(i%COLS)*W,top:Math.floor(i/COLS)*H});
  tiles.push({input:lab,left:(i%COLS)*W,top:Math.floor(i/COLS)*H+H-LAB});
 }
 await sharp({create:{width:W*COLS,height:H*ROWS,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(`.review/cat-${cat}.png`);
 console.log(cat,list.length,`${COLS}x${ROWS}`);
}
