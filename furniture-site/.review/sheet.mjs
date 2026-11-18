import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ids = `1648776 16825059 7546321 19064708 13086783 7214171 7045703 7045760 12284837 25447598 6434621 6434622 8135254 8135262 2168227 12277013 34984437 35888450 2883049 6963809 19878531 24245782 12991701 8082231 26556326 6903206 6466237 8135103 3144580 5531715 262048 2747901 14558366 5677020 6758282 37172003 7195598 8583876 22696776 39829291 36708202 5178045 33488358 22696775 1648778 7061662 6585754 6207818`.split(/\s+/);
fs.mkdirSync('/tmp/cand',{recursive:true});
const cellW=300, cellH=250, cols=6, top=26;
const imgs=[];
for(let i=0;i<ids.length;i++){
  const id=ids[i]; const file=`/tmp/cand/${id}.jpg`;
  try{
    if(!fs.existsSync(file)){
      const r=await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`,{headers:{'user-agent':'Mozilla/5.0'}});
      if(!r.ok) throw new Error('http '+r.status);
      fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));
    }
    const buf=await sharp(file).rotate().resize(cellW-12,cellH-top-12,{fit:'cover',position:'attention'}).jpeg({quality:78}).toBuffer();
    imgs.push({id,buf});
  }catch(e){ console.error('FAIL',id,e.message); }
}
const rows=Math.ceil(imgs.length/cols);
const sheet=sharp({create:{width:cols*cellW,height:rows*cellH,channels:3,background:'#f2ede5'}});
const comps=[];
imgs.forEach((it,i)=>{
  const x=(i%cols)*cellW, y=Math.floor(i/cols)*cellH;
  comps.push({input:it.buf,left:x+6,top:y+top});
  const svg=`<svg width="${cellW}" height="${top}"><text x="6" y="19" font-family="Arial" font-size="15" fill="#211914">${it.id}</text></svg>`;
  comps.push({input:Buffer.from(svg),left:x,top:y});
});
await sheet.composite(comps).jpeg({quality:80}).toFile('.review/candidates.jpg');
console.log('wrote',imgs.length,'of',ids.length);
