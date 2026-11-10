const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { loadModule, makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { makeClick } = require('./browser-ui-helpers.cjs');
const { normalizeOcrWords, mergeOcrTokens, markOcrEvidence, needsPageOcr, OCR_ENGINE_ID } = loadModule('ocr/ocrModel');
const { buildTextLines } = loadModule('textLayout');
const { extractDimensions } = loadModule('extractDimensions');
const { getRasterRects } = loadModule('pdfPageText');

function checkModel() {
  const word = (text, x0, x1, confidence = 95, joinWithPrevious = false) => ({ text, confidence, bbox: { x0, y0: 100, x1, y1: 130 }, baseline: { y0: 130, y1: 130 }, joinWithPrevious });
  const tokens = normalizeOcrWords({ wordList: [word('베', 100, 125), word('이', 128, 152, 90, true), word('스', 155, 180, 91, true), word('판', 183, 210, 92, true), word('육각', 280, 330), word('볼트', 350, 400)], confidence: 94 }, 1000, 1000);
  assert.equal(tokens[0].text, '베이스판'); assert.equal(tokens[0].confidence, 90);
  assert.equal(buildTextLines(tokens)[0].text, '베이스판 육각 볼트', 'Preserve OCR line spaces without inserting spaces between Korean syllables');
  assert.equal(tokens[0].rect.x, .1); assert.equal(Math.round(tokens[0].rect.width * 1000), 110);
  assert.equal(needsPageOcr([], [{ x: 0, y: 0, width: 1, height: 1 }]), true);
  assert.equal(needsPageOcr([], []), false); assert.equal(needsPageOcr([], [{ x: 0, y: 0, width: .1, height: .1 }]), false, 'A small logo is not a scanned drawing');
  const native = [{ text: 'native', rect: { x: .1, y: .1, width: .15, height: .04 }, rotation: 0 }];
  const merged = mergeOcrTokens(native, tokens); assert.equal(merged.filter((token) => token.text === '베이스판').length, 0, 'Native text wins in overlapping regions');
  const source = markOcrEvidence({ pageNumber: 1, text: '베이스판', rect: tokens[0].rect }, tokens); assert.equal(source.method, 'ocr'); assert.equal(source.confidence, 90);
  const uncertain = normalizeOcrWords({ wordList: [word('100 £0.1 mm', 300, 500, 96)], confidence: 96 }, 1000, 1000);
  const dimensions = extractDimensions(buildTextLines(uncertain), new Set(), 1).dimensionList;
  assert.equal(dimensions.length, 1); assert.equal(dimensions[0].kind, 'candidate'); assert.equal(dimensions[0].value, '100 £0.1 mm');
  assert.equal(markOcrEvidence(dimensions[0].source, uncertain).confidence, 50, 'Ambiguous tolerances cannot masquerade as a precise 0.1 mm length');
  const rects = getRasterRects({ fnArray: [1, 3, 4, 2], argsArray: [[], [600, 0, 0, 800, 0, 0], ['img'], []] }, { save: 1, restore: 2, transform: 3, paintImageXObject: 4 }, { transform: [1, 0, 0, -1, 0, 800], width: 600, height: 800 });
  assert.equal(rects[0].width, 1); assert.equal(rects[0].height, 1); assert.equal(rects[0].y, 0);
  const masks = getRasterRects({ fnArray: [1, 3, 5, 2], argsArray: [[], [600, 0, 0, 800, 0, 0], [{}], []] }, { save: 1, restore: 2, transform: 3, paintImageMaskXObject: 5 }, { transform: [1, 0, 0, -1, 0, 800], width: 600, height: 800 });
  assert.equal(masks[0].width, 1); assert.equal(masks[0].height, 1, 'Monochrome image-mask scans must also trigger OCR');
  console.log('PASS OCR model: raster detection, small-logo exclusion, normalized coordinates, Korean word spacing, native-text ownership, OCR confidence/provenance and uncertain-tolerance protection');
}
async function checkBrowser() {
  const output = path.join(os.tmpdir(), 'hanwha-ocr-qa'), fixtureDir = process.env.OCR_FIXTURE_DIR || path.join(output, 'fixtures');
  fs.mkdirSync(output, { recursive: true });
  if (!fs.existsSync(path.join(fixtureDir, 'scan-bom-eng.pdf'))) execFileSync(process.env.OCR_PYTHON || 'python', [path.join(__dirname, 'create-ocr-fixtures.py')], { stdio: 'inherit' });
  const browser = await require('puppeteer').launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page), errors = [], uploads = [], workerRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/anthropic|api\.openai|vision.googleapis|ocr.space/i.test(request.url()) || (request.method() === 'POST' && !request.url().startsWith('http://localhost:3000/'))) uploads.push(request.url());
      if (request.url().includes('/drawing-ocr-worker.js')) workerRequests.push(request.url());
    });
    const client = await page.createCDPSession(); await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
    const targetClient = await browser.target().createCDPSession();
    const noWorkers = async () => {
      for (let count = 0; count < 60; count++) {
        const { targetInfos } = await targetClient.send('Target.getTargets');
        if (!targetInfos.some((target) => /drawing-ocr-worker|vendor\/ocr-7\.0\.0\/worker/.test(target.url))) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error('OCR workers remained alive after completion/cancellation');
    };
    const capture = () => page.evaluate(() => { const original = URL.createObjectURL; URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__ocrJson = blob; return original.call(this, blob); }; });
    const reset = async () => { await page.goto('http://localhost:3000/training/upload-dev', { waitUntil: 'networkidle0' }); await capture(); };
    const upload = async (filename) => (await page.$('input[aria-label="분석할 PDF 선택"]')).uploadFile(filename);
    const ready = () => page.waitForSelector('[data-analysis-status=complete]', { timeout: 90000 });
    const reviewReady = () => page.waitForFunction(() => [...document.querySelectorAll('button')].some((node) => node.textContent === '부품 검토·보정' && !node.disabled));
    const data = async () => { await click('추출 결과 저장'); return page.evaluate(async () => JSON.parse(await window.__ocrJson.text())); };
    const edit = async (label, text) => { await page.click('input[aria-label="' + label + '"]'); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.type(text); await page.keyboard.press('Tab'); };
    const english = path.join(fixtureDir, 'scan-bom-eng.pdf');
    await reset(); const chooserPromise = page.waitForFileChooser(); await click('PDF 선택'); await (await chooserPromise).accept([english]); await ready(); await reviewReady();
    const initial = await data(), first = initial.pages[0];
    assert.equal(first.ocr.status, 'complete'); assert.equal(first.ocr.engine, OCR_ENGINE_ID); assert.equal(first.partList.length, 3);
    assert.deepEqual(first.partList.map((part) => [part.partNumber, part.name, part.quantity, part.material]), [['FLG-001', 'Flange', 2, 'AL6061'], ['BASE-002', 'Base Plate', 1, 'Steel'], ['BLT-003', 'Hex Bolt', 4, 'SUS304']]);
    for (const kind of ['diameter', 'radius', 'thread', 'angle', 'length']) assert.ok(first.dimensionList.some((item) => item.kind === kind), kind);
    assert.equal(first.partList.every((part) => part.source.method === 'ocr'), true);
    assert.equal(first.dimensionList.every((item) => item.source.method === 'ocr'), true);
    assert.equal(first.dimensionList.some((item) => item.kind === 'length' && item.value === '0.1 mm'), false);
    await noWorkers(); await page.screenshot({ path: path.join(output, 'ocr-analysis-1920.png') });
    await click('부품 검토·보정'); await page.waitForSelector('[data-ocr-review]');
    assert.equal(await page.$eval('input[aria-label="검토 품명"]', (node) => node.value), 'Flange');
    assert.equal(await page.$eval('input[aria-label="검토 수량"]', (node) => node.value), '2');
    assert.equal(await page.$eval('input[aria-label="검토 재질"]', (node) => node.value), 'AL6061');
    await page.waitForSelector('[aria-label="검토 원문 강조 위치"]');
    await edit('검토 품명', 'Reviewed Flange'); await edit('검토 수량', '3'); await edit('검토 재질', 'AL7075');
    await click('치수 0'); await page.click('button[aria-label="1쪽 25 mm 치수 연결"]');
    assert.equal(await page.$eval('[aria-label="검토 치수 1 단위"]', (node) => node.value), 'mm');
    await click('이 부품 검토 확정'); await page.waitForSelector('[data-review-status=confirmed]'); await click('검토 결과 저장');
    await click('JSON 내보내기'); const saved = await page.evaluate(async () => JSON.parse(await window.__ocrJson.text()));
    assert.equal(saved.parts[0].name, 'Reviewed Flange'); assert.equal(saved.parts[0].quantity, '3'); assert.equal(saved.parts[0].material, 'AL7075');
    assert.equal(saved.evidence.partList[0].name, 'Flange'); assert.equal(saved.evidence.partList[0].quantity, 2); assert.equal(saved.evidence.ocrPageList[0].engine, OCR_ENGINE_ID);
    assert.equal(saved.parts[0].dimensionList[0].sourceId, first.dimensionList.find((dimension) => dimension.value === '25 mm').id);
    await page.screenshot({ path: path.join(output, 'ocr-review-saved-1920.png') });
    await reset(); await upload(english); await ready(); await reviewReady(); await click('부품 검토·보정'); await page.waitForSelector('[data-review-status=confirmed]');
    assert.equal(await page.$eval('[aria-label="검토 품명"]', (node) => node.value), 'Reviewed Flange'); assert.equal(await page.$eval('[aria-label="검토 수량"]', (node) => node.value), '3');
    const reviewFile = path.join(output, 'review-ocr.json'); fs.writeFileSync(reviewFile, JSON.stringify(saved));
    await edit('검토 재질', 'Temporary'); const importChooser = page.waitForFileChooser(); await click('검토 JSON 불러오기'); await (await importChooser).accept([reviewFile]);
    await page.waitForSelector('[data-review-status=confirmed]'); assert.equal(await page.$eval('[aria-label="검토 재질"]', (node) => node.value), 'AL7075');
    await noWorkers();
    await reset(); await upload(path.join(fixtureDir, 'scan-bom-kor.pdf')); await ready(); await reviewReady(); const korean = await data();
    assert.deepEqual(korean.pages[0].partList.map((part) => [part.name, part.quantity, part.material]), [['플랜지', 2, '알루미늄'], ['베이스판', 1, '탄소강'], ['육각 볼트', 4, '스테인리스']]);
    assert.equal(korean.pages[0].dimensionList.some((item) => ['1', '2', '3'].includes(item.value)), false, 'BOM item numbers cannot become drawing dimensions');
    await click('부품 검토·보정'); await page.waitForSelector('[data-ocr-review]'); assert.equal(await page.$eval('[aria-label="검토 품명"]', (node) => node.value), '플랜지');
    const needsCount = korean.pages[0].partList.filter((part) => part.source.confidence < 80).length;
    assert.ok(await page.$$eval('button', (nodes, expected) => nodes.some((node) => node.textContent === '보완 ' + expected), needsCount), 'Low-confidence OCR rows must appear in the needs-review count');
    await page.screenshot({ path: path.join(output, 'ocr-korean-1920.png') });
    for (const [width, height] of [[1280, 720], [2560, 1440]]) { await page.setViewport({ width, height }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true); await page.screenshot({ path: path.join(output, 'ocr-review-' + width + '.png') }); }
    await page.setViewport({ width: 1920, height: 1080 });
    await reset(); await upload(path.join(fixtureDir, 'mixed-scan.pdf')); await ready(); const mixed = await data();
    assert.equal(mixed.pages.length, 2); assert.equal(mixed.pages[0].ocr, undefined); assert.equal(mixed.pages[0].partList[0].partNumber, 'VECTOR-001');
    assert.equal(mixed.pages[1].ocr.status, 'complete'); assert.equal(mixed.pages[1].partList.length, 3);
    assert.equal(mixed.pages[1].lineList.filter((line) => line.text === 'NATIVE TITLE - SCANNED DRAWING BELOW').length, 1, 'Hybrid PDF native text cannot be duplicated by OCR');
    await reset(); await upload(path.join(fixtureDir, 'scan-empty.pdf')); await ready(); const empty = await data();
    assert.equal(empty.pages[0].ocr.status, 'empty'); assert.equal(empty.pages[0].partList.length, 0); assert.match(await page.$eval('[aria-label="실제 PDF 처리 현황"]', (node) => node.textContent), /원문 확인 필요/);
    const nativeFile = path.join(output, 'native.pdf'); fs.writeFileSync(nativeFile, makePdfFixture(1));
    await reset(); const before = workerRequests.length; await upload(nativeFile); await ready(); const native = await data(); assert.equal(native.pages[0].ocr, undefined); assert.equal(workerRequests.length, before);
    await click('OCR로 다시 읽기'); await ready(); const forced = await data(); assert.equal(forced.pages[0].ocr.status, 'complete');
    await reset(); await upload(english); await page.waitForSelector('[data-ocr-active=true]'); await click('분석 중지'); await page.waitForSelector('[data-analysis-status=cancelled]'); await noWorkers();
    await upload(english); await page.waitForSelector('[data-ocr-active=true]'); await upload(nativeFile); await ready(); await noWorkers();
    const replaced = await data(); assert.equal(replaced.source.fileName, 'native.pdf'); assert.equal(replaced.pages.length, 1); assert.equal(replaced.pages[0].ocr, undefined);
    await reset(); await page.setRequestInterception(true);
    const blockWorker = (request) => request.url().includes('/drawing-ocr-worker.js') ? request.abort('failed') : request.continue(); page.on('request', blockWorker);
    await upload(english); await ready(); const failed = await data(); assert.equal(failed.pages[0].ocr.status, 'failed'); assert.equal(failed.pages[0].partList.length, 0);
    assert.match(await page.$eval('[aria-label="실제 PDF 처리 현황"]', (node) => node.textContent), /인식 실패/);
    await page.setRequestInterception(false); page.off('request', blockWorker); await click('다시 분석'); await ready(); const retry = await data(); assert.equal(retry.pages[0].partList.length, 3); await noWorkers();
    assert.deepEqual(errors, []); assert.deepEqual(uploads, []);
    console.log('PASS actual OCR browser: image-only English/Korean PDFs, automatic BOM/name/quantity/material/dimensions, source coordinates, corrections/confirmation/save/reload/JSON restore, hybrid/native pages, empty scans, force OCR, immediate cancellation/worker cleanup, in-flight replacement, worker failure/retry and HD/FHD/QHD; no external OCR upload');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
if (require.main === module) (async () => { checkModel(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
