const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const feature = path.join(__dirname, '../src/features/drawing-upload-dev');
const moduleCache = new Map();
function loadModule(name) {
  const filename = path.resolve(feature, name.endsWith('.ts') ? name : name + '.ts');
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const module = { exports: {} };
  moduleCache.set(filename, module);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require: (target) => target.startsWith('.') ? loadModule(path.relative(feature, path.resolve(path.dirname(filename), target))) : require(target), console }, { filename });
  return module.exports;
}
const { buildTextLines } = loadModule('textLayout');
const { extractParts } = loadModule('extractParts');
const { extractDimensions } = loadModule('extractDimensions');
const token = (text, x, y, width = text.length * 0.007) => ({ text, rect: { x, y, width, height: 0.015 }, rotation: 0 });
function analyze(tokenList, pageNumber = 1) {
  const lineList = buildTextLines(tokenList);
  const parts = extractParts(lineList, tokenList, pageNumber);
  return { ...parts, ...extractDimensions(lineList, parts.tableLineSet, pageNumber, parts.tableRectList), lineList };
}
function tableTokens() {
  return [
    token('UNITS: mm', .1, .06),
    token('ITEM', .06, .12), token('PART NO', .15, .12), token('DESCRIPTION', .32, .12), token('QTY', .62, .12), token('MATERIAL', .76, .12),
    token('1', .07, .16), token('BR-001', .15, .16), token('Base plate', .32, .16), token('1', .63, .16), token('AL6061', .76, .16),
    token('2', .07, .20), token('BL-008', .15, .20), token('Bolt M8x30', .32, .20), token('4', .63, .20), token('Steel', .76, .20),
    token('3', .07, .24), token('CV-002', .15, .24), token('Upper cover', .32, .24), token('A/R', .63, .24), token('Steel', .76, .24),
    token('machined', .32, .26),
    token('Ø12 ±0.1', .15, .40), token('R5', .48, .45), token('M8x1.25', .72, .5),
    token('45°', .35, .55), token('25 mm', .15, .60), token('50', .4, .70), token('ISO 2768', .75, .75),
    token('100 +0.1/-0.2', .2, .8), token('1', .05, .96),
  ];
}
function checkParser() {
  const result = analyze(tableTokens());
  assert.equal(result.headerCount, 1);
  assert.equal(result.partList.filter((part) => part.kind === 'table').length, 3);
  assert.equal(result.partList[1].quantity, 4);
  assert.equal(result.partList[1].name, 'Bolt M8x30');
  assert.equal(result.partList[2].quantity, null, 'A/R must not be invented as an integer');
  assert.match(result.partList[2].name, /machined/);
  assert.equal(result.unit, 'mm');
  const explicit = result.dimensionList.filter((item) => item.kind !== 'candidate');
  assert.equal(explicit.length, 6, JSON.stringify(explicit));
  assert.equal(result.dimensionList.some((item) => item.value === 'M8x30'), false, 'BOM descriptions are not drawing dimensions');
  assert.equal(result.dimensionList.some((item) => item.value.includes('2768')), false, 'A standard number is not a length');
  assert.equal(result.dimensionList.some((item) => item.value === '1'), false, 'Footer page number is not a dimension');
  assert.equal(result.dimensionList.find((item) => item.value === '50').kind, 'candidate');
  assert.equal(result.dimensionList.find((item) => item.kind === 'diameter').source.pageNumber, 1);
  assert.equal(result.dimensionList.find((item) => item.kind === 'diameter').source.rect.y, .4);

  const unknown = analyze([token('Ø8', .2, .3), token('50', .5, .6)]);
  assert.equal(unknown.dimensionList[0].unit, null, 'An unspecified unit must remain unknown');
  assert.equal(unknown.dimensionList[1].kind, 'candidate');
  const korean = analyze([
    token('품번', .1, .1), token('품명', .32, .1), token('수량', .65, .1), token('재질', .8, .1),
    token('A-01', .1, .15), token('브래킷', .32, .15), token('2', .65, .15), token('알루미늄', .8, .15),
  ]);
  assert.equal(korean.partList[0].name, '브래킷'); assert.equal(korean.partList[0].quantity, 2);
  const french = analyze([
    token('Rep.', .06, .1), token('Nb', .22, .1), token('Désignation', .4, .1), token('Matière', .8, .1),
    token('1', .06, .15), token('3', .22, .15), token('Support', .4, .15), token('Acier', .8, .15),
  ]);
  assert.equal(french.partList[0].quantity, 3); assert.equal(french.partList[0].name, 'Support');
  const splitHeader = analyze([
    token('No.', .06, .1), token('PART', .15, .1), token('NO.', .185, .1), token('DESCRIPTION', .32, .1), token('QTY', .7, .1),
    token('1', .06, .15), token('PL-001', .15, .15), token('Plate', .32, .15), token('2', .7, .15),
  ]);
  assert.equal(splitHeader.partList[0].partNumber, 'PL-001', 'Split PART / NO headings must map to the part-number column');
  const codes = analyze([token('123456', .2, .3), token('678901', .5, .3), token('123456', .5, .5), token('8x', .2, .4)]);
  assert.equal(codes.partList.length, 2, 'Different codes on the same line must remain separate');
  assert.equal(codes.partList[0].kind, 'code');
  assert.equal(codes.partList[0].quantity, null, 'Nearby pictogram quantity must not be attached without proof');
  assert.equal(codes.dimensionList.length, 0);
  const besideTable = analyze([
    token('ITEM', .5, .12), token('DESCRIPTION', .62, .12), token('QTY', .87, .12),
    token('Ø9', .1, .16), token('1', .5, .16), token('Bracket', .62, .16), token('2', .87, .16),
  ]);
  assert.equal(besideTable.partList[0].name, 'Bracket');
  assert.equal(besideTable.dimensionList[0].value, 'Ø9', 'Dimensions beside a BOM must not be discarded');
  const sameLineDimensions = analyze([token('Ø8', .1, .3), token('R5', .7, .3)]);
  assert.equal(sameLineDimensions.dimensionList[0].source.rect.x, .1);
  assert.equal(sameLineDimensions.dimensionList[1].source.rect.x, .7, 'Each dimension must point to its own source location');
  assert.equal(analyze([]).partList.length, 0); assert.equal(analyze([]).dimensionList.length, 0);
  console.log('PASS extraction: multilingual/reordered BOM, wrapped cells, A/R quantity, dimensions, units, provenance, exclusions and image-only input');
}

/** An in-memory vector PDF for end-to-end tests, not a product design document. */
function makePdfFixture(pageCount = 2, pageTokenList, pageDrawingList) {
  const escape = (text) => text.replace(/[\\()]/g, '\\$&').replace(/Ø/g, '\\330').replace(/±/g, '\\261').replace(/°/g, '\\260');
  const objects = ['', '<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  const kids = [];
  for (let index = 0; index < pageCount; index++) {
    const pageId = objects.length, streamId = pageId + 1;
    kids.push(pageId + ' 0 R');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + streamId + ' 0 R >>');
    const tokens = pageTokenList ? pageTokenList[index] ?? [] : index === 0 ? tableTokens() : [];
    const text = tokens.map((item) => 'BT /F1 10 Tf 1 0 0 1 ' + (item.rect.x * 600) + ' ' + ((1 - item.rect.y) * 800 - 12) + ' Tm (' + escape(item.text) + ') Tj ET').join('\n');
    const stream = (pageDrawingList?.[index] ?? '0.5 w 60 40 480 720 re S\n100 280 220 100 re S') + '\n' + text;
    objects.push('<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' + stream + '\nendstream');
  }
  objects[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pageCount + ' >>';
  let pdf = '%PDF-1.4\n', offsets = [0];
  for (let index = 1; index < objects.length; index++) { offsets.push(Buffer.byteLength(pdf, 'latin1')); pdf += index + ' 0 obj\n' + objects[index] + '\nendobj\n'; }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 ' + objects.length + '\n0000000000 65535 f \n' + offsets.slice(1).map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += 'trailer\n<< /Size ' + objects.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return Buffer.from(pdf, 'latin1');
}
async function checkBrowser() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /hydration|hydrated|script tag|Unhandled|worker/i.test(message.text())) errors.push(message.text()); });
    await page.goto('http://localhost:3000/training/upload-dev', { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[type=file]');
    assert.equal(await page.evaluate(() => document.body.textContent.includes('예제 PDF로 확인')), false, 'The built-in sample action must be removed');
    const removedSample = await fetch('http://localhost:3000/reference-assets/bekvaem-step-stool-aspen__AA-323406-9-2.pdf', { cache: 'no-store' });
    assert.equal(removedSample.status, 404, 'The built-in example PDF must no longer be served');
    const upload = async (bytes, name = 'assembly-fixture.pdf') => page.$eval('input[type=file]', (input, data, fileName) => {
      const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(data)], fileName, { type: 'application/pdf' }));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, [...bytes], name);
    await upload(makePdfFixture());
    await page.waitForSelector('[data-analysis-status=complete]', { timeout: 30000 });
    assert.equal(await page.$$eval('button[aria-label$="쪽 원문 확대"]', (nodes) => nodes.length), 2);
    assert.equal(await page.$$eval('[data-record=part]', (nodes) => nodes.length), 3);
    const partText = await page.$eval('[data-record=part]', (node) => node.textContent);
    assert.match(partText, /BR-001/); assert.match(partText, /AL6061/);
    await page.click('button[aria-label="1쪽 BR-001 원문 확인"]');
    await page.waitForSelector('dialog[open] [aria-label="추출된 원문 위치"]');
    assert.match(await page.$eval('dialog a', (anchor) => anchor.href), /blob:.*#page=1/);
    await page.evaluate(() => document.querySelector('dialog button[autofocus]')?.click());
    await page.keyboard.press('Escape');
    await page.click('#tab-dimensions');
    assert.equal(await page.$$eval('[data-record=dimension]:not([data-kind=candidate])', (nodes) => nodes.length), 6);
    assert.equal(await page.$$eval('[data-record=dimension][data-kind=candidate]', (nodes) => nodes.length), 1);
    await page.click('button[aria-label="1쪽 100 +0.1/-0.2 원문 확인"]');
    await page.waitForFunction(() => {
      const highlight = document.querySelector('dialog[open] [aria-label="추출된 원문 위치"]');
      if (!highlight) return false;
      const rect = highlight.getBoundingClientRect(), dialog = document.querySelector('dialog[open]').getBoundingClientRect();
      return rect.top >= dialog.top && rect.bottom <= dialog.bottom;
    });
    await page.keyboard.press('Escape');
    await page.focus('#tab-dimensions'); await page.keyboard.press('ArrowRight');
    assert.equal(await page.$eval('#tab-text', (node) => node.getAttribute('aria-selected')), 'true');
    await page.keyboard.press('ArrowLeft');
    await page.$eval('input[aria-label="추출 결과 검색"]', (input) => { input.value = 'Ø12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    // Native input through Puppeteer also exercises React controlled updates.
    await page.click('input[aria-label="추출 결과 검색"]'); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.type('R5');
    assert.equal(await page.$$eval('[data-record=dimension]', (nodes) => nodes.length), 1);
    await page.evaluate(() => {
      const original = URL.createObjectURL;
      URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__analysisExport = blob; return original.call(this, blob); };
    });
    await require('./browser-ui-helpers.cjs').makeClick(page)('추출 결과 저장');
    const exported = await page.evaluate(async () => JSON.parse(await window.__analysisExport.text()));
    assert.equal(exported.pages.length, 2); assert.equal(exported.summary.tableRowCount, 3);
    assert.equal(exported.summary.dimensionCount, 6); assert.equal(exported.pages[1].warningList.length > 0, true);
    assert.equal(JSON.stringify(exported).includes('blob:'), false);
    await upload(makePdfFixture(60), 'cancel.pdf');
    await page.waitForSelector('[data-analysis-status=running]');
    await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent === '분석 중지').click());
    await page.waitForSelector('[data-analysis-status=cancelled]');
    await upload(makePdfFixture(60), 'replaced.pdf');
    await page.waitForSelector('[data-analysis-status=running]');
    await upload(makePdfFixture(), 'replacement.pdf');
    await page.waitForSelector('[data-analysis-status=complete]');
    assert.equal(await page.$$eval('button[aria-label$="쪽 원문 확대"]', (nodes) => nodes.length), 2, 'Cancelled or replaced jobs cannot append stale pages');
    await upload(makePdfFixture(12), 'twelve-pages.pdf');
    await page.waitForFunction(() => document.querySelector('[data-analysis-status=complete]') && document.querySelectorAll('button[aria-label$="쪽 원문 확대"]').length === 12, { timeout: 30000 });
    await upload(Buffer.from('not a PDF'), 'broken.pdf');
    await page.waitForSelector('[role=alert]');
    assert.match(await page.$eval('[role=alert]', (node) => node.textContent), /PDF 형식/);
    await upload(makePdfFixture(8), 'eight-pages.pdf');
    await page.waitForFunction(() => document.querySelector('[data-analysis-status=complete]') && document.querySelectorAll('button[aria-label$="쪽 원문 확대"]').length === 8, { timeout: 30000 });
    assert.deepEqual(errors, []);
    const outputDirectory = path.join(require('node:os').tmpdir(), 'hanwha-upload-dev-qa');
    fs.mkdirSync(outputDirectory, { recursive: true });
    await page.screenshot({ path: path.join(outputDirectory, 'upload-dev-1920.png') });
    await page.setViewport({ width: 1280, height: 720 });
    await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
    await page.screenshot({ path: path.join(outputDirectory, 'upload-dev-1280.png') });
    await page.setViewport({ width: 2560, height: 1440 });
    await page.screenshot({ path: path.join(outputDirectory, 'upload-dev-2560.png') });
    await page.goto('http://localhost:3000/training/upload', { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[aria-label="분석할 PDF 선택"]');
    await upload(makePdfFixture(), 'main-route.pdf');
    await page.waitForSelector('[data-analysis-status=complete]', { timeout: 30000 });
    assert.equal(await page.$$eval('[data-record=part]', (nodes) => nodes.length), 3, 'The main route must use actual PDF extraction');
    assert.equal(await page.evaluate(() => document.body.textContent.includes('측면 다리 프레임')), false, 'The main route must not display fixed stool data');
    assert.equal(await page.evaluate(() => document.body.textContent.includes('예시 도면 사용')), false, 'The legacy upload screen must not offer the deleted example');
    console.log('PASS browser: main/dev real PDF extraction, source review, HD/FHD/QHD, removed fixed stool results and deleted sample PDF 404');
    console.log('Screenshot: ' + path.join(outputDirectory, 'upload-dev-1920.png'));
  } finally { await browser.close(); }
}
if (require.main === module) {
  (async () => { checkParser(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
}
module.exports = { makePdfFixture, checkParser, loadModule, analyze, tableTokens, token };
