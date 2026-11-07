const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadModule, analyze, tableTokens, makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { groupParts, createPartReview, revisePart, getReviewIssues, parseReviewQuantity } = loadModule('review/reviewModel');
const { createReviewPackage, decodeReview } = loadModule('review/reviewPersistence');
function fixtureData() {
  const first = tableTokens();
  const second = tableTokens().map((item) => item.text === '4' && item.rect.y === .20 ? { ...item, text: '6' } : item);
  const pages = [first, second].map((tokens, index) => {
    const result = analyze(tokens, index + 1);
    return { pageNumber: index + 1, width: 600, height: 800, imageUrl: 'blob:test', textCount: 200, lineList: result.lineList, partList: result.partList, dimensionList: result.dimensionList, unit: result.unit, unitSource: result.unitSource, warningList: [] };
  });
  return { pages, tokens: [first, second] };
}
function checkReviewModel() {
  const { pages } = fixtureData();
  const groups = groupParts(pages), parts = groups.map(createPartReview);
  assert.equal(groups.length, 3, 'Repeated BOM pages must merge by part number');
  assert.equal(groups[0].recordList.length, 2);
  assert.equal(parts[0].quantity, '1', 'Repeated quantities are not summed');
  assert.equal(parts[1].quantity, '', 'Conflicting quantities require an explicit choice');
  assert.equal(groups[1].conflictFieldList.includes('quantity'), true);
  assert.equal(parts[0].dimensionList.length, 0, 'Page dimensions cannot be auto-assigned to every part');
  assert.equal(getReviewIssues(parts[0]).length, 1);
  assert.equal(parseReviewQuantity('0'), null); assert.equal(parseReviewQuantity('-1'), null);
  assert.equal(parseReviewQuantity('Infinity'), null); assert.equal(parseReviewQuantity('1e3'), null);
  assert.equal(parseReviewQuantity('2.5'), 2.5);
  const checked = { ...parts[0], name: 'Base plate revised', quantity: '2', dimensionList: [{ id: 'd1', sourceId: pages[0].dimensionList[0].id, value: 'Ø12 ±0.05', unit: 'mm' }], status: 'confirmed', confirmedAt: '2026-11-04T06:00:00.000Z' };
  assert.equal(getReviewIssues(checked).length, 0);
  const changed = revisePart(checked, { material: 'AL7075' });
  assert.equal(changed.status, 'draft'); assert.equal(changed.confirmedAt, null);
  assert.equal(pages[0].dimensionList[0].value, 'Ø12 ±0.1', 'Corrections preserve original dimension evidence');
  assert.equal(pages[0].partList[0].quantity, 1, 'Corrections preserve original quantities');
  const manual = { ...checked, note: '', dimensionList: [{ id: 'manual-1', sourceId: null, value: '25', unit: 'mm' }] };
  assert.equal(getReviewIssues(manual).some((issue) => issue.includes('근거')), true);
  assert.equal(getReviewIssues({ ...manual, note: 'Measured on drawing' }).length, 0);
  const document = { sha256: 'a'.repeat(64), name: 'sample.pdf', size: 100, pageCount: 2 };
  const payload = createReviewPackage(document, groups, [checked, ...parts.slice(1)], pages);
  const raw = JSON.stringify(payload);
  const restored = decodeReview(raw, document, groups, pages.flatMap((page) => page.dimensionList));
  assert.equal(restored.partList[0].quantity, '2'); assert.equal(restored.partList[0].status, 'confirmed');
  assert.equal(JSON.stringify(payload).includes('blob:'), false);
  assert.throws(() => decodeReview(raw, { ...document, sha256: 'b'.repeat(64) }, groups, []), /다른 문서/);
  const invalidUnit = JSON.parse(raw); invalidUnit.parts[0].dimensionList[0].unit = '';
  assert.throws(() => decodeReview(JSON.stringify(invalidUnit), document, groups, pages.flatMap((page) => page.dimensionList)), /미완성/);
  const wrongSource = JSON.parse(raw); wrongSource.parts[0].dimensionList[0].sourceId = 'another-pdf-dimension';
  assert.throws(() => decodeReview(JSON.stringify(wrongSource), document, groups, []), /출처/);
  const duplicate = JSON.parse(raw); duplicate.parts[1] = duplicate.parts[0];
  assert.throws(() => decodeReview(JSON.stringify(duplicate), document, groups, pages.flatMap((page) => page.dimensionList)), /일치/);
  const incomplete = { ...parts[0], hasNoDimensions: true };
  assert.equal(getReviewIssues(incomplete).length, 0, 'Explicitly reviewed absence of dimensions is allowed');
  const separate = groupParts([{ ...pages[0], partList: [
    { ...pages[0].partList[0], id: 'a', partNumber: '00123' },
    { ...pages[0].partList[0], id: 'b', partNumber: '123' },
    { ...pages[0].partList[0], id: 'c', partNumber: '' },
    { ...pages[0].partList[0], id: 'd', partNumber: '' },
  ] }]);
  assert.equal(separate.length, 4, 'Leading zeroes and missing part numbers cannot be silently merged');
  console.log('PASS review model: grouping, quantity conflicts, evidence, explicit dimensions, validation, confirmation invalidation, save/restore and wrong-document rejection');
}
async function checkBrowser() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  const outputDirectory = path.join(require('node:os').tmpdir(), 'hanwha-part-review-qa');
  fs.mkdirSync(outputDirectory, { recursive: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const client = await page.createCDPSession(); await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /hydration|hydrated|script tag|Unhandled|worker/i.test(message.text())) errors.push(message.text()); });
    const upload = async (bytes, name = 'review.pdf', selector = 'input[aria-label="분석할 PDF 선택"]') => page.$eval(selector, (input, data, fileName) => {
      const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(data)], fileName, { type: fileName.endsWith('.json') ? 'application/json' : 'application/pdf' }));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, [...bytes], name);
    const clickText = require('./browser-ui-helpers.cjs').makeClick(page);
    const setInput = async (label, value) => page.$eval('input[aria-label="' + label + '"]', (input, text) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text); input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    const waitReady = () => page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent === '부품 검토·보정' && !button.disabled), { timeout: 30000 });
    const fixture = makePdfFixture(2, fixtureData().tokens);
    await page.goto('http://localhost:3000/training/upload-dev', { waitUntil: 'networkidle0' });
    await upload(fixture); await waitReady(); await clickText('부품 검토·보정');
    await page.waitForSelector('[aria-label="부품 검토 작업 화면"]');
    assert.equal(await page.$$eval('[data-review-part]', (nodes) => nodes.length), 3);
    assert.equal(await page.$eval('input[aria-label="검토 수량"]', (input) => input.value), '1');
    assert.match(await page.$eval('[data-review-part="number:BR-001"]', (node) => node.textContent), /원문 2건/);
    await setInput('검토 품명', 'Base plate revised'); await setInput('검토 수량', '2'); await setInput('검토 재질', 'AL7075');
    await clickText('이 부품 검토 확정'); await page.waitForSelector('[aria-label="부품 검토 편집"] [role=alert]');
    await page.click('button[aria-label="1쪽 Ø12 ±0.1 치수 연결"]');
    await setInput('검토 치수 1 값', 'Ø12 ±0.05');
    assert.match(await page.$eval('[aria-label="검토 원문 도면"]', (node) => node.textContent), /Ø12 ±0.1/);
    await clickText('이 부품 검토 확정'); await page.waitForSelector('[data-review-status=confirmed]');
    await clickText('검토 결과 저장');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('이 브라우저에 저장했습니다'));
    await page.evaluate(() => {
      const original = URL.createObjectURL;
      URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__reviewExport = blob; return original.call(this, blob); };
    });
    await clickText('JSON 내보내기');
    const exported = await page.evaluate(async () => JSON.parse(await window.__reviewExport.text()));
    assert.equal(exported.parts.length, 3); assert.equal(exported.parts[0].status, 'confirmed');
    assert.equal(exported.parts[0].dimensionList[0].value, 'Ø12 ±0.05');
    assert.equal(exported.evidence.dimensionList[0].value, 'Ø12 ±0.1');
    assert.match(exported.document.sha256, /^[a-f0-9]{64}$/);
    await clickText('품명·수량·재질'); await setInput('검토 수량', '3');
    await page.waitForSelector('[data-review-status=draft]'); await clickText('검토 결과 저장');
    await page.reload({ waitUntil: 'networkidle0' }); await upload(fixture, 'renamed-review.pdf'); await waitReady();
    await clickText('부품 검토·보정');
    assert.equal(await page.$eval('input[aria-label="검토 수량"]', (input) => input.value), '3');
    await upload(Buffer.from(JSON.stringify(exported)), 'review.json', 'input[aria-label="검토 JSON 선택"]');
    await page.waitForSelector('[data-review-status=confirmed]');
    await page.click('[data-review-part="number:BL-008"]');
    assert.equal(await page.$eval('input[aria-label="검토 수량"]', (input) => input.value), '');
    await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent === '적용: 6 · 2쪽').click());
    assert.equal(await page.$eval('input[aria-label="검토 수량"]', (input) => input.value), '6');
    assert.equal(await page.$eval('select[aria-label="검토 원문 페이지"]', (input) => input.value), '2');
    await clickText('치수 0');
    await page.click('input[aria-label="원문에 치수 없음 확인"]');
    await clickText('이 부품 검토 확정'); await page.waitForSelector('[data-review-status=confirmed]');
    await page.click('[data-review-part="number:CV-002"]'); await setInput('검토 수량', '1');
    await clickText('치수 0'); await clickText('치수 직접 입력 +');
    await setInput('검토 치수 1 값', '25'); await setInput('검토 치수 1 단위', 'mm');
    await clickText('이 부품 검토 확정');
    await page.waitForSelector('textarea[aria-label="검토 메모"]');
    await page.$eval('textarea[aria-label="검토 메모"]', (input) => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Test fixture: manually checked drawing dimension');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clickText('이 부품 검토 확정'); await page.waitForSelector('[data-review-status=confirmed]');
    await page.click('[data-review-part="number:BR-001"]'); await clickText('품명·수량·재질');
    await setInput('검토 수량', '4');
    await page.evaluate(() => {
      window.__originalStorageSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key.startsWith('hanwha.part-review.v1.')) throw new DOMException('Full', 'QuotaExceededError'); return window.__originalStorageSet.call(this, key, value); };
    });
    await clickText('검토 결과 저장');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('저장하지 못했습니다'));
    await page.evaluate(() => { Storage.prototype.setItem = window.__originalStorageSet; });
    const wrong = { ...exported, document: { ...exported.document, sha256: '0'.repeat(64) } };
    await upload(Buffer.from(JSON.stringify(wrong)), 'wrong.json', 'input[aria-label="검토 JSON 선택"]');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('다른 문서'));
    assert.equal(await page.$eval('input[aria-label="검토 수량"]', (input) => input.value), '4');
    await clickText('검토 결과 저장'); await clickText('이 부품 검토 확정');
    await page.screenshot({ path: path.join(outputDirectory, 'review-fields-1920.png') });
    await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent === '치수 1').click());
    await page.screenshot({ path: path.join(outputDirectory, 'review-dimensions-1920.png') });
    for (const [width, height] of [[1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height }); await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
      await page.screenshot({ path: path.join(outputDirectory, 'review-' + width + '.png') });
    }
    const revisedTokens = fixtureData().tokens.map((tokens) => tokens.map((item) => item.text === 'Base plate' ? { ...item, text: 'Base plate new revision' } : item));
    await upload(makePdfFixture(2, revisedTokens), 'renamed-review.pdf'); await waitReady(); await clickText('부품 검토·보정');
    assert.equal(await page.$eval('input[aria-label="검토 수량"]', (input) => input.value), '1', 'Different PDF content with the same filename must not restore old corrections');
    assert.equal(await page.$eval('input[aria-label="검토 품명"]', (input) => input.value), 'Base plate new revision');
    await page.waitForSelector('[data-review-status=draft]');
    assert.deepEqual(errors, []);
    console.log('PASS browser review: grouping, corrections, source matching, confirmation, edit invalidation, persistence, reload, JSON import/export, conflicts, quota errors, wrong-PDF rejection and HD/FHD/QHD');
    console.log('Screenshots: ' + outputDirectory);
  } catch (error) {
    const pages = await browser.pages();
    await pages[pages.length - 1]?.screenshot({ path: path.join(outputDirectory, 'failure.png') }).catch(() => undefined);
    throw error;
  } finally { await browser.close(); }
}
if (require.main === module) (async () => { checkReviewModel(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { checkReviewModel };
