"""Exports every catalogue product as one JPG, named by SKU, and builds a ZIP.

The JPG folder keeps the owner's original JPEG bytes (only renamed), so the
pack is the best available quality. The Word catalogue uses baseline JPEGs in
tools/catalogue/print-jpgs for maximum compatibility with Word.
"""
import json
import os
import shutil
import zipfile

from PIL import Image, ImageOps

ROOT = os.getcwd()
ITEMS = json.load(open(os.path.join(ROOT, 'tools', 'catalogue', 'catalogue.json')))
UPLOAD_MAP = {u['name']: u['file'] for u in json.load(open(os.path.join(ROOT, 'tools', 'catalogue', 'upload-map.json')))}
ORDER = ['sofas', 'chairs', 'dining', 'bedroom', 'tables', 'storage', 'office']

OUT_DIR = os.path.join(ROOT, 'furniture-images-jpg')
ZIP_PATH = os.path.join(ROOT, 'furniture-images-jpg.zip')
PRINT_DIR = os.path.join(ROOT, 'tools', 'catalogue', 'print-jpgs')

shutil.rmtree(OUT_DIR, ignore_errors=True)
shutil.rmtree(PRINT_DIR, ignore_errors=True)
os.makedirs(OUT_DIR)
os.makedirs(PRINT_DIR)

ordered = sorted(
    ITEMS,
    key=lambda p: (ORDER.index(p['category']), int(p['sku'].split('-')[-1])),
)

rows = []
for index, item in enumerate(ordered, 1):
    source = os.path.join(ROOT, 'incoming', UPLOAD_MAP[item['name']])
    filename = f"{index:03d}-{item['sku']}-{item['slug']}.jpg"
    target = os.path.join(OUT_DIR, filename)

    # Original upload: copy bytes, do not recompress.
    shutil.copy2(source, target)

    # Baseline JPEG for Word (progressive JPEGs are less portable in Word).
    with Image.open(source) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        save_args = dict(format='JPEG', quality=90, optimize=True, progressive=False, subsampling=0)
        icc = im.info.get('icc_profile')
        if icc:
            save_args['icc_profile'] = icc
        im.save(os.path.join(PRINT_DIR, f"{item['sku']}-{item['slug']}.jpg"), **save_args)

    rows.append({
        'file': filename,
        'sku': item['sku'],
        'name': item['name'],
        'category': item['category'],
        'room': item['room'],
    })

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for row in rows:
        zf.write(os.path.join(OUT_DIR, row['file']), arcname=f"furniture-images-jpg/{row['file']}")

print('jpg files', len(rows))
print('jpg folder MB', round(sum(os.path.getsize(os.path.join(OUT_DIR, r['file'])) for r in rows) / 1024 / 1024, 2))
print('zip MB', round(os.path.getsize(ZIP_PATH) / 1024 / 1024, 2))
print('print jpg MB', round(sum(os.path.getsize(os.path.join(PRINT_DIR, f)) for f in os.listdir(PRINT_DIR)) / 1024 / 1024, 2))
print('first', rows[0]['file'])
print('last', rows[-1]['file'])
