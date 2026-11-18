import json, os, math
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader

ROOT=os.getcwd()
OUT=os.path.join(ROOT,'price-request-catalogue.pdf')
TMP=os.path.join(ROOT,'.review','pdf-thumbs')
os.makedirs(TMP,exist_ok=True)
items=json.load(open(os.path.join(ROOT,'.review','catalogue.json')))
ORDER=['sofas','chairs','dining','bedroom','tables','storage','office']
LABEL={'sofas':'Sofas & lounges','chairs':'Chairs & armchairs','dining':'Dining','bedroom':'Beds & bedroom','tables':'Tables & consoles','storage':'Cabinets & storage','office':'Office'}
ROOM={'living':'Living room','bedroom':'Bedroom','dining':'Dining room','office':'Office'}
INK=HexColor('#1c1a17'); MUTED=HexColor('#6f6a62'); LINE=HexColor('#d8d1c5'); CREAM=HexColor('#f6f1e8'); GOLD=HexColor('#a8763e')
W,H=A4
M=34
COLS,ROWS=3,3
PER=COLS*ROWS

groups={c:[p for p in items if p['category']==c] for c in ORDER}
page_counts={c:math.ceil(len(v)/PER) for c,v in groups.items()}
total_pages=1+1+sum(page_counts.values())

def thumb(p):
    key=p['slug']+'.jpg'; dest=os.path.join(TMP,key)
    if not os.path.exists(dest):
        im=Image.open(os.path.join(ROOT,p['image'])).convert('RGB')
        im.thumbnail((760,760),Image.LANCZOS)
        im.save(dest,'JPEG',quality=86,optimize=True)
    return dest

def wrap(c,text,font,size,maxw,maxlines=2):
    words=text.split(); lines=[]; cur=''
    for word in words:
        trial=(cur+' '+word).strip()
        if c.stringWidth(trial,font,size)<=maxw: cur=trial
        else:
            if cur: lines.append(cur)
            cur=word
    if cur: lines.append(cur)
    if len(lines)>maxlines:
        lines=lines[:maxlines]
        while lines and c.stringWidth(lines[-1]+'…',font,size)>maxw: lines[-1]=lines[-1][:-1]
        lines[-1]+='…'
    return lines

def footer(c,page):
    c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(M,26,W-M,26)
    c.setFont('Helvetica',7); c.setFillColor(MUTED)
    c.drawString(M,16,'Fine Furniture Debre Markos · 0920 282861 · Ex-showroom prices in ETB')
    c.drawRightString(W-M,16,f'Page {page} of {total_pages}')

def cover(c):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(INK); c.setFont('Helvetica-Bold',12)
    c.drawString(M,H-62,'FINE FURNITURE')
    c.setFont('Helvetica',8); c.setFillColor(MUTED)
    c.drawString(M,H-77,'DEBRE MARKOS · AMHARA · ETHIOPIA')
    c.setFillColor(INK); c.setFont('Helvetica-Bold',34)
    c.drawString(M,H-140,'Price request')
    c.drawString(M,H-176,'catalogue')
    c.setFont('Helvetica',11); c.setFillColor(MUTED)
    c.drawString(M,H-204,f'{len(items)} pieces · {len(ORDER)} categories · {os.popen("date +\"%d %B %Y\"").read().strip()}')
    c.setStrokeColor(GOLD); c.setLineWidth(2); c.line(M,H-222,M+72,H-222)
    c.setFillColor(INK); c.setFont('Helvetica',10)
    c.drawString(M,H-252,'Please quote the unit price in ETB, ex-showroom Debre Markos.')
    c.drawString(M,H-268,'Use the SKU printed under each photograph when you reply.')
    # photo strip
    picks=[p for p in items if p['slug'] in ('grey-curved-boucl-sectional','cream-cloud-bed','brown-curved-boucl-sofa','white-oval-dining-set','executive-desk-with-side-return','green-wardrobe')]
    if len(picks)<6: picks=items[:6]
    x0,y0=M,H-330; tw=(W-2*M-10*2)/3; th=150
    for i,p in enumerate(picks[:6]):
        col=i%3; row=i//3
        x=x0+col*(tw+10); y=y0-row*(th+12)
        c.setFillColor(white); c.rect(x,y-th,tw,th,fill=1,stroke=0)
        img=Image.open(thumb(p)); iw,ih=img.size; s=min((tw-10)/iw,(th-10)/ih)
        c.drawImage(thumb(p),x+(tw-iw*s)/2,y-th+(th-ih*s)/2,iw*s,ih*s,mask='auto')
    c.setFillColor(INK); c.setFont('Helvetica-Bold',10)
    c.drawString(M,130,'Fine Furniture Debre Markos')
    c.setFont('Helvetica',9); c.setFillColor(MUTED)
    c.drawString(M,115,'Ambasel Building 1st floor · in front of Shebel Hotel · Kebele 02, Debre Markos University building')
    c.drawString(M,101,'Telephone 0920 282861 · Monday to Saturday, 9:00–17:00')
    c.setFillColor(GOLD); c.setFont('Helvetica-Bold',9)
    c.drawString(M,82,'finefurniture')

def contents(c,page):
    c.setFillColor(white); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(INK); c.setFont('Helvetica-Bold',22); c.drawString(M,H-80,'What is inside')
    c.setFont('Helvetica',9); c.setFillColor(MUTED)
    c.drawString(M,H-100,'Every piece on the website, grouped by category. Write a price beside each item or reply by SKU.')
    y=H-145
    for cat in ORDER:
        n=len(groups[cat])
        c.setFillColor(INK); c.setFont('Helvetica-Bold',11); c.drawString(M,y,LABEL[cat])
        c.setFont('Helvetica',10); c.setFillColor(MUTED); c.drawRightString(W-M,y,f'{n} pieces')
        c.setStrokeColor(LINE); c.setLineWidth(.6); c.line(M,y-10,W-M,y-10)
        y-=38
    c.setFillColor(CREAM); c.rect(M,120,W-2*M,52,fill=1,stroke=0)
    c.setFillColor(INK); c.setFont('Helvetica-Bold',9); c.drawString(M+12,152,'How to quote')
    c.setFont('Helvetica',8.5); c.setFillColor(MUTED)
    c.drawString(M+12,138,'Price per piece in ETB · ex-showroom Debre Markos · lead time · minimum order, if any.')
    footer(c,page)

def section_page(c,cat,chunk,page,part,parts):
    c.setFillColor(white); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(GOLD); c.setFont('Helvetica-Bold',7.5)
    c.drawString(M,H-48,'FINE FURNITURE · PRICE REQUEST CATALOGUE')
    c.setFillColor(INK); c.setFont('Helvetica-Bold',20)
    c.drawString(M,H-76,LABEL[cat])
    c.setFont('Helvetica',8.5); c.setFillColor(MUTED)
    c.drawRightString(W-M,H-76,f'{len(groups[cat])} pieces · sheet {part} of {parts}')
    c.setStrokeColor(INK); c.setLineWidth(1); c.line(M,H-88,W-M,H-88)
    grid_top=H-104; grid_bottom=42
    cw=(W-2*M)/COLS; ch=(grid_top-grid_bottom)/ROWS
    for i,p in enumerate(chunk):
        col=i%COLS; row=i//COLS
        x=M+col*cw; y=grid_top-(row+1)*ch
        pad=8
        # image area
        img_path=thumb(p); img=Image.open(img_path); iw,ih=img.size
        maxw=cw-2*pad; maxh=ch-88
        s=min(maxw/iw,maxh/ih)
        c.setFillColor(HexColor('#faf8f4')); c.rect(x+pad,y+ch-maxh-16,maxw,maxh,fill=1,stroke=0)
        c.drawImage(img_path,x+pad+(maxw-iw*s)/2,y+ch-maxh-16+(maxh-ih*s)/2,iw*s,ih*s,mask='auto')
        ty=y+ch-maxh-30
        name=p['name']; fs=8.6
        lines=wrap(c,name,'Helvetica-Bold',fs,cw-2*pad,2)
        c.setFillColor(INK); c.setFont('Helvetica-Bold',fs)
        for line in lines:
            ty-=10.5; c.drawString(x+pad,ty,line)
        ty-=12
        c.setFont('Helvetica',7.2); c.setFillColor(MUTED)
        c.drawString(x+pad,ty,f"{p['sku']} · {LABEL[p['category']]}")
        ty-=10
        c.drawString(x+pad,ty,ROOM.get(p['room'],p['room']))
        # price line
        c.setStrokeColor(LINE); c.setLineWidth(.6); c.line(x+pad,y+12,x+cw-pad,y+12)
        c.setFont('Helvetica',7.5); c.setFillColor(MUTED); c.drawString(x+pad,y+3,'Price (ETB)')
        # separators
        if col<COLS-1:
            c.setStrokeColor(HexColor('#eee9e1')); c.line(x+cw,y+6,x+cw,y+ch-6)
    footer(c,page)

c=canvas.Canvas(OUT,pagesize=A4)
c.setTitle('Fine Furniture Debre Markos — Price request catalogue')
c.setAuthor('Fine Furniture Debre Markos')
c.setSubject('107 furniture pieces with SKUs and blank price fields')
cover(c); c.showPage()
page=2
contents(c,page); c.showPage(); page+=1
for cat in ORDER:
    chunks=[groups[cat][i:i+PER] for i in range(0,len(groups[cat]),PER)]
    for idx,chunk in enumerate(chunks,1):
        section_page(c,cat,chunk,page,idx,len(chunks)); c.showPage(); page+=1
c.save()
print('wrote',OUT,'pages',total_pages,'size',round(os.path.getsize(OUT)/1024/1024,2),'MB')
