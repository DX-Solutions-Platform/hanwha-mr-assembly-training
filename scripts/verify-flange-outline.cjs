const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { makePdfFixture, token } = require('./verify-drawing-upload-dev.cjs');
const { makeClick } = require('./browser-ui-helpers.cjs');

const base = process.env.LIBRARY_TEST_URL;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-outline-flange-qa-'));
const number = 'FLG-VIS-' + randomBytes(3).toString('hex').toUpperCase();

function circles(count, asymmetric = false) {
  return [[300, 375, 120], [300, 375, 42], ...Array.from({ length: count }, (_, index) => {
    const angle = (18 + 360 / count * index + (asymmetric && index === 0 ? 23 : 0)) * Math.PI / 180;
    return [300 + 83 * Math.cos(angle), 375 + 83 * Math.sin(angle), 8];
  })];
}
function pdfCircle([x, y, r]) {
  const k = r * .5522847498;
  return [
    [x + r, y, 'm'], [x + r, y + k, x + k, y + r, x, y + r, 'c'],
    [x - k, y + r, x - r, y + k, x - r, y, 'c'],
    [x - r, y - k, x - k, y - r, x, y - r, 'c'],
    [x + k, y - r, x + r, y - k, x + r, y, 'c'], ['h S'],
  ].map((row) => row.map((value) => typeof value === 'number' ? value.toFixed(4) : value).join(' ')).join('\n');
}
function vectorPdf(name, shape, texts = [], extraDrawing = '') {
  const file = path.join(output, name + '.pdf');
  fs.writeFileSync(file, makePdfFixture(1, [texts], ['1.6 w\n' + shape.map(pdfCircle).join('\n') + '\n' + extraDrawing]));
  return file;
}
async function rasterPdf(shape) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="white"/>' +
    shape.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + (800 - y) + '" r="' + r + '" fill="none" stroke="black" stroke-width="1.6"/>').join('') + '</svg>';
  const jpg = await sharp(Buffer.from(svg)).resize(1500, 2000).jpeg({ quality: 90 }).toBuffer();
  const stream = 'q 600 0 0 800 0 0 cm /Image Do Q';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /XObject << /Image 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
    '<< /Type /XObject /Subtype /Image /Width 1500 /Height 2000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n' + jpg.toString('latin1') + '\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
    return offset;
  });
  const xref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  const file = path.join(output, 'image-only-flange.pdf');
  fs.writeFileSync(file, pdf, 'latin1');
  return file;
}
const closeTo = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) < tolerance, actual + ' not near ' + expected);

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Use a test server with a temporary PART_LIBRARY_DATA_DIR.');
  const bare = vectorPdf('no-text-no-dimensions', circles(5));
  const raster = await rasterPdf(circles(6));
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page), errors = [], assetUrls = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.url().includes('?use=assembly')) assetUrls.push(response.url()); });
    const upload = async (file) => {
      await page.goto(base + '/training/upload?qwen=off', { waitUntil: 'networkidle0' });
      await (await page.waitForSelector('input[aria-label="분석할 PDF 선택"]')).uploadFile(file);
      await page.waitForSelector('[data-analysis-status=complete]');
    };
    const input = (field) => 'input[aria-label="생성 ' + field + '"]';
    const value = (field) => page.$eval(input(field), (node) => node.value);
    const edit = async (field, text) => {
      await page.click(input(field));
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(text); await page.keyboard.press('Tab');
    };
    const preview = async (holes) => {
      await page.waitForSelector('[data-outline-draft]');
      await click('윤곽 3D 미리보기');
      await page.waitForSelector('[data-model-status=proportional]');
      const canvas = await page.waitForSelector('[aria-label="생성된 플랜지 3D 표시 영역"] canvas');
      assert.equal(await value('볼트 구멍 개수'), String(holes));
      await page.waitForFunction(() => document.querySelector('canvas')?.width > 10);
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data, info } = await sharp(await canvas.screenshot()).raw().toBuffer({ resolveWithObject: true });
        let lit = 0;
        for (let index = 0; index < data.length; index += info.channels) {
          if (Math.min(data[index], data[index + 1], data[index + 2]) > 100) lit++;
        }
        if (lit > 5000) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error('The uncalibrated outline did not render a solid 3D preview.');
    };
    const assembly = async (count) => {
      await page.waitForSelector('[data-assembly-status=ready]');
      assert.equal(await page.$$eval('[data-assembly-part]', (nodes) => nodes.length), count);
    };
    await upload(bare); await preview(5);
    assert.equal(await value('외경'), ''); assert.equal(await value('두께'), '');
    closeTo(Number(await value('중앙 구멍 지름')), 35, 2);
    closeTo(Number(await value('볼트 구멍 중심원 지름')), 69.17, 2);
    await click('HOLE_COUNT 원문 위치 확인');
    await page.waitForSelector('[aria-label="검토 원문 강조 위치"]');
    await page.screenshot({ path: path.join(output, 'unscaled-outline.png') });
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find((node) => node.textContent === '라이브러리에 GLB 등록').disabled), true);
    await edit('외경', '150'); await edit('두께', '9');
    closeTo(Number(await value('중앙 구멍 지름')), 52.5, 3);
    closeTo(Number(await value('볼트 구멍 중심원 지름')), 103.75, 3);
    await click('3D 다시 생성');
    assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 150 mm.*두께 9 mm.*볼트 구멍 5개/);
    await click('부품 정보');
    assert.equal(await value('부품번호'), '');
    await edit('부품번호', number); await edit('재질', 'Steel'); await edit('수량', '2');
    await click('3D 다시 생성'); await click('이 모델 검토 확정');
    await click('라이브러리에 GLB 등록'); await click('등록하고 조립에 반영');
    await page.waitForSelector('#part-library-code');
    await page.type('#part-library-code', '0000'); await click('관리자 코드 확인');
    await assembly(2);
    const assetUrl = assetUrls[0];
    const asset = Buffer.from(await (await fetch(assetUrl)).arrayBuffer());
    const json = JSON.parse(asset.subarray(20, 20 + asset.readUInt32LE(12)).toString());
    const metadata = json.nodes[0].extras;
    assert.equal(metadata.generationMethod, 'outline-flange-from-pdf');
    assert.equal(metadata.part.partNumber, number);
    assert.equal(metadata.parameters.outerDiameter, 150);
    assert.equal(metadata.parameters.thickness, 9);
    assert.equal(metadata.parameters.holeCount, 5);
    await upload(bare);
    await page.waitForSelector('[data-pdf-model-support=reused]');
    await click('라이브러리 3D 조립 · 2개'); await assembly(2);

    const next = vectorPdf('same-number-new-quantity', circles(5), [token('PART NO = ' + number, .1, .1), token('PART NAME = Flange', .1, .14), token('QTY = 3', .1, .18), token('MATERIAL = Steel', .1, .22)]);
    await upload(next);
    await page.waitForSelector('[data-pdf-model-support=reused]');
    await click('라이브러리 3D 조립 · 3개'); await assembly(3);
    assert.deepEqual(assetUrls, [assetUrl, assetUrl, assetUrl]);

    await upload(raster); await preview(6);
    assert.equal(await value('외경'), '');
    const centerlines = vectorPdf('crossed-centerlines', circles(4), [], '1 w 150 375 m 450 375 l S 300 225 m 300 525 l S');
    await upload(centerlines); await preview(4);
    const partial = vectorPdf('ordinary-reference-dimension', circles(4), [token('OD = 160 mm', .1, .1)]);
    await upload(partial); await preview(4);
    assert.equal(await value('외경'), '160');
    assert.equal(await value('두께'), '');
    closeTo(Number(await value('중앙 구멍 지름')), 56, 3);
    await upload(vectorPdf('unsupported-irregular-pattern', circles(5, true)));
    await page.waitForSelector('[data-pdf-model-support=unsupported]');
    assert.equal(await page.$$eval('[data-outline-draft]', (nodes) => nodes.length), 0);
    assert.deepEqual(errors, []);
    console.log('PASS text-free vector and scan 3D previews, 5/6 bolt holes, source overlay, automatic size calibration, required-input guard, admin registration, same-PDF link restore, new-PDF quantity/reuse, irregular outline held');
    console.log('Screenshot: ' + path.join(output, 'unscaled-outline.png'));
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
