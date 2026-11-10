const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { fixture } = require('./verify-pdf-model-example.cjs');
const { makePdfFixture, token } = require('./verify-drawing-upload-dev.cjs');
const { makeClick } = require('./browser-ui-helpers.cjs');

const base = process.env.LIBRARY_TEST_URL;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-flange-library-qa-'));
const partNumber = 'FLG-' + randomBytes(3).toString('hex').toUpperCase();

function tokens(quantity) {
  return fixture().tokens.map((item) => ({
    ...item,
    text: item.text === 'FLG-001' ? partNumber : item.text === '1' && item.rect.x === .65 ? String(quantity) : item.text,
  }));
}
function pdf(name, pages) {
  const file = path.join(output, name + '.pdf');
  fs.writeFileSync(file, makePdfFixture(pages.length, pages));
  return file;
}
function modelMetadata(bytes) {
  assert.equal(bytes.subarray(0, 4).toString(), 'glTF');
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()).nodes[0].extras;
}

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Use a test server with a temporary PART_LIBRARY_DATA_DIR.');
  const first = pdf('flange-original', [tokens(1)]);
  const second = pdf('flange-reuse', [tokens(3), [token('REFERENCE DRAWING', .1, .1)]]);
  const sha = createHash('sha256').update(fs.readFileSync(first)).digest('hex');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const errors = [], publication = [], fetches = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().endsWith('/asset/flange') && response.request().method() === 'POST') publication.push(response.status());
      if (response.url().includes('?use=assembly')) fetches.push(response.url());
    });
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page);
    const upload = async (file) => {
      await page.goto(base + '/training/upload-dev', { waitUntil: 'networkidle0' });
      await (await page.waitForSelector('input[aria-label="분석할 PDF 선택"]')).uploadFile(file);
      await page.waitForSelector('[data-analysis-status="complete"]');
    };
    const edit = async (field, value) => {
      await page.click('input[aria-label="생성 ' + field + '"]');
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(String(value)); await page.keyboard.press('Tab');
    };
    const ready = async (count) => {
      await page.waitForSelector('[data-assembly-status="ready"]');
      await page.waitForSelector('[aria-label="조립품 3D 표시 영역"] canvas');
      assert.equal(await page.$$eval('[data-assembly-part]', (nodes) => nodes.length), count);
    };
    await upload(first);
    await page.waitForSelector('[data-flange-draft="' + partNumber + '"]');
    assert.deepEqual(publication, []);
    await click('이 PDF로 3D 생성');
    await page.waitForSelector('[data-model-status="draft"]');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find((node) => node.textContent === '라이브러리에 GLB 등록').disabled), true);
    await edit('외경', 120); await edit('두께', 12); await edit('볼트 구멍 개수', 6);
    await click('3D 다시 생성');
    assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 120 mm.*두께 12 mm.*볼트 구멍 6개/);
    await click('이 모델 검토 확정');
    await click('라이브러리에 GLB 등록');
    await click('등록하고 조립에 반영');
    await page.waitForSelector('#part-library-code');
    assert.deepEqual(publication, [401]);
    await page.type('#part-library-code', '0000');
    await click('관리자 코드 확인');
    await ready(1);
    assert.deepEqual(publication, [401, 200]);
    assert.equal(fetches.length, 1);
    const url = fetches[0];
    const asset = Buffer.from(await (await fetch(url)).arrayBuffer());
    const metadata = modelMetadata(asset);
    assert.equal(metadata.documentSha256, sha);
    assert.equal(metadata.part.partNumber, partNumber);
    assert.equal(metadata.reviewStatus, 'confirmed');
    assert.equal(metadata.parameters.outerDiameter, 120);
    assert.equal(metadata.parameters.thickness, 12);
    assert.equal(metadata.parameters.holeCount, 6);
    const centerZ = await page.$eval('[aria-label="선택 부품 실제 위치"]', (node) => Number(node.dataset.worldZ));
    assert.ok(Math.abs(centerZ - 6) < 1e-5, 'The loaded mesh uses the revised thickness');
    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.screenshot({ path: path.join(output, 'registered-flange-assembly.png') });

    await upload(second);
    await page.waitForSelector('[data-pdf-model-support="reused"]');
    assert.equal(await page.$$eval('[data-flange-draft]', (nodes) => nodes.length), 0);
    await click('라이브러리 3D 조립 · 3개');
    await ready(3);
    assert.deepEqual(fetches, [url, url], 'A different PDF reuses the exact same approved GLB');
    const addedNumber = partNumber + '-NEW';
    const mixed = pdf('one-existing-one-new', [tokens(2), tokens(1).map((item) => item.text === partNumber ? { ...item, text: addedNumber } : item)]);
    await upload(mixed);
    await page.waitForSelector('[data-flange-draft="' + addedNumber + '"]');
    assert.deepEqual(await page.$$eval('[data-flange-draft]', (nodes) => nodes.map((node) => node.dataset.flangeDraft)), [addedNumber]);
    await click('라이브러리 3D 조립 · 2개');
    await ready(2);
    const retained = 'lib:' + partNumber + ':1';
    await page.click('[data-assembly-part="' + retained + '"]');
    await page.click('input[aria-label="조립품 위치 X"]');
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.type('42');
    await click('조립품 저장');
    await click('도면 분석으로');
    await click('이 PDF로 3D 생성');
    await page.waitForSelector('[data-model-status="draft"]');
    await click('이 모델 검토 확정'); await click('라이브러리에 GLB 등록'); await click('등록하고 조립에 반영');
    await ready(3);
    await page.click('[data-assembly-part="' + retained + '"]');
    assert.equal(await page.$eval('input[aria-label="조립품 위치 X"]', (node) => node.value), '42', 'Adding a model must preserve saved transforms of existing parts');
    await upload(pdf('missing-thickness', [tokens(1).map((item) => item.text === partNumber ? { ...item, text: 'FLG-MISSING' } : item).filter((item) => !item.text.startsWith('THK'))]));
    await page.waitForSelector('[data-pdf-model-support="unsupported"]');
    assert.match(await page.$eval('[data-pdf-model-support]', (node) => node.textContent), /THK/);
    assert.equal(await page.$$eval('[data-flange-draft]', (nodes) => nodes.length), 0);
    assert.deepEqual(errors, []);
    console.log('PASS automatic draft, edited GLB 120 mm/12 mm/6 holes, PIN approval, current assembly, reuse in a different PDF (3 instances), mixed existing/new GLBs, saved placement preservation, missing-dimension hold');
    console.log('Screenshot: ' + path.join(output, 'registered-flange-assembly.png'));
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
