const base='http://127.0.0.1:3000';
const fails=[]; const ok=(m)=>console.log('PASS',m); const bad=(m,d)=>{fails.push(m);console.log('FAIL',m,d||'')};
const get=async(p)=>fetch(base+p);
const catalogue=async(qs='')=>{const first=await (await get('/api/catalogue?per=200'+qs)).json();let products=first.products.slice();for(let page=2;page<=first.pages;page++){const j=await (await get('/api/catalogue?per=200&page='+page+qs)).json();products=products.concat(j.products);}return {...first,products};};
const all=await catalogue();
all.total===107?ok('total 107'):bad('total',all.total);
all.products.length===107?ok('all products returned across pages'):bad('pagination count',all.products.length);
new Set(all.products.map(p=>p.slug)).size===107?ok('unique slugs'):bad('unique slugs');
new Set(all.products.map(p=>p.name.en)).size===107?ok('unique names'):bad('unique names');
const cats=['sofas','chairs','tables','dining','bedroom','storage','office'];
const counts={};
for(const c of cats){const j=await catalogue('&cat='+c);counts[c]=j.total;if(j.products.length!==j.total)bad('category pagination '+c,j.products.length+'/'+j.total);if(j.products.some(p=>p.category!==c))bad('category '+c,'wrong item');if(!j.total)bad('category '+c,'empty');}
console.log('counts',counts);
Object.values(counts).reduce((a,b)=>a+b,0)===107?ok('category counts sum'):bad('category sum',JSON.stringify(counts));
for(const room of ['living','bedroom','dining','office']){const j=await catalogue('&room='+room);if(!j.total)bad('room '+room,'empty');if(j.products.some(p=>p.room!==room))bad('room '+room,'wrong item');console.log('room',room,j.total);}
const beds=await catalogue('&cat=bedroom');beds.products.every(p=>p.category==='bedroom')?ok('bedroom filter only beds'):bad('bedroom filter');
const search=await catalogue('&q=sofa');search.total>0?ok('search sofa '+search.total):bad('search');
let imgBad=[];let pageBad=[];let amBad=[];
for(const p of all.products){
  const img=await get(p.imageUrl);if(img.status!==200)imgBad.push(p.slug+':'+img.status);
  const page=await get('/product/'+p.slug);const html=await page.text();
  if(page.status!==200||!html.includes(p.name.en))pageBad.push(p.slug+':'+page.status);
  if(/\bETB\b|Br\s*\d/.test(html))bad('price on '+p.slug);
  if(p.tagline.am.includes('living room')||p.tagline.am.includes('office'))amBad.push(p.slug);
}
imgBad.length?bad('images 200',imgBad.slice(0,5).join(',')):ok('all 107 product images 200');
pageBad.length?bad('product pages',pageBad.slice(0,5).join(',')):ok('all 107 product pages render name');
amBad.length?bad('amharic taglines',amBad.slice(0,5).join(',')):ok('amharic taglines localised');
const sm=await get('/sitemap.xml');const xml=await sm.text();
const locs=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
locs.filter(u=>u.includes('/product/')).length===107?ok('sitemap 107 products'):bad('sitemap products',locs.filter(u=>u.includes('/product/')).length);
cats.every(c=>locs.some(u=>u.endsWith('/shop?cat='+c)))?ok('sitemap categories'):bad('sitemap categories');
sm.headers.get('content-type')?.includes('xml')?ok('sitemap xml type'):bad('sitemap content type',sm.headers.get('content-type'));
const rt=await (await get('/robots.txt')).text();rt.includes('Sitemap: http://127.0.0.1:3000/sitemap.xml')?ok('robots sitemap'):bad('robots',rt);
(await get('/admin')).status===404?ok('/admin 404'):bad('/admin status');
const contact=await (await get('/contact')).text();!/callback|data-form="callback"/i.test(contact)?ok('contact has no callback form'):bad('contact callback');
const shop=await (await get('/shop?cat=bedroom')).text();shop.includes('Fine Furniture')?ok('shop page renders'):bad('shop page');
console.log(fails.length?'FAILURES '+fails.join(' | '):'ALL LOCAL SMOKE CHECKS PASSED');
process.exit(fails.length?1:0);
