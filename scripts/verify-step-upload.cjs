const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { loadModule, analyze, tableTokens, makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { createStepModel, sameStepModel } = loadModule('model/stepModel');
const { bindStepShape, unbindStepShape } = loadModule('model/modelBindings');
const { buildStepGeometry, findShapeAtFace } = loadModule('model/buildStepGeometry');
const { groupParts, createPartReview, revisePart } = loadModule('review/reviewModel');
const { createReviewPackage, decodeReview } = loadModule('review/reviewPersistence');
const fixtures = path.join(path.dirname(require.resolve('occt-import-js/package.json')), 'test/testfiles');
const cubeFile = path.join(fixtures, 'simple-basic-cube/cube.stp');
const assemblyFile = path.join(fixtures, 'cax-if/as1-oc-214.stp');
async function checkModel() {
  const occt = await require('occt-import-js')({ print: () => {}, printErr: () => {} });
  const parse = async (filename) => {
    const bytes = fs.readFileSync(filename), messages = [];
    const context = vm.createContext({
      self: { location: { href: 'http://localhost:3000/step-import-worker.js' }, postMessage: (message) => messages.push(message) },
      URL, occtimportjs: async () => occt, importScripts: () => {},
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/step-import-worker.js'), 'utf8'), context);
    await context.self.onmessage({ data: { buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) } });
    const result = messages.at(-1);
    assert.equal(result.type, 'complete', result.message);
    assert.equal(messages.filter((message) => message.type === 'progress').length, 3);
    return createStepModel({ name: path.basename(filename), size: bytes.length }, createHash('sha256').update(bytes).digest('hex'), result.root, result.meshes);
  };
  const cube = await parse(cubeFile), assembly = await parse(assemblyFile);
  assert.equal(cube.manifest.shapeList.length, 1);
  assert.equal(assembly.manifest.shapeList.length, 18, 'Repeated nuts and bolts remain separate selectable solids');
  const nuts = assembly.manifest.shapeList.filter((shape) => shape.name === 'nut');
  assert.ok(nuts.length > 1); assert.notEqual(JSON.stringify(nuts[0].bounds), JSON.stringify(nuts[1].bounds), 'Assembly placement must be retained');
  assert.ok(assembly.manifest.shapeList.some((shape) => shape.path.includes('assembly')));
  const millimeter = await parse(path.join(fixtures, 'cube-units/cube-mm.step'));
  const inch = await parse(path.join(fixtures, 'cube-units/cube-in.step'));
  for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(millimeter.bounds.max[axis] - inch.bounds.max[axis]) < 1e-6, 'Inch STEP must be converted to millimeters');
    assert.equal(millimeter.bounds.max[axis], 1000);
  }
  const built = buildStepGeometry(assembly, '#808080');
  assert.equal(built.rangeList.length, 18);
  assert.equal(built.geometry.index.count / 3, 5040);
  for (const range of built.rangeList) {
    assert.equal(findShapeAtFace(built.rangeList, range.firstTriangle), range.id);
    assert.equal(findShapeAtFace(built.rangeList, range.firstTriangle + range.triangleCount - 1), range.id);
  }
  assert.equal(findShapeAtFace(built.rangeList, 5040), null); built.geometry.dispose();
  assert.equal(sameStepModel(assembly.manifest, { ...assembly.manifest, name: 'renamed.stp' }), true);
  assert.equal(sameStepModel(assembly.manifest, { ...assembly.manifest, sha256: '0'.repeat(64) }), false);
  const result = analyze(tableTokens());
  const pages = [{ ...result, pageNumber: 1, width: 600, height: 800, imageUrl: '', textCount: 200, warningList: [] }];
  const groups = groupParts(pages), parts = groups.map(createPartReview);
  const confirmed = parts.map((part) => ({ ...part, quantity: '2', hasNoDimensions: true, status: 'confirmed', confirmedAt: new Date().toISOString() }));
  const empty = { model: null, modelLinks: [] }, manifest = assembly.manifest;
  assert.throws(() => bindStepShape(empty, parts, parts[0].key, 'shape-0', manifest), /확정/);
  let bound = bindStepShape(empty, confirmed, parts[0].key, 'shape-0', manifest);
  bound = bindStepShape(bound, confirmed, parts[0].key, 'shape-1', manifest);
  assert.equal(bound.modelLinks.length, 2);
  assert.throws(() => bindStepShape(bound, confirmed, parts[1].key, 'shape-0', manifest), /이미/);
  assert.throws(() => bindStepShape(bound, confirmed, parts[0].key, 'shape-0', cube.manifest), /다른 STEP/);
  assert.equal(unbindStepShape(bound, manifest, 'shape-0').modelLinks.length, 1);
  const document = { sha256: 'a'.repeat(64), name: 'review.pdf', size: 10, pageCount: 1 };
  const payload = createReviewPackage(document, groups, confirmed, pages, bound);
  const decode = (value) => decodeReview(JSON.stringify(value), document, groups, pages[0].dimensionList);
  const restored = decode(payload);
  assert.equal(restored.modelLinks.length, 2); assert.equal(restored.model.sha256, manifest.sha256);
  const legacy = { ...payload, schemaVersion: 1 }; delete legacy.model; delete legacy.modelLinks;
  assert.equal(decode(legacy).model, null);
  assert.throws(() => decode({ ...payload, modelLinks: [bound.modelLinks[0], bound.modelLinks[0]] }), /중복/);
  assert.throws(() => decode({ ...payload, modelLinks: [{ partKey: 'unknown', shapeId: 'shape-0' }] }), /일치/);
  assert.throws(() => decode({ ...payload, modelLinks: [{ partKey: parts[0].key, shapeId: 'unknown' }] }), /일치/);
  const edited = { ...payload, parts: payload.parts.map((part, index) => index ? part : { ...part, ...revisePart(confirmed[0], { name: 'Changed' }) }) };
  assert.equal(decode(edited).modelLinks.length, 2, 'Editing a part retains the mapping while requiring reconfirmation');
  console.log('PASS STEP: real worker conversion, mm/inch units, assembly placement, repeated solids, picking ranges, confirmed-only links, ownership, model identity, v1/v2 persistence');
}
async function checkBrowser() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.join(require('node:os').tmpdir(), 'hanwha-step-upload-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
    const client = await page.createCDPSession(); await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const external = []; page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://localhost:3000')) external.push(request.url()); });
    const click = require('./browser-ui-helpers.cjs').makeClick(page);
    const upload = (bytes, name, label) => page.$eval('input[aria-label="' + label + '"]', (input, data, fileName) => {
      const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(data)], fileName));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, [...bytes], name);
    const stepUpload = (filename, name = path.basename(filename)) => upload(fs.readFileSync(filename), name, '미리볼 STEP 선택');
    const complete = () => page.waitForSelector('[data-step-status=complete]', { timeout: 45000 });
    const shape = (id) => page.click('[data-step-shape="shape-' + id + '"]');
    const exportData = async () => { await click('JSON 내보내기'); return page.evaluate(async () => JSON.parse(await window.__reviewExport.text())); };
    await page.goto('http://localhost:3000/training/upload-dev', { waitUntil: 'networkidle0' });
    await page.evaluate(() => { const original = URL.createObjectURL; URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__reviewExport = blob; return original.call(this, blob); }; });
    await click('STEP · 3D 연결'); await stepUpload(cubeFile); await complete();
    await page.waitForSelector('[aria-label="3D 형상 표시 영역"] canvas');
    // A raycast on the visible cube must select the same solid as the list.
    await page.waitForFunction(() => document.querySelector('canvas')?.width > 0);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const canvas = await page.$('[aria-label="3D 형상 표시 영역"] canvas'), box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForSelector('[data-step-shape="shape-0"][aria-pressed=true]');
    for (const [width, height] of [[1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height });
      await new Promise((resolve) => setTimeout(resolve, 300));
      const rect = await canvas.boundingBox();
      await page.mouse.click(rect.x + 5, rect.y + 5);
      await page.waitForSelector('[data-step-shape="shape-0"][aria-pressed=false]');
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.waitForSelector('[data-step-shape="shape-0"][aria-pressed=true]', { timeout: 3000 });
    }
    await page.setViewport({ width: 1920, height: 1080 });
    await stepUpload(assemblyFile); await complete();
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 18);
    await click('도면 분석으로');
    const pdf = makePdfFixture(1);
    const pdfReady = () => page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent === '부품 검토·보정' && !button.disabled), { timeout: 30000 });
    await upload(pdf, 'assembly-review.pdf', '분석할 PDF 선택'); await pdfReady(); await click('부품 검토·보정');
    await click('치수 0'); await page.click('input[aria-label="원문에 치수 없음 확인"]'); await click('이 부품 검토 확정');
    await page.waitForSelector('[data-review-status=confirmed]'); await click('STEP · 3D 연결');
    await shape(0); await click('선택 형상 연결'); await shape(1); await click('선택 형상 연결');
    await page.waitForFunction(() => document.querySelector('[aria-label="3D 부품번호 연결"]').textContent.includes('이 부품에 연결된 형상 2개'));
    await page.click('[data-review-part="number:BL-008"]');
    assert.equal(await page.$$eval('button', (nodes) => nodes.find((node) => node.textContent === '선택 형상 연결').disabled), true);
    await page.click('[data-review-part="number:BR-001"]');
    await click('선택 맞춤'); await click('선택만 표시');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent === '전체 표시' && button.getAttribute('aria-pressed') === 'true'));
    await click('전체 표시'); await click('전체 맞춤'); await click('검토 결과 저장');
    await shape(10); await click('선택만 표시'); await click('선택 맞춤');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await page.screenshot({ path: path.join(output, 'step-isolated-1920.png') });
    await click('전체 표시'); await click('전체 맞춤'); await shape(1);
    const exported = await exportData();
    assert.equal(exported.schemaVersion, 2); assert.equal(exported.modelLinks.length, 2);
    assert.equal(exported.model.shapeList.length, 18); assert.equal(exported.parts[0].status, 'confirmed');
    assert.equal(JSON.stringify(exported).includes('blob:'), false);
    await page.screenshot({ path: path.join(output, 'step-links-1920.png') });
    for (const [width, height] of [[1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height }); await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
      await page.screenshot({ path: path.join(output, 'step-links-' + width + '.png') });
    }
    await page.setViewport({ width: 1920, height: 1080 });
    await click('부품 검토·보정'); await click('품명·수량·재질');
    await page.$eval('input[aria-label="검토 품명"]', (input) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Revised base plate'); input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('STEP · 3D 연결');
    await page.waitForFunction(() => document.querySelector('[aria-label="STEP 형상 목록"]').textContent.includes('부품 재확정 필요'));
    await click('검토 결과 저장');
    await page.reload({ waitUntil: 'networkidle0' }); await upload(pdf, 'renamed.pdf', '분석할 PDF 선택'); await pdfReady();
    await click('STEP · 3D 연결');
    assert.match(await page.$eval('[aria-label="3D 부품번호 연결"]', (node) => node.textContent), /원본 STEP/);
    await stepUpload(assemblyFile, 'renamed.stp'); await complete();
    assert.match(await page.$eval('[data-step-shape="shape-0"]', (node) => node.textContent), /BR-001.*재확정/);
    await upload(Buffer.from(JSON.stringify(exported)), 'review.json', '검토 JSON 선택');
    await page.waitForFunction(() => document.querySelector('[aria-label="3D 부품번호 연결"]').textContent.includes('검토 확정 · 연결 가능'));
    await stepUpload(cubeFile); await complete();
    assert.match(await page.$eval('[aria-label="3D 부품번호 연결"]', (node) => node.textContent), /다른 STEP 기준/);
    assert.equal(await page.$eval('[data-step-shape="shape-0"]', (node) => node.textContent.includes('BR-001')), false);
    await click('현재 STEP으로 다시 시작 · 기존 2건 연결 해제');
    await shape(0); await click('선택 형상 연결'); await click('검토 결과 저장');
    await upload(Buffer.from('not a STEP'), 'broken.step', '미리볼 STEP 선택');
    await page.waitForSelector('[data-step-status=error]');
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 1, 'Failed replacement must preserve the last successful model');
    assert.match(await page.$eval('[role=alert]', (node) => node.textContent), /유효한 STEP/);
    // Delay worker input so cancellation and replacement are deterministic.
    await page.evaluate(() => { const NativeWorker = Worker; window.Worker = class extends NativeWorker {
      postMessage(...args) { this.pending = setTimeout(() => super.postMessage(...args), 600); }
      terminate() { clearTimeout(this.pending); super.terminate(); }
    }; });
    await stepUpload(assemblyFile); await page.waitForSelector('[data-step-status=running]'); await click('중지');
    await page.waitForSelector('[data-step-status=cancelled]');
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 1);
    await stepUpload(assemblyFile); await page.waitForSelector('[data-step-status=running]');
    await stepUpload(cubeFile); await complete();
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 1, 'Replaced conversion must not append stale geometry');
    assert.deepEqual(errors, []);
    assert.equal(external.some((url) => /anthropic|openai|occt|\\.wasm|\\.step|\\.stp/i.test(url)), false, 'STEP/PDF processing must remain local');
    console.log('PASS browser STEP: actual WASM upload, 3D click selection, preview controls, confirmed part binding, repeated links, save/export/reload/import, model mismatch, draft invalidation, errors, cancellation/replacement, HD/FHD/QHD');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
if (require.main === module) (async () => { await checkModel(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { checkModel };
