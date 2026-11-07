"""Real raster-only drawing PDFs for OCR tests; no hidden text or mock results."""
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

OUTPUT = Path(os.environ.get('OCR_FIXTURE_DIR', str(Path(os.environ['TEMP']) / 'hanwha-ocr-qa' / 'fixtures')))
OUTPUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 2400, 3000
FONT_DIR = Path('C:/Windows/Fonts')
def font(size, korean=False):
    return ImageFont.truetype(str(FONT_DIR / ('malgun.ttf' if korean else 'arial.ttf')), size)

def drawing(korean=False):
    image = Image.new('RGB', (WIDTH, HEIGHT), 'white')
    draw = ImageDraw.Draw(image)
    def text(x, y, value, size=38):
        draw.text((x, y), value, font=font(size, korean), fill='black')
    text(100, 80, 'OCR TRAINING DRAWING - IMAGE ONLY', 48)
    text(100, 170, 'UNITS: mm', 36)
    columns = [100, 330, 700, 1450, 1730]
    headers = ['ITEM', 'PART NO', 'DESCRIPTION', 'QTY', 'MATERIAL'] if not korean else ['항번', '품번', '품명', '수량', '재질']
    rows = [
        ['1', 'FLG-001', 'Flange', '2', 'AL6061'],
        ['2', 'BASE-002', 'Base Plate', '1', 'Steel'],
        ['3', 'BLT-003', 'Hex Bolt', '4', 'SUS304'],
    ] if not korean else [
        ['1', 'FLG-001', '플랜지', '2', '알루미늄'],
        ['2', 'BASE-002', '베이스판', '1', '탄소강'],
        ['3', 'BLT-003', '육각 볼트', '4', '스테인리스'],
    ]
    for x, value in zip(columns, headers): text(x, 340, value, 40)
    for index, row in enumerate(rows):
        for x, value in zip(columns, row): text(x, 470 + index * 130, value, 40)
    # Thin table rules, plus real linework outside the table.
    for y in [315, 430, 560, 690, 830]: draw.line((80, y, 2270, y), fill=(90, 90, 90), width=2)
    draw.rectangle((300, 1170, 1100, 1970), outline='black', width=4)
    draw.ellipse((400, 1270, 1000, 1870), outline='black', width=4)
    draw.ellipse((595, 1465, 805, 1675), outline='black', width=4)
    for x, y in [(490, 1360), (890, 1360), (490, 1760), (890, 1760)]:
        draw.ellipse((x-30, y-30, x+30, y+30), outline='black', width=3)
    for index, value in enumerate(['DIA 40 mm', 'R8', 'M8x1.25', '45°', '100 ±0.1 mm', '25 mm']):
        text(1370, 1120 + index * 160, value, 46)
    text(120, 2260, 'GENERAL NOTE: VERIFY ALL OCR VALUES AGAINST THIS IMAGE', 33)
    text(120, 2800, 'TRAINING TEST ONLY - NOT A MANUFACTURING RELEASE', 32)
    return image

def image_pdf(name, image, hybrid=False):
    filename = OUTPUT / name
    pdf = canvas.Canvas(str(filename), pagesize=(720, 900))
    if hybrid:
        # Page 1 has real vector text and must skip OCR.
        pdf.setFont('Helvetica', 13)
        vector_rows = ['UNITS: mm', 'PART NO = VECTOR-001', 'PART NAME = Vector test plate', 'QTY = 1', 'MATERIAL = Steel', 'SPEC = Native PDF text extraction must remain unchanged', '25 mm']
        for index, value in enumerate(vector_rows): pdf.drawString(60, 820-index*45, value)
        pdf.showPage()
        # Page 2 has selectable title/footer, while the main drawing is a scan.
        pdf.setFont('Helvetica', 12); pdf.drawString(25, 875, 'NATIVE TITLE - SCANNED DRAWING BELOW')
        pdf.drawImage(ImageReader(image), 20, 30, width=680, height=820)
        pdf.drawString(25, 15, 'NATIVE FOOTER - NOT A PART NUMBER')
    else:
        pdf.drawImage(ImageReader(image), 0, 0, width=720, height=900)
    pdf.save()
    return filename

english, korean = drawing(), drawing(True)
english.save(OUTPUT / 'scan-eng-source.png')
korean.save(OUTPUT / 'scan-kor-source.png')
files = [image_pdf('scan-bom-eng.pdf', english), image_pdf('scan-bom-kor.pdf', korean), image_pdf('mixed-scan.pdf', english, True), image_pdf('scan-empty.pdf', Image.new('RGB', (WIDTH, HEIGHT), 'white'))]
for filename in files:
    document = PdfReader(filename)
    texts = [page.extract_text().strip() for page in document.pages]
    if filename.name != 'mixed-scan.pdf': assert not any(texts), 'The scan fixture contains a hidden text layer'
    print(json.dumps({'file': str(filename), 'pages': len(document.pages), 'nativeTextLengths': list(map(len, texts))}, ensure_ascii=False))
