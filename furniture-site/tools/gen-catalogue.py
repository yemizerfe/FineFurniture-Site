import urllib.parse, subprocess, time, os, json
base=("high-end furniture catalogue photograph of {desc}, full piece visible and centered, minimalist warm greige studio, "
      "seamless plaster wall, polished microcement floor, no other furniture, no decor, no plants, no artwork, no windows, "
      "no people, no text, no logo, soft directional daylight, gentle contact shadow, photorealistic, modern luxury Italian furniture")
items={
'vittoria-leather-sofa':"a low three-seat sofa in rich cognac full-grain leather with slender dark steel legs",
'gojjam-linen-sofa':"a deep three-seat sofa in warm sand washed linen with a low back and loose cushions",
'wollo-teal-velvet-sofa':"a low three-seat sofa in deep teal cotton velvet with slim brass feet",
'abay-tan-leather-sofa':"a long low three-seat sofa in tan cognac leather with wide saddle arms",
'hawassa-modular-sectional':"a low four-module sectional sofa in stone grey performance weave",
'debre-berhan-cream-sofa':"a two-seat sofa in cream washed linen with softly curved arms and a beech frame",
'cardoso-leather-lounge-chair':"a sculptural lounge chair in cognac leather with a solid walnut frame",
'choke-boucle-armchair':"a compact armchair in ivory boucle with a buttoned back and turned oak legs",
'degen-dining-chair':"a sculptural solid oak dining chair with a grey wool seat",
'addis-textile-chair':"an accent chair upholstered in hand-woven Ethiopian cotton with a bold geometric pattern and oak legs",
'entoto-ochre-armchair':"an upright armchair in ochre wool with a scooped seat and fine black steel legs",
'sodo-moulded-chair':"a single moulded shell dining chair in soft black with a solid oak base",
'harrar-boucle-chair':"a small occasional chair in cream boucle with a curved buttoned back and turned oak legs",
'wondo-lounge-chair':"a low lounge chair in hand-woven olive and rust textile with a solid oak frame",
'moyale-accent-chair':"a compact accent chair in burnt-rust velvet on a fine brass frame",
'markos-upholstered-bed':"a queen bed with a tall channel-tufted warm beige linen headboard and crisp white bedding",
'gonder-upholstered-bed':"a queen bed with a deep olive linen headboard and a low oak base, crisp white bedding",
'menagesha-tufted-bed':"a king bed with a tall hand-tufted camel linen headboard, crisp white bedding",
'bale-panel-bed':"a low platform bed in dark walnut with a paneled headboard and low footboard, white bedding",
'enkulal-oak-dining-table':"a long rectangular solid oak dining table with tapered legs",
'zway-round-dining-table':"a round pale oak dining table with a single pedestal base",
'tana-centre-table':"a round walnut centre table with a sculptural pedestal base",
'birhanu-writing-desk':"a minimal oak writing desk with two shallow drawers and slender tapered legs",
'lalibela-writing-desk':"a minimal oak writing desk with two soft-close drawers and a cable cut-out",
'milan-media-console':"a long low walnut media console with slatted doors and slim brass pulls",
'zege-wardrobe':"a three-door wardrobe in warm oak with fluted doors and slim brass handles",
'tana-sideboard':"a long low walnut sideboard with reeded doors and slim brass pulls",
'birhan-open-bookshelf':"a tall open oak bookshelf with adjustable shelves",
'yirga-alem-sideboard':"a long low blackened oak sideboard with reeded doors and slim brass pulls",
'gibe-shelving-unit':"a tall narrow open oak shelving unit with adjustable shelves",
}
out='image-sources/generated'; os.makedirs(out,exist_ok=True)
for i,(slug,d) in enumerate(items.items()):
    path=f'{out}/{slug}.jpg'
    if os.path.exists(path) and os.path.getsize(path)>20000:
        print('skip',slug,flush=True); continue
    p=base.format(desc=d); url='https://image.pollinations.ai/prompt/'+urllib.parse.quote(p)+f'?width=1400&height=1050&nologo=true&seed={1500+i}&model=flux'
    for a in range(5):
        r=subprocess.run(['curl','-sL','-m','120',url,'-o',path,'-w','%{http_code} %{size_download}'],capture_output=True,text=True)
        print(slug,a,r.stdout,flush=True)
        if r.stdout.startswith('200') and int(r.stdout.split()[1])>20000: break
        time.sleep(15)
    time.sleep(10)
print('DONE',flush=True)
