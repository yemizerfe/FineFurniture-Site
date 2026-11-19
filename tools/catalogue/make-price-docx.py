import json, os
from PIL import Image
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL, WD_ROW_HEIGHT_RULE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT=os.getcwd()
OUT=os.path.join(ROOT,'price-request-catalogue.docx')
TMP=os.path.join(ROOT,'tools','catalogue','print-jpgs')
items=json.load(open(os.path.join(ROOT,'tools','catalogue','catalogue.json')))
ORDER=['sofas','chairs','dining','bedroom','tables','storage','office']
LABEL={'sofas':'Sofas & lounges','chairs':'Chairs & armchairs','dining':'Dining','bedroom':'Beds & bedroom','tables':'Tables & consoles','storage':'Cabinets & storage','office':'Office'}
ROOM={'living':'Living room','bedroom':'Bedroom','dining':'Dining room','office':'Office'}
INK=RGBColor(0x1c,0x1a,0x17); MUTED=RGBColor(0x6f,0x6a,0x62); GOLD=RGBColor(0xa8,0x76,0x3e)

def shade(cell,hexcolor):
    tcPr=cell._tc.get_or_add_tcPr()
    shd=OxmlElement('w:shd'); shd.set(qn('w:val'),'clear'); shd.set(qn('w:color'),'auto'); shd.set(qn('w:fill'),hexcolor)
    tcPr.append(shd)

def margins(cell,top=60,bottom=60,left=90,right=90):
    tcPr=cell._tc.get_or_add_tcPr()
    mar=OxmlElement('w:tcMar')
    for name,val in [('top',top),('bottom',bottom),('start',left),('end',right)]:
        el=OxmlElement('w:'+name); el.set(qn('w:w'),str(val)); el.set(qn('w:type'),'dxa'); mar.append(el)
    tcPr.append(mar)

def row_flag(row,flag):
    trPr=row._tr.get_or_add_trPr(); el=OxmlElement('w:'+flag); el.set(qn('w:val'),'true'); trPr.append(el)

def no_split(row):
    trPr=row._tr.get_or_add_trPr(); el=OxmlElement('w:cantSplit'); trPr.append(el)

def page_field(paragraph):
    run=paragraph.add_run()
    fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE')
    run._r.addnext(fld)

doc=Document()
sec=doc.sections[0]
sec.top_margin=Inches(.55); sec.bottom_margin=Inches(.55); sec.left_margin=Inches(.55); sec.right_margin=Inches(.55)
doc.core_properties.title='Fine Furniture Debre Markos — Price request catalogue'
doc.core_properties.author='Fine Furniture Debre Markos'
doc.core_properties.subject='107 furniture pieces with SKUs and blank price fields'

style=doc.styles['Normal']; style.font.name='Calibri'; style.font.size=Pt(10)
style.element.rPr.rFonts.set(qn('w:eastAsia'),'Calibri')

p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(2)
r=p.add_run('FINE FURNITURE'); r.bold=True; r.font.size=Pt(11); r.font.color.rgb=INK
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(18)
r=p.add_run('DEBRE MARKOS · AMHARA · ETHIOPIA'); r.font.size=Pt(8); r.font.color.rgb=MUTED

p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(0)
r=p.add_run('Price request catalogue'); r.bold=True; r.font.size=Pt(30); r.font.color.rgb=INK
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(14)
r=p.add_run('107 pieces · 7 categories · 19 November 2026'); r.font.size=Pt(11); r.font.color.rgb=MUTED

p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(4)
r=p.add_run('Please quote the unit price in ETB, ex-showroom Debre Markos. Use the SKU in each row when you reply.'); r.font.size=Pt(10)
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(22)
r=p.add_run('This document is editable: type the price and lead time directly into the table, or reply by SKU. Each photograph is shown large, one item per row.'); r.font.size=Pt(9); r.font.color.rgb=MUTED

doc.add_page_break()

table=doc.add_table(rows=1,cols=4)
table.alignment=WD_TABLE_ALIGNMENT.CENTER
table.autofit=False
table.style='Table Grid'
widths=[Inches(3.10),Inches(2.10),Inches(1.10),Inches(1.10)]
for i,width in enumerate(widths): table.columns[i].width=width
hdr=table.rows[0]
for i,(cell,text) in enumerate(zip(hdr.cells,['Photo','Item / SKU','Price (ETB)','Lead time'])):
    cell.width=widths[i]; shade(cell,'1C1A17'); margins(cell,80,80,80,80)
    cell.vertical_alignment=WD_ALIGN_VERTICAL.CENTER
    para=cell.paragraphs[0]; para.alignment=WD_ALIGN_PARAGRAPH.LEFT
    run=para.add_run(text); run.bold=True; run.font.size=Pt(9); run.font.color.rgb=RGBColor(0xff,0xff,0xff)
row_flag(hdr,'tblHeader'); no_split(hdr)

for cat in ORDER:
    group=[p for p in items if p['category']==cat]
    if not group: continue
    row=table.add_row(); row.cells[0].merge(row.cells[3])
    cell=row.cells[0]; shade(cell,'F3EEE4'); margins(cell,90,80,90,80)
    para=cell.paragraphs[0]
    run=para.add_run(LABEL[cat]); run.bold=True; run.font.size=Pt(11); run.font.color.rgb=INK
    run=para.add_run('   ·   '+str(len(group))+' pieces'); run.font.size=Pt(9); run.font.color.rgb=MUTED
    no_split(row)
    for p in group:
        row=table.add_row(); no_split(row)
        row.height=Inches(2.85); row.height_rule=WD_ROW_HEIGHT_RULE.AT_LEAST
        cells=row.cells
        for i,c in enumerate(cells): c.width=widths[i]; margins(c,55,55,80,80)
        cells[0].vertical_alignment=WD_ALIGN_VERTICAL.CENTER
        para=cells[0].paragraphs[0]; para.alignment=WD_ALIGN_PARAGRAPH.CENTER
        img_path=os.path.join(TMP,p['sku']+'-'+p['slug']+'.jpg')
        with Image.open(img_path) as im: w,h=im.size
        if h>w:
            para.add_run().add_picture(img_path,height=Inches(2.55))
        else:
            para.add_run().add_picture(img_path,width=Inches(2.85))
        cells[1].vertical_alignment=WD_ALIGN_VERTICAL.CENTER
        para=cells[1].paragraphs[0]; para.paragraph_format.space_after=Pt(2)
        run=para.add_run(p['name']); run.bold=True; run.font.size=Pt(10); run.font.color.rgb=INK
        para2=cells[1].add_paragraph(); para2.paragraph_format.space_after=Pt(1)
        run=para2.add_run(p['sku']+' · '+LABEL[p['category']]); run.font.size=Pt(8.5); run.font.color.rgb=GOLD
        para3=cells[1].add_paragraph()
        run=para3.add_run(ROOM.get(p['room'],p['room'])); run.font.size=Pt(8.5); run.font.color.rgb=MUTED
        for c in cells[2:]:
            c.vertical_alignment=WD_ALIGN_VERTICAL.CENTER
            c.paragraphs[0].add_run('').font.size=Pt(10)

# footer
footer=sec.footer
fp=footer.paragraphs[0]
fp.text='Fine Furniture Debre Markos · 0920 282861 · Ex-showroom prices in ETB'
fp.alignment=WD_ALIGN_PARAGRAPH.LEFT
for run in fp.runs: run.font.size=Pt(7.5); run.font.color.rgb=MUTED
fp.add_run('\t\tPage ').font.size=Pt(7.5)
page_field(fp)

doc.save(OUT)
print('wrote',OUT,'size',round(os.path.getsize(OUT)/1024/1024,2),'MB')
