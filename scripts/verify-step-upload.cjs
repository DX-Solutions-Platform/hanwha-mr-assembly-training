const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { loadModule, analyze, tableTokens, makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { createStepModel, sameStepModel } = loadModule('model/stepModel');
const { getStepAssemblyParts } = loadModule('model/stepAssemblyParts');
const { isPracticeReady, getPracticeFocus } = loadModule('../drawing-upload/practice/stepPracticeConfig');
const { advancePracticeTurn, getPracticeResistance, getPreparationOffset, PREPARATION_CENTER } = loadModule('../drawing-upload/practice/stepPracticeMotion');
const { createInstructionDrafts, getInstructionDrawingTargets, moveInstruction, nextUnconfirmedInstruction, paginateInstructions } = loadModule('../drawing-upload/instructions/assemblyInstructions');
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
  const grouped = getStepAssemblyParts({
    ...assembly,
    root: { name: 'assembly', meshes: [], children: [
      { name: 'Repeated part', meshes: [0, 2], children: [] },
      { name: 'Repeated part', meshes: [1], children: [] },
    ] },
  });
  assert.deepEqual(Array.from(grouped[0].shapeIds), ['shape-0', 'shape-2'], 'A multi-body part is selected as a unit');
  assert.deepEqual(Array.from(grouped[1].shapeIds), ['shape-1'], 'Equal names do not merge separate occurrences');
  assert.equal(grouped.flatMap((part) => part.shapeIds).length, assembly.manifest.shapeList.length, 'Unlisted bodies are still selectable');
  const [basePart, mountingPart] = grouped;
  const practicePick = { point: [0.5, 0, 0], normal: [0, 0, 1] };
  const practiceConfig = {
    placement: { partNumber: basePart.number, pick: practicePick },
    fastening: { partNumber: mountingPart.number, pick: practicePick },
    tool: 'Torx 비트', torque: '1.0', exampleTorque: true,
  };
  assert.equal(isPracticeReady(practiceConfig, grouped.length), true);
  assert.equal(isPracticeReady({ ...practiceConfig, fastening: practiceConfig.placement }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, torque: '작업지시서 확인' }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, fastening: { partNumber: mountingPart.number } }, grouped.length), false);
  const focus = getPracticeFocus({ min: [-10, -10, -10], max: [10, 10, 10] }, mountingPart.bounds, practicePick.point, 0.1);
  assert.equal((focus.min[0] + focus.max[0]) / 2, 5, 'The enlarged view centers on the point set in the authoring viewport');
  const modelBounds = { min: [-10, -10, -10], max: [10, 10, 10] };
  const [stagingX] = getPreparationOffset(modelBounds, modelBounds, 0.1);
  assert.equal(stagingX, PREPARATION_CENTER);
  assert.ok(stagingX - 1 > 1, 'Even the widest part starts clear of the assembly area');
  const looseTurn = advancePracticeTurn(0.35, Math.PI / 12);
  const loadedTurn = advancePracticeTurn(0.96, Math.PI / 12);
  assert.ok(loadedTurn.rotation < looseTurn.rotation / 3, 'The same input moves the tool less as the fastener seats');
  assert.ok(getPracticeResistance(0.96) > getPracticeResistance(0.35));
  assert.equal(advancePracticeTurn(0.96, -0.5).progress, 0.96);
  const { before, after } = getInstructionDrawingTargets(mountingPart, basePart);
  assert.equal(before.shapeIds, basePart.shapeIds);
  assert.deepEqual(Array.from(after.shapeIds), [...basePart.shapeIds, ...mountingPart.shapeIds]);
  assert.equal(after.highlightShapeIds, mountingPart.shapeIds);
  assert.equal(before.bounds, after.bounds, 'Both views use the same framing');
  for (let axis = 0; axis < 3; axis++) {
    assert.equal(after.bounds.min[axis], Math.min(basePart.bounds.min[axis], mountingPart.bounds.min[axis]));
    assert.equal(after.bounds.max[axis], Math.max(basePart.bounds.max[axis], mountingPart.bounds.max[axis]));
  }
  assert.equal(createInstructionDrafts([mountingPart])[0].basePartNumber, undefined);
  const drafts = createInstructionDrafts([
    { ...grouped[0], name: 'Torx bolt' }, { ...grouped[1], name: 'Torx bolt' }, { ...grouped[2], name: 'Wire' },
  ]);
  assert.equal(drafts.length, 3);
  assert.notEqual(drafts[0].id, drafts[1].id, 'Repeated parts must be confirmed individually');
  assert.match(drafts[0].tool, /Torx/);
  assert.equal(drafts[0].torque, '작업지시서 확인 (N·m)');
  assert.match(drafts[0].description, /Torx 비트로 체결하세요/);
  assert.match(drafts[2].description, /경로로 배치하고.*연결하세요/);
  const mountingDrafts = createInstructionDrafts([
    { ...grouped[0], name: 'Washer' }, { ...grouped[1], name: 'PCB' }, { ...grouped[2], name: 'SP-RHM-003' },
  ]);
  assert.match(mountingDrafts[0].description, /와셔.*끼우세요/);
  assert.match(mountingDrafts[1].description, /기판.*고정하세요/);
  assert.match(mountingDrafts[2].description, /위치와 방향에 맞춰.*장착하세요/);
  assert.equal(mountingDrafts[0].torque, '해당 없음 (와셔 배치)');
  assert.equal(mountingDrafts[1].torque, '기판 체결부 규격 확인');
  assert.equal(mountingDrafts[2].torque, '체결 여부 확인');
  assert.ok(drafts.every((step) => step.section && step.description && step.tool && step.torque && !step.isConfirmed && step.basePartNumber === undefined));
  const [namedTorx] = createInstructionDrafts([{ ...mountingPart, name: 'Low profile torx, M2x5 v2' }]);
  assert.match(namedTorx.tool, /Torx/);
  assert.equal(namedTorx.torque, '작업지시서 확인 (N·m)', 'Thread dimensions alone do not specify installation torque');
  assert.equal(nextUnconfirmedInstruction(drafts, drafts[1].id).id, drafts[2].id);
  drafts[2].isConfirmed = true;
  assert.equal(nextUnconfirmedInstruction(drafts, drafts[1].id).id, drafts[0].id, 'Review wraps to earlier unconfirmed parts');
  drafts[0].isConfirmed = true;
  assert.equal(nextUnconfirmedInstruction(drafts, drafts[1].id), undefined, 'Review completes after the last outstanding part');
  const instructions = Array.from({ length: 8 }, (_, index) => ({
    id: String(index), section: index < 7 ? '조립' : '검사', partNumber: 1, description: '확인',
  }));
  const reordered = moveInstruction(instructions, '1', -1);
  assert.equal(reordered[0].id, '1');
  assert.equal(moveInstruction(reordered, '7', -1), reordered, 'A step cannot be reordered into a different section');
  const sheets = paginateInstructions(reordered);
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0][0].steps.length, 6);
  assert.equal(sheets[1][0].offset, 6, 'Step numbering continues on the next sheet');
  assert.equal(sheets[1][1].number, 2);
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
    await page.goto('http://localhost:3000/training/upload?mode=step', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[aria-label="STEP 조립품 업로드"]');
    const [chooser] = await Promise.all([page.waitForFileChooser(), click('STEP 파일 선택')]);
    await chooser.accept([cubeFile]);
    await complete();
    const drawing = '[aria-label="교육용 조립 도면"]';
    await click('교육용 도면 보기');
    await page.waitForFunction((selector) => {
      const figure = document.querySelector(selector + ' img');
      return figure?.complete && figure.naturalWidth > 0;
    }, { timeout: 20000 }, drawing);
    assert.equal(await page.$$eval(drawing + ' img', (nodes) => nodes.length), 1, 'An assembly drawing is available without selected parts or steps');
    await click('닫기');
    const part = '[aria-label="STEP 부품 목록"] button[aria-pressed]';
    await page.click(part);
    await page.waitForSelector(part + '[aria-pressed=true]');
    await click('교육용 도면 보기');
    await page.waitForSelector(drawing + ' img[alt$="부품 상세도"]', { timeout: 20000 });
    await click('닫기');
    await click('선택 부품만 보기'); await click('전체 보기');
    await page.type('input[aria-label="부품 검색"]', 'no-match');
    await page.waitForSelector(part, { hidden: true });
    const standaloneCanvas = await page.waitForSelector('[aria-label="3D 형상 표시 영역"] canvas');
    const standaloneBox = await standaloneCanvas.boundingBox();
    await page.mouse.click(standaloneBox.x + standaloneBox.width / 2, standaloneBox.y + standaloneBox.height / 2);
    await page.waitForSelector(part + '[aria-pressed=true]');
    await click('작업 단계 등록');
    const draftDescription = await page.$eval('dialog[open] textarea', (input) => input.value);
    assert.match(draftDescription, /위치와 방향에 맞춰.*장착하세요/);
    assert.equal(await page.$eval('dialog[open] button', (button) => button.disabled), true);
    const confirm = 'dialog[open] input[name="part-confirmed"]';
    assert.equal(await page.$eval(confirm, (input) => input.disabled), false, 'Registration can be confirmed without a comparison part');
    await page.click(confirm);
    await page.waitForSelector('[aria-label="조립 상세 3D"] canvas');
    await click('시트 미리보기');
    const sheet = '[aria-label="조립 순서 시트 1"]';
    await page.waitForFunction((selector) => {
      const drawings = document.querySelectorAll(selector + ' img');
      return drawings.length === 1 && drawings[0].complete && drawings[0].naturalWidth > 0;
    }, { timeout: 20000 }, sheet);
    assert.ok(await page.$eval(sheet, (node, description) => node.textContent.includes(description), draftDescription));
    assert.match(await page.$eval(sheet, (node) => node.textContent), /조립 위치.*주황색 장착 부품/);
    await click('조립 상세로');
    await click('단계 편집');
    assert.equal(await page.$eval(confirm, (input) => input.checked), true);
    await page.type('dialog[open] textarea', ' 확인');
    assert.equal(await page.$eval(confirm, (input) => input.checked), false, 'Editing a confirmed part requires reconfirmation');
    await click('닫기');
    await upload(Buffer.from('invalid STEP'), 'invalid.step', '가져올 STEP 선택');
    await page.waitForSelector('[data-step-status=error]');
    assert.match(await page.$eval('[role=alert]', (node) => node.textContent), /유효한 STEP/);
    assert.ok(await page.$(part), 'An invalid replacement preserves the current assembly');

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
