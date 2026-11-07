const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { Mesh, MeshBasicMaterial, Raycaster, Vector3 } = require('three');
const { loadModule, analyze, token, makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { FLANGE_FIELD_LIST } = loadModule('generate/flangeTypes');
const { toFlangeDraft, parseFlangeDraft, hasFlangeChanges, flangeHoleCenters } = loadModule('generate/flangeModel');
const { extractFlangeSource } = loadModule('generate/readFlangeSource');
const { buildFlangeGeometry } = loadModule('generate/buildFlangeGeometry');
const { createFlangeRecipe, decodeFlangeRecipe } = loadModule('generate/flangePersistence');
function fixture() {
  const values = [100, 30, 10, 70, 9, 4, 45];
  const tokens = [token('MODEL = FLANGE_V1', .1, .05), ...FLANGE_FIELD_LIST.map((field, index) => token(field.symbol + ' = ' + values[index] + (field.unit === 'mm' ? ' mm' : field.unit === '°' ? ' deg' : ''), .1, .1 + index * .05)),
    token('ITEM', .05, .6), token('PART NO', .15, .6), token('DESCRIPTION', .35, .6), token('QTY', .65, .6), token('MATERIAL', .8, .6),
    token('1', .05, .65), token('FLG-001', .15, .65), token('Training flange', .35, .65), token('1', .65, .65), token('AL6061', .8, .65), token('UNITS: mm', .1, .75)];
  const result = analyze(tokens);
  const pages = [{ ...result, pageNumber: 1, width: 800, height: 650, imageUrl: 'blob:fixture', textCount: 300, warningList: [] }];
  const source = { ...extractFlangeSource(pages), document: { sha256: 'a'.repeat(64), size: 5000, name: 'example.pdf', pageCount: 1 }, sourceUrl: 'blob:source', pageList: pages };
  return { source, tokens };
}
function checkModel() {
  const { source } = fixture(), values = source.values;
  assert.equal(values.parameters.outerDiameter, 100); assert.equal(values.parameters.holeCount, 4);
  assert.equal(values.part.partNumber, 'FLG-001'); assert.equal(values.part.material, 'AL6061');
  assert.equal(Object.keys(source.evidence).length, 7);
  const draft = toFlangeDraft(values);
  const invalid = (patch) => parseFlangeDraft({ ...draft, parameters: { ...draft.parameters, ...patch } }).issues;
  assert.ok(invalid({ outerDiameter: '' }).length); assert.ok(invalid({ thickness: 'Infinity' }).length);
  assert.ok(invalid({ holeCount: '3.5' }).length); assert.ok(invalid({ startAngle: '360' }).length);
  assert.match(invalid({ outerDiameter: '75' }).join(), /외곽/);
  assert.match(invalid({ innerDiameter: '65' }).join(), /중앙/);
  assert.match(invalid({ holeDiameter: '15', holeCount: '16' }).join(), /이웃/);
  assert.equal(invalid({ startAngle: '1e-7' }).length, 0, 'Small valid angles must survive numeric JSON roundtrips');
  const altered = { parameters: { ...values.parameters, outerDiameter: 120, thickness: 12, holeCount: 6 }, part: { ...values.part, name: 'Revised flange' } };
  for (const item of [values, altered]) {
    const geometry = buildFlangeGeometry(item), material = new MeshBasicMaterial(), mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    const p = item.parameters, positions = geometry.attributes.position;
    assert.ok(Math.abs(geometry.boundingBox.max.x - p.outerDiameter / 2) < .0001);
    assert.ok(Math.abs(geometry.boundingBox.min.z + p.thickness / 2) < .0001);
    const hits = (x, y) => new Raycaster(new Vector3(x, y, p.thickness + 10), new Vector3(0, 0, -1)).intersectObject(mesh);
    assert.equal(hits(0, 0).length, 0, 'Central bore must be a real through-hole');
    for (const center of flangeHoleCenters(p)) assert.equal(hits(center.x, center.y).length, 0, 'Every bolt hole must be a real opening');
    assert.ok(hits(0, p.innerDiameter / 2 + 2).length > 0, 'The flange web must be solid');
    let volume = 0;
    for (let index = 0; index < positions.count; index += 3) {
      const a = new Vector3().fromBufferAttribute(positions, index), b = new Vector3().fromBufferAttribute(positions, index + 1), c = new Vector3().fromBufferAttribute(positions, index + 2);
      volume += a.dot(b.cross(c)) / 6;
    }
    const expected = Math.PI / 4 * (p.outerDiameter ** 2 - p.innerDiameter ** 2 - p.holeCount * p.holeDiameter ** 2) * p.thickness;
    assert.ok(Math.abs(Math.abs(volume) - expected) / expected < .001, 'Mesh volume must follow the dimensioned flange with removed holes');
    geometry.dispose(); material.dispose();
  }
  const state = { source, draft: toFlangeDraft(altered), applied: altered, status: 'confirmed', confirmedAt: '2026-11-04T10:00:00.000Z', isDirty: true };
  assert.equal(hasFlangeChanges(state.draft, state.applied), false);
  const recipe = createFlangeRecipe(state), raw = JSON.stringify(recipe);
  assert.equal(raw.includes('blob:'), false);
  assert.equal(recipe.source.values.parameters.outerDiameter, 100);
  assert.equal(recipe.values.parameters.outerDiameter, 120);
  assert.equal(decodeFlangeRecipe(raw, source).values.parameters.holeCount, 6);
  assert.equal(decodeFlangeRecipe(raw, { ...source, document: { ...source.document, name: 'renamed.pdf' } }).status, 'confirmed');
  assert.throws(() => decodeFlangeRecipe(raw, { ...source, document: { ...source.document, sha256: 'b'.repeat(64) } }), /다른 PDF/);
  assert.throws(() => createFlangeRecipe({ ...state, draft: { ...state.draft, parameters: { ...state.draft.parameters, thickness: '15' } } }), /다시 생성/);
  assert.throws(() => decodeFlangeRecipe(JSON.stringify({ ...recipe, values: { ...altered, parameters: { ...altered.parameters, holeCount: 2.5 } } }), source), /정수/);
  assert.throws(() => decodeFlangeRecipe(JSON.stringify({ ...recipe, confirmedAt: null }), source), /검토 상태/);
  console.log('PASS PDF 3D: labelled source extraction, dimensional/overlap checks, true bores, mesh volume, regenerated geometry, provenance, pending-edit protection and JSON roundtrip');
}
async function checkBrowser() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.join(os.tmpdir(), 'hanwha-pdf-model-example-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
    const client = await page.createCDPSession(); await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
    const errors = [], aiRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /hydration|hydrated|script tag|Unhandled/i.test(message.text())) errors.push(message.text()); });
    page.on('request', (request) => { if (/anthropic|api\.openai|generations|meshy/i.test(request.url())) aiRequests.push(request.url()); });
    const click = require('./browser-ui-helpers.cjs').makeClick(page);
    const setInput = (label, value) => page.$eval('input[aria-label="' + label + '"]', (input, text) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text); input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    const upload = (bytes, name, label) => page.$eval('input[aria-label="' + label + '"]', (input, data, fileName) => {
      const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(data)], fileName)); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, [...bytes], name);
    const ready = () => page.waitForSelector('[data-model-status=draft], [data-model-status=confirmed]', { timeout: 30000 });
    const captureDownloads = () => page.evaluate(() => { const original = URL.createObjectURL; URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__exampleJson = blob; if (blob.type === 'model/gltf-binary') window.__exampleGlb = blob; return original.call(this, blob); }; });
    const exportJson = async () => { await click('생성 JSON 내보내기'); return page.evaluate(async () => JSON.parse(await window.__exampleJson.text())); };
    await page.goto('http://localhost:3000/training/upload-dev?example=flange', { waitUntil: 'networkidle0' }); await ready(); await captureDownloads();
    await page.waitForSelector('[aria-label="생성된 플랜지 3D 표시 영역"] canvas');
    const original = await exportJson();
    assert.equal(original.values.parameters.outerDiameter, 100); assert.equal(original.values.parameters.holeCount, 4);
    assert.equal(original.source.evidence.outerDiameter.text, 'OD = 100 mm');
    assert.equal(original.values.part.partNumber, 'FLG-001');
    assert.match(original.document.sha256, /^[a-f0-9]{64}$/);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await page.screenshot({ path: path.join(output, 'example-original-1920.png') });
    await setInput('생성 외경', '120'); await setInput('생성 볼트 구멍 개수', '6'); await setInput('생성 두께', '12');
    await page.waitForSelector('[data-model-status=pending]');
    assert.equal(await page.$$eval('button', (nodes) => nodes.find((node) => node.textContent === '생성 결과 저장').disabled), true);
    assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 100 mm/);
    await click('3D 다시 생성'); await ready();
    assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 120 mm.*두께 12 mm.*구멍 6개/);
    await page.click('button[aria-label="HOLE_COUNT 원문 위치 확인"]');
    assert.match(await page.$eval('[aria-label="검토 원문 도면"]', (node) => node.textContent), /HOLE_COUNT = 4/);
    await page.waitForSelector('[aria-label="검토 원문 강조 위치"]');
    await click('부품 정보'); await setInput('생성 품명', 'Revised training flange'); await click('3D 다시 생성');
    await click('이 모델 검토 확정'); await page.waitForSelector('[data-model-status=confirmed]'); await click('생성 결과 저장');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('이 브라우저에 저장했습니다'));
    const revised = await exportJson();
    assert.equal(revised.values.parameters.holeCount, 6); assert.equal(revised.values.parameters.outerDiameter, 120);
    assert.equal(revised.source.values.parameters.holeCount, 4); assert.equal(revised.source.values.parameters.outerDiameter, 100);
    assert.equal(revised.values.part.name, 'Revised training flange'); assert.equal(revised.status, 'confirmed');
    await click('3D 내보내기 · GLB');
    await page.waitForFunction(() => !!window.__exampleGlb, { timeout: 30000 });
    const glb = await page.evaluate(async () => [...new Uint8Array(await window.__exampleGlb.arrayBuffer())]);
    const buffer = Buffer.from(glb); assert.equal(buffer.toString('ascii', 0, 4), 'glTF'); assert.equal(buffer.readUInt32LE(8), buffer.length);
    const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
    const node = gltf.nodes.find((node) => node.name === 'FLG-001');
    assert.equal(node.extras.parameters.outerDiameter, 120); assert.equal(node.extras.parameters.holeCount, 6);
    assert.equal(node.extras.reviewStatus, 'confirmed'); assert.equal(node.scale?.[0] ?? node.matrix[0], .001);
    assert.ok(gltf.accessors.some((accessor) => accessor.type === 'VEC3' && Math.abs(accessor.max?.[0] - 60) < .001), 'GLB vertices must reflect the edited outer diameter');
    await click('입력 데이터');
    const data = JSON.parse(await page.$eval('[aria-label="3D 생성 입력 데이터"]', (node) => node.value));
    assert.equal(data.values.parameters.holeCount, 6); assert.equal(data.source.values.parameters.holeCount, 4); assert.equal(data.derivedHoleCentersMm.length, 6);
    await page.screenshot({ path: path.join(output, 'example-data-1920.png') });
    await click('치수 7개');
    await setInput('생성 외경', '60'); await page.waitForSelector('[aria-label="PDF 3D 입력값 편집"] [role=alert]');
    assert.match(await page.$eval('[aria-label="PDF 3D 입력값 편집"] [role=alert]', (node) => node.textContent), /외곽/);
    assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 120 mm/);
    assert.equal(await page.$$eval('button', (nodes) => nodes.find((node) => node.textContent === '3D 다시 생성').disabled), true);
    await setInput('생성 외경', '125'); await click('3D 다시 생성'); await page.waitForSelector('[data-model-status=draft]');
    await click('도면 분석으로'); await click('PDF → 3D 예시'); await ready();
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '125', 'Leaving the example must preserve unsaved inputs within the page');
    await page.reload({ waitUntil: 'networkidle0' }); await ready(); await captureDownloads();
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '120', 'Reload must restore the last explicitly saved version');
    await page.waitForSelector('[data-model-status=confirmed]');
    const wrong = { ...revised, document: { ...revised.document, sha256: '0'.repeat(64) } };
    await upload(Buffer.from(JSON.stringify(wrong)), 'wrong.json', '3D 생성 JSON 선택');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('다른 PDF'));
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '120');
    await click('PDF 원문 값으로'); await page.waitForSelector('[data-model-status=draft]');
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '100');
    await upload(Buffer.from(JSON.stringify(revised)), 'revised.json', '3D 생성 JSON 선택');
    await page.waitForSelector('[data-model-status=confirmed]');
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '120');
    await page.evaluate(() => { window.__storageSet = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key.startsWith('hanwha.pdf-model-example.v1.')) throw new DOMException('Full', 'QuotaExceededError'); return window.__storageSet.call(this, key, value); }; });
    await click('생성 결과 저장'); await page.waitForFunction(() => document.querySelector('footer').textContent.includes('저장하지 못했습니다'));
    await page.evaluate(() => { Storage.prototype.setItem = window.__storageSet; });
    await upload(makePdfFixture(1), 'unsupported.pdf', '3D 생성용 PDF 선택');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('FLANGE_V1'));
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '120');
    // A changed, labelled PDF must drive fresh source values rather than using hardcoded defaults.
    const changedTokens = fixture().tokens.map((item) => item.text === 'OD = 100 mm' ? { ...item, text: 'OD = 140 mm' } : item);
    await upload(makePdfFixture(1, [changedTokens]), 'new-flange.pdf', '3D 생성용 PDF 선택');
    await page.waitForFunction(() => document.querySelector('input[aria-label="생성 외경"]')?.value === '140', { timeout: 30000 });
    await ready(); assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 140 mm/);
    await click('선으로 보기'); await click('면으로 보기'); await click('시점 초기화');
    for (const [width, height] of [[1920, 1080], [1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height }); await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
      await page.screenshot({ path: path.join(output, 'example-edited-' + width + '.png') });
    }
    assert.deepEqual(errors, []); assert.deepEqual(aiRequests, []);
    console.log('PASS browser PDF 3D: real PDF inputs, editable/regenerated mesh, source highlights, JSON data, confirmation invalidation, save/reload/import, true GLB export, overlap rejection, unsupported PDF recovery, changed-PDF extraction and HD/FHD/QHD');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
if (require.main === module) (async () => { checkModel(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { fixture };
