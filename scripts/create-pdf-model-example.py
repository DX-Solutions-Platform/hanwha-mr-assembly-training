"""Rebuild the synthetic, dimensioned PDF used by the editable PDF-to-3D example."""
from math import cos, sin, radians
from pathlib import Path
from shutil import copyfile
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "output/pdf/flange-model-example.pdf"
PUBLIC = ROOT / "public/examples/pdf-model/flange-model-example.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
PUBLIC.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUTPUT), pagesize=(800, 650), invariant=1)
c.setTitle("FLG-001 - Synthetic flange / PDF-to-3D example")
c.setAuthor("MR assembly training - synthetic demonstration")
ink, orange, grey = HexColor("#19262d"), HexColor("#b94c0b"), HexColor("#71808a")

def text(x, y, value, size=11, bold=False, color=ink):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, value)

def line(x1, y1, x2, y2, dashed=False):
    c.setStrokeColor(grey if dashed else ink)
    c.setLineWidth(.6 if dashed else .9)
    c.setDash(4, 3) if dashed else c.setDash()
    c.line(x1, y1, x2, y2)
    c.setDash()

c.setStrokeColor(ink)
c.rect(20, 20, 760, 610)
text(34, 608, "PDF TO 3D  /  FLANGE EXAMPLE", 18, True)
text(34, 588, "SYNTHETIC TRAINING DRAWING - NOT RELEASED FOR MANUFACTURE", 10, color=orange)
line(20, 574, 780, 574)
text(48, 550, "TOP VIEW", 12, True)
c.setStrokeColor(ink)
c.setLineWidth(1.1)
cx, cy, scale = 242, 361, 3
c.circle(cx, cy, 100 * scale / 2)
c.circle(cx, cy, 30 * scale / 2)
c.setDash(4, 3)
c.circle(cx, cy, 70 * scale / 2)
c.setDash()
for index in range(4):
    angle = radians(45 + index * 90)
    c.circle(cx + 105 * cos(angle), cy + 105 * sin(angle), 9 * scale / 2)
line(cx - 170, cy, cx + 170, cy, True)
line(cx, cy - 170, cx, cy + 170, True)
line(92, 201, 392, 201)
line(92, 197, 92, 212)
line(392, 197, 392, 212)
text(211, 185, "OD", 11, True)
line(288, 380, 432, 426)
text(435, 425, "ID", 11, True)
line(330, 437, 432, 480)
text(435, 479, "HOLE_D", 11, True)
text(48, 154, "SIDE VIEW", 12, True)
c.setStrokeColor(ink)
c.rect(92, 100, 300, 30)
line(197, 94, 197, 136, True)
line(287, 94, 287, 136, True)
line(411, 100, 411, 130)
line(404, 100, 419, 100)
line(404, 130, 419, 130)
text(425, 111, "THK", 11, True)
line(488, 90, 488, 574)
text(512, 548, "DIMENSION INPUTS", 12, True)
text(512, 527, "MODEL = FLANGE_V1", 11, bold=True, color=orange)
values = [("OD", "100 mm"), ("ID", "30 mm"), ("THK", "10 mm"),
          ("PCD", "70 mm"), ("HOLE_D", "9 mm"),
          ("HOLE_COUNT", "4"), ("START_ANGLE", "45 deg")]
for index, (label, value) in enumerate(values):
    text(512, 492 - index * 33, f"{label} = {value}", 13, True)
text(512, 234, "PCD: bolt-circle diameter", 11)
text(512, 213, "All holes are through-holes.", 11)
text(512, 192, "Hole pattern: equally spaced.", 11)
text(512, 171, "No threads, fillets or chamfers.", 11)
text(512, 140, "UNITS: mm", 11, True)
text(512, 119, "NOT TO SCALE  |  REV: EX-A  |  1/1", 10)
line(20, 85, 780, 85)
for x, label in [(34, "ITEM"), (87, "PART NO"), (235, "DESCRIPTION"), (562, "QTY"), (631, "MATERIAL")]:
    text(x, 68, label, 10, True)
line(20, 60, 780, 60)
for x, value in [(34, "1"), (87, "FLG-001"), (235, "Training flange"), (562, "1"), (631, "AL6061")]:
    text(x, 42, value, 11)
c.showPage()
c.save()
copyfile(OUTPUT, PUBLIC)
print(OUTPUT)
print(PUBLIC)
