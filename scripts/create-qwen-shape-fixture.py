"""Build the unlabeled synthetic drawing used in the Qwen comparison."""
import sys
from math import cos, sin, tau
from pathlib import Path

from reportlab.pdfgen import canvas


def outline(sheet, points):
    path = sheet.beginPath()
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    path.close()
    sheet.drawPath(path)


def ring(sheet, holes=0):
    sheet.circle(310, 385, 122)
    sheet.circle(310, 385, 49 if holes else 70)
    for index in range(holes):
        angle = tau * index / holes + tau / 8
        sheet.circle(310 + 87 * cos(angle), 385 + 87 * sin(angle), 12)
    sheet.rect(188, 170, 244, 23 if holes else 8)


def hexagon(sheet, x, y, radius):
    outline(sheet, [(x + radius * cos(tau * i / 6), y + radius * sin(tau * i / 6)) for i in range(6)])


def bolt(sheet):
    sheet.rect(130, 322, 66, 96)
    sheet.rect(196, 342, 308, 56)
    for x in range(315, 498, 11):
        sheet.line(x, 342, x + 8, 398)
    sheet.line(146, 322, 146, 418)
    sheet.line(182, 322, 182, 418)
    hexagon(sheet, 164, 204, 51)


def nut(sheet):
    hexagon(sheet, 330, 385, 117)
    sheet.circle(330, 385, 62)
    sheet.arc(259, 314, 401, 456, 15, 295)
    sheet.rect(213, 153, 234, 64)
    sheet.line(244, 153, 244, 217)
    sheet.line(416, 153, 416, 217)
    sheet.setDash(5, 3)
    sheet.line(268, 153, 268, 217)
    sheet.line(392, 153, 392, 217)
    sheet.setDash()


def plate(sheet):
    sheet.rect(166, 279, 328, 212)
    for x in (193, 467):
        for y in (306, 464):
            sheet.circle(x, y, 12)
    sheet.rect(166, 194, 328, 17)


def shaft(sheet):
    outline(sheet, [(118, 345), (193, 345), (193, 328), (272, 328), (272, 311),
                    (408, 311), (408, 336), (537, 336), (537, 404), (408, 404),
                    (408, 429), (272, 429), (272, 412), (193, 412), (193, 395), (118, 395)])
    sheet.setDash(8, 4)
    sheet.line(99, 370, 561, 370)
    sheet.setDash()
    sheet.circle(327, 212, 44)


def bracket(sheet):
    outline(sheet, [(208, 236), (464, 236), (464, 268), (247, 268), (247, 464), (208, 464)])
    outline(sheet, [(247, 268), (400, 268), (247, 408)])
    sheet.rect(208, 140, 256, 51)
    for x in (278, 414):
        sheet.circle(x, 166, 12)


def detail(sheet, number, draw, name=""):
    sheet.setLineWidth(1.7)
    sheet.rect(18, 18, 764, 564)
    sheet.setFont("Helvetica", 14)
    sheet.drawString(36, 554, "SYNTHETIC VALIDATION DRAWING")
    sheet.drawString(36, 106, f"PART NO = {number}")
    if name:
        sheet.drawString(36, 84, f"PART NAME = {name}")
    sheet.drawString(36, 61, "QTY = 1")
    sheet.drawString(36, 37, "MATERIAL = Steel")
    draw(sheet)
    sheet.showPage()


def main():
    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet = canvas.Canvas(str(output), pagesize=(800, 600), invariant=1)
    sheet.setTitle("Synthetic shape-name comparison")
    for index, draw in enumerate((lambda s: ring(s, 4), bolt, nut, ring, plate, shaft), 1):
        detail(sheet, f"QA-{index:03}", draw)
    detail(sheet, "QA-007", bolt, "Hex cap screw")
    detail(sheet, "QA-008", bracket)
    detail(sheet, "QA-009", lambda s: None)

    # One multi-part page. The two rows do not identify the positions of the drawings.
    sheet.setFont("Helvetica", 12)
    for x, value in ((48, "ITEM"), (125, "PART NO"), (256, "DESCRIPTION"), (482, "QTY"), (602, "MATERIAL")):
        sheet.drawString(x, 550, value)
    for item, number, y in ((1, "QA-010", 526), (2, "QA-011", 502)):
        for x, value in ((48, str(item)), (125, number), (482, "1"), (602, "Steel")):
            sheet.drawString(x, y, value)
    sheet.circle(208, 320, 75)
    sheet.circle(208, 320, 35)
    sheet.rect(420, 244, 204, 148)
    sheet.showPage()
    sheet.save()


if __name__ == "__main__":
    main()
