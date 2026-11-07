const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const puppeteer = require('puppeteer');
const { makeClick } = require('./browser-ui-helpers.cjs');
const { makePdfFixture, token } = require('./verify-drawing-upload-dev.cjs');

const base = process.env.LIBRARY_TEST_URL;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-part-library-browser-'));
const suffix = randomBytes(3).toString('hex').toUpperCase();
const number = 'LIB-084-' + suffix;
const other = 'LIB-009-' + suffix;
const fixture = (name, partNumber, quantity, originalName = '', material = '') => {
  const filename = path.join(directory, name + '.pdf');
  const row = [
    token('ITEM', .06, .12), token('PART NO', .15, .12), token('DESCRIPTION', .32, .12), token('QTY', .62, .12), token('MATERIAL', .76, .12),
    token('1', .07, .16), token(partNumber, .15, .16), token(quantity, .63, .16),
    ...(originalName ? [token(originalName, .32, .16)] : []),
    ...(material ? [token(material, .76, .16)] : []),
  ];
  fs.writeFileSync(filename, makePdfFixture(1, [row]));
  return filename;
};

async function verifyUpload(page, filename) {
  const click = makeClick(page);
  await page.goto(base + '/training/upload?qwen=off', { waitUntil: 'networkidle0' });
  const input = await page.waitForSelector('input[aria-label="분석할 PDF 선택"]');
  await input.uploadFile(filename);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => !button.disabled && button.textContent === '부품 검토·보정'));
  await click('부품 검토·보정');
  await page.waitForSelector('[aria-label="검토 품명"]');
  return click;
}

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Set LIBRARY_TEST_URL to an isolated server using a temporary PART_LIBRARY_DATA_DIR.');
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', (error) => errors.push({ url: page.url(), message: error.message }));
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page);
    const value = (selector) => page.$eval(selector, (node) => node.value);
    const status = async (url, options) => (await fetch(base + '/api/part-library' + url, options)).status;
    assert.equal(await status(''), 401);
    assert.equal(await status('', { method: 'POST' }), 401);
    assert.equal(await status('/asset/model', { method: 'PUT' }), 401);
    await page.goto(base + '/?view=start', { waitUntil: 'networkidle0' });
    await page.click('a[href="/part-library"]');
    await page.waitForSelector('#part-library-code');
    await page.type('#part-library-code', '7777');
    await click('관리자 코드 확인');
    await page.waitForFunction(() => document.querySelector('[role=alert]')?.textContent.includes('맞지 않습니다'));
    await page.$eval('#part-library-code', (input) => input.select());
    await page.keyboard.type('0000');
    await click('관리자 코드 확인');
    await page.waitForSelector('[aria-label="부품 목록"]');
    await click('+ 부품 등록');
    await page.type('#library-partNumber', number);
    await page.type('#library-name', 'Catalog flange');
    await page.type('#library-material', 'S45C');
    await page.type('#library-specification', 'D24');
    await page.type('#library-source', 'Independent BOM');
    await page.type('#library-dimensions', '24 | mm');
    await click('부품 저장');
    await page.waitForSelector('[data-library-number="' + number + '"]');
    const lookup = async () => (await (await fetch(base + '/api/part-library/lookup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numbers: [number, number.toLowerCase(), '0' + number] }),
    })).json()).matches;
    assert.deepEqual(await lookup(), [], 'Pending records must not autofill');
    await click('부품 정보 수정');
    await page.select('#library-status', 'approved');
    await click('부품 저장');
    await page.waitForFunction((partNumber) => document.querySelector('[data-library-number="' + partNumber + '"] td:nth-child(7)')?.textContent === '승인', {}, number);
    const stored = await lookup();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].name, 'Catalog flange');
    const [modelResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/asset/model?') && response.request().method() === 'PUT'),
      (await page.$('input[aria-label="GLB 모델 선택"]')).uploadFile(path.resolve('public/models/hammer.glb')),
    ]);
    assert.equal(modelResponse.status(), 200);
    await page.waitForSelector('[data-library-model-ready]');
    const modelKey = await page.evaluate(async (partNumber) => {
      const { parts } = await (await fetch('/api/part-library')).json();
      return parts.find((part) => part.partNumber === partNumber).model.key;
    }, number);
    const modelPath = '/api/part-library/asset/' + modelKey;
    assert.equal(await page.evaluate(async (url) => (await fetch(url)).status, modelPath), 200);
    assert.equal((await fetch(base + modelPath)).status, 401);
    await click('3D 진열');
    await click('목록');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 350)));
    await page.screenshot({ path: path.join(directory, 'library-desktop.png') });
    for (const width of [1280, 780, 390]) {
      await page.setViewport({ width, height: 900 });
      assert.equal(await page.evaluate(() => {
        const root = document.querySelector('main');
        return document.documentElement.scrollWidth > innerWidth || root.scrollWidth > root.clientWidth;
      }), false, 'Horizontal overflow at ' + width);
    }
    await page.setViewport({ width: 1920, height: 1080 });
    await click('잠금');
    await page.waitForSelector('#part-library-code');
    assert.equal(await page.evaluate(async () => (await fetch('/api/part-library')).status), 401);
    console.log('PASS library PIN, approval, exact-number lookup, GLB, responsive layout and logout');

    const fresh = fixture('different-drawing', number, '7');
    const review = await verifyUpload(page, fresh);
    assert.equal(await value('#review-name'), 'Catalog flange');
    assert.equal(await value('#review-quantity'), '7');
    assert.equal(await value('#review-material'), 'S45C');
    assert.equal(await value('#review-specification'), 'D24');
    assert.match(await page.$eval('[data-library-source]', (node) => node.textContent), /LIB-084/);
    await review('치수 1');
    assert.equal(await value('[aria-label="검토 치수 1 값"]'), '24');
    await review('이 부품 검토 확정');
    await review('검토 결과 저장');
    await verifyUpload(page, fresh);
    assert.equal(await value('#review-name'), 'Catalog flange');
    assert.equal(await page.$eval('[data-review-status]', (node) => node.dataset.reviewStatus), 'confirmed');
    const preserved = fixture('drawing-with-own-values', number, '3', 'Original part', 'Aluminum');
    await verifyUpload(page, preserved);
    assert.equal(await value('#review-name'), 'Original part');
    assert.equal(await value('#review-material'), 'Aluminum');
    assert.equal(await value('#review-quantity'), '3');

    const publish = await verifyUpload(page, fixture('publish-from-review', other, '2', 'Saved sleeve', 'Bronze'));
    await publish('치수 0');
    await page.click('[aria-label="원문에 치수 없음 확인"]');
    await publish('이 부품 검토 확정');
    await publish('확정 부품 라이브러리에 등록');
    await publish('등록하기');
    await page.waitForSelector('#part-library-code');
    await page.type('#part-library-code', '0000');
    await publish('관리자 코드 확인');
    await page.waitForFunction(() => document.querySelector('dialog')?.textContent.includes('등록 1종 · 기존 등록 0종'));
    await page.click('dialog a[href="/part-library"]');
    await page.waitForSelector('[data-library-number="' + other + '"]');
    assert.deepEqual(errors, []);
    console.log('PASS fresh PDF autofill, quantity/source preservation, review restore and publish after PIN');
    console.log('Screenshot: ' + path.join(directory, 'library-desktop.png'));
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
