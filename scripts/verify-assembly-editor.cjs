const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector3 } = require('three');
const { loadModule } = require('./verify-drawing-upload-dev.cjs');
const { createAssemblyExample, getAssemblyAnchors } = loadModule('assembly/assemblyTemplate');
const { validateAssembly, previewAssemblyDraft, toAssemblyDraft, sameAssemblyParts } = loadModule('assembly/assemblyModel');
const { resolveAssembly, freeAssemblyPart, assemblyBounds } = loadModule('assembly/assemblyTransforms');
const { decodeAssembly, ASSEMBLY_STORAGE_KEY } = loadModule('assembly/assemblyPersistence');
const { buildAssemblyGeometry } = loadModule('assembly/buildAssemblyGeometry');
const clone = (value) => JSON.parse(JSON.stringify(value));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, actual + ' != ' + expected);
const origin = (matrix) => matrix.elements.slice(12, 15);
function checkModel() {
  const example = createAssemblyExample(), initial = resolveAssembly(example);
  assert.equal(validateAssembly(example).length, 0); assert.equal(example.partList.length, 10);
  assert.equal(example.partList.filter((part) => part.relation.parentId).length, 9);
  close(origin(initial.get('flange'))[2], 9); close(origin(initial.get('bolt-1'))[2], 14); close(origin(initial.get('nut-1'))[2], -7);
  for (const part of example.partList.filter((part) => part.relation.parentId)) {
    const parent = example.partList.find((item) => item.id === part.relation.parentId);
    const a = getAssemblyAnchors(parent.kind).find((anchor) => anchor.id === part.relation.targetAnchorId);
    const b = getAssemblyAnchors(part.kind).find((anchor) => anchor.id === part.relation.ownAnchorId);
    close(new Vector3(...a.position).applyMatrix4(initial.get(parent.id)).distanceTo(new Vector3(...b.position).applyMatrix4(initial.get(part.id))), 0);
  }
  const moved = clone(example); moved.partList[0].position = [12, -7, 3]; moved.partList[1].position[2] = 8;
  const transformed = resolveAssembly(moved);
  for (const part of moved.partList) {
    close(origin(transformed.get(part.id))[0] - origin(initial.get(part.id))[0], 12);
    close(origin(transformed.get(part.id))[1] - origin(initial.get(part.id))[1], -7);
    close(origin(transformed.get(part.id))[2] - origin(initial.get(part.id))[2], 3 + (part.id === 'base' ? 0 : 8));
  }
  moved.partList[1].rotation = [12, -15, 30];
  const rotated = resolveAssembly(moved), bolt = moved.partList.find((part) => part.id === 'bolt-1');
  const free = freeAssemblyPart(bolt, rotated.get(bolt.id));
  const detached = { ...moved, partList: moved.partList.map((part) => part.id === bolt.id ? free : part) };
  const freeMatrix = resolveAssembly(detached).get(bolt.id);
  rotated.get(bolt.id).elements.forEach((value, index) => close(freeMatrix.elements[index], value));
  const draft = toAssemblyDraft(example.partList[1]); draft.position[2] = '8';
  assert.equal(previewAssemblyDraft(example, 'flange', draft).document.partList[1].position[2], 8);
  assert.ok(previewAssemblyDraft(example, 'flange', { ...draft, position: ['', '0', '0'] }).issues.length);
  assert.ok(previewAssemblyDraft(example, 'flange', { ...draft, rotation: ['0', '0', '361'] }).issues.length);
  const cycle = clone(example); cycle.partList[1].relation.parentId = 'nut-1'; cycle.partList[1].relation.targetAnchorId = 'top';
  assert.match(validateAssembly(cycle).join(), /순환/); assert.throws(() => decodeAssembly(JSON.stringify(cycle)), /순환/);
  const bad = (mutate) => { const data = clone(example); mutate(data); assert.throws(() => decodeAssembly(JSON.stringify(data))); };
  bad((data) => { data.partList[1].relation.parentId = 'missing'; });
  bad((data) => { data.partList[1].relation.targetAnchorId = 'missing'; });
  bad((data) => { data.partList[1].relation.parentId = 'flange'; });
  bad((data) => { data.partList[2].relation.type = 'thread'; });
  bad((data) => { data.partList[0].position[0] = 5001; });
  bad((data) => { data.partList[0].position[0] = null; });
  bad((data) => { data.partList[0].position = [0, 0]; });
  bad((data) => { data.partList[1] = data.partList[0]; });
  bad((data) => { data.templateId = 'unknown'; });
  bad((data) => { data.unit = 'm'; });
  assert.deepEqual(clone(decodeAssembly(JSON.stringify(moved))), moved);
  assert.equal(sameAssemblyParts(example.partList, clone(example.partList).reverse().map((part) => ({ ...part, relation: Object.fromEntries(Object.entries(part.relation).reverse()) }))), true);
  assert.equal(sameAssemblyParts(example.partList, moved.partList), false);
  for (const kind of ['base', 'flange', 'bolt', 'nut']) {
    const geometry = buildAssemblyGeometry(kind), material = new MeshBasicMaterial(), mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    assert.ok(geometry.attributes.position.count > 0);
    assert.equal(Array.from(geometry.attributes.position.array).every(Number.isFinite), true);
    const centralHits = new Raycaster(new Vector3(0, 0, 100), new Vector3(0, 0, -1)).intersectObject(mesh);
    assert.equal(centralHits.length > 0, kind === 'bolt', kind + ' must have the intended solid/bore');
    geometry.dispose(); material.dispose();
  }
  console.log('PASS assembly model: 10 parts, real mating anchors, hierarchy translation/rotation, free placement preservation, geometry bores, numeric validation, cycle/type/anchor rejection and JSON roundtrip');
}
async function checkBrowser() {
  const browser = await require('puppeteer').launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.join(os.tmpdir(), 'hanwha-assembly-editor-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /hydration|hydrated|script tag|Unhandled|Cannot read/i.test(message.text())) errors.push(message.text()); });
    const client = await page.createCDPSession(); await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
    const click = require('./browser-ui-helpers.cjs').makeClick(page);
    const edit = async (label, value) => {
      await page.click('input[aria-label="' + label + '"]'); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      if (value) await page.keyboard.type(value); else await page.keyboard.press('Backspace');
      await page.keyboard.press('Tab');
    };
    const select = async (id) => { await page.click('[data-assembly-part="' + id + '"]'); await page.waitForSelector('[data-editing-part="' + id + '"]'); };
    const choose = (label, value) => page.select('select[aria-label="' + label + '"]', value);
    const ready = () => page.waitForSelector('[data-assembly-status=ready]', { timeout: 30000 });
    const capture = () => page.evaluate(() => { const original = URL.createObjectURL; URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__assemblyJson = blob; return original.call(this, blob); }; });
    const data = async () => { await click('조립품 JSON 내보내기'); return page.evaluate(async () => JSON.parse(await window.__assemblyJson.text())); };
    const world = () => page.$eval('[aria-label="선택 부품 실제 위치"]', (node) => [Number(node.dataset.worldX), Number(node.dataset.worldY), Number(node.dataset.worldZ)]);
    const waitCanvas = async () => { const canvas = await page.waitForSelector('[aria-label="조립품 3D 표시 영역"] canvas'); await page.waitForFunction(() => document.querySelector('canvas')?.width > 1); await new Promise((resolve) => setTimeout(resolve, 500)); return canvas; };
    const uploadJson = async (document, name) => {
      const filename = path.join(output, name); fs.writeFileSync(filename, JSON.stringify(document));
      const input = await page.$('input[aria-label="조립품 JSON 선택"]'); await input.uploadFile(filename);
    };
    await page.goto('http://localhost:3000/training/upload-dev', { waitUntil: 'networkidle0' }); await capture();
    await click('조립품 편집 예시'); await ready();
    assert.equal(await page.$$eval('[data-assembly-part]', (nodes) => nodes.length), 10);
    const initial = await data(), canvas = await waitCanvas(), rect = await canvas.boundingBox();
    await page.screenshot({ path: path.join(output, 'assembly-original-1920.png') });
    // Project the first bolt head to the canvas and click it: this verifies
    // instance picking independently of the part-list buttons.
    const bounds = assemblyBounds(initial, resolveAssembly(initial), false), radius = bounds.getSize(new Vector3()).length() / 2, center = bounds.getCenter(new Vector3());
    const camera = new PerspectiveCamera(35, rect.width / rect.height, .01, 20000);
    const half = Math.min(35 * Math.PI / 360, Math.atan(Math.tan(35 * Math.PI / 360) * rect.width / rect.height));
    camera.up.set(0, 0, 1); camera.position.copy(new Vector3(1.3, -1.6, 1.35).normalize().multiplyScalar(radius / Math.sin(half) * 1.12).add(center)); camera.lookAt(center); camera.updateMatrixWorld(true);
    const hit = new Vector3(0, 0, 4).applyMatrix4(resolveAssembly(initial).get('bolt-1')).project(camera);
    await page.mouse.click(rect.x + (hit.x + 1) * rect.width / 2, rect.y + (1 - hit.y) * rect.height / 2);
    await page.waitForSelector('[data-editing-part="bolt-1"]', { timeout: 3000 });
    const beforeOrbit = await canvas.screenshot();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 70, rect.y + rect.height / 2 + 30, { steps: 12 }); await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.notEqual(createHash('sha256').update(beforeOrbit).digest('hex'), createHash('sha256').update(await canvas.screenshot()).digest('hex'));
    await click('전체 맞춤');
    await select('base'); await edit('조립품 위치 X', '12'); close((await world())[0], 12);
    await select('flange'); close((await world())[0], 12); await edit('조립품 위치 Z', '8'); close((await world())[2], 17);
    await click('결합 관계'); await click('결합점에 맞추기'); await click('위치·회전'); close((await world())[2], 9);
    await edit('조립품 위치 Z', '8');
    await select('bolt-1'); close((await world())[2], 22); await edit('조립품 위치 X', '5'); await edit('조립품 회전 Z', '30');
    const attached = await world();
    await click('결합 관계'); await choose('조립품 기준 부품', '');
    assert.equal(await page.$eval('select[aria-label="조립품 결합 종류"]', (node) => node.value), 'free', 'Removing the reference part must safely switch to free placement');
    await click('위치·회전'); (await world()).forEach((value, index) => close(value, attached[index]));
    await click('결합 관계'); await choose('조립품 결합 종류', 'insert'); await choose('조립품 기준 부품', 'base'); await choose('조립품 기준 결합점', 'hole-2-top');
    await click('위치·회전'); close((await world())[2], 4);
    await select('nut-1'); close((await world())[2], -17); await edit('조립품 회전 Z', '45');
    await edit('조립품 위치 Y', ''); await page.waitForSelector('[aria-label="조립품 부품 편집"] [role=alert]');
    assert.equal(await page.$$eval('button', (nodes) => nodes.find((node) => node.textContent === '조립품 저장').disabled), true);
    await select('flange'); await select('nut-1');
    assert.equal(await page.$eval('input[aria-label="조립품 위치 Y"]', (node) => node.value), '');
    await click('입력 데이터');
    await page.waitForSelector('dialog[open] [aria-label="조립품 입력 데이터"]');
    const pendingData = JSON.parse(await page.$eval('[aria-label="조립품 입력 데이터"]', (node) => node.value));
    assert.equal(pendingData.draftInputs['nut-1'].position[1], '');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { hidden: true });
    await click('도면 분석으로'); await click('조립품 편집 예시');
    await page.waitForSelector('[data-assembly-status=pending]');
    assert.equal(await page.$eval('input[aria-label="조립품 위치 Y"]', (node) => node.value), '', 'Switching modes must preserve uncommitted per-part input');
    await click('미적용 입력 취소'); await ready();
    await select('flange'); await click('결합 관계'); await choose('조립품 기준 부품', 'nut-2');
    await page.waitForSelector('[aria-label="조립품 부품 편집"] [role=alert]');
    assert.match(await page.$eval('[aria-label="조립품 부품 편집"] [role=alert]', (node) => node.textContent), /순환/);
    assert.equal(await page.$$eval('button', (nodes) => nodes.find((node) => node.textContent === '조립품 저장').disabled), true);
    await click('미적용 입력 취소'); await click('위치·회전'); await ready();
    await click('분해 미리보기'); await page.waitForSelector('[data-assembly-exploded=true]');
    const exploded = await data(); assert.equal(exploded.partList[1].position[2], 8, 'Exploded preview must not alter stored placement');
    await page.screenshot({ path: path.join(output, 'assembly-exploded-1920.png') });
    await click('조립 상태 보기'); await select('bolt-1'); await click('선택 부품만 표시'); await waitCanvas(); await click('모든 부품 표시');
    await click('조립품 저장'); await page.waitForFunction(() => document.querySelector('footer').textContent.includes('조립품을 이 브라우저에 저장했습니다'));
    const saved = await data();
    assert.equal(saved.partList.find((part) => part.id === 'base').position[0], 12);
    assert.equal(saved.partList.find((part) => part.id === 'flange').position[2], 8);
    assert.equal(saved.partList.find((part) => part.id === 'bolt-1').relation.parentId, 'base');
    assert.equal(saved.partList.find((part) => part.id === 'bolt-1').relation.targetAnchorId, 'hole-2-top');
    assert.equal(saved.partList.find((part) => part.id === 'nut-1').rotation[2], 45);
    await page.reload({ waitUntil: 'networkidle0' }); await capture(); await click('조립품 편집 예시'); await ready(); await waitCanvas();
    assert.deepEqual((await data()).partList, saved.partList, 'All placements and relations must survive a full reload');
    await select('base'); await edit('조립품 위치 X', '20'); await click('저장값 복원'); close((await world())[0], 12);
    await click('예시 초기화'); const reset = await data(); assert.equal(reset.partList[0].position[0], 0);
    await uploadJson(saved, 'valid-assembly.json'); await ready();
    assert.deepEqual((await data()).partList, saved.partList);
    const invalid = clone(saved); invalid.partList[1].relation.parentId = 'flange';
    await uploadJson(invalid, 'invalid-assembly.json'); await page.waitForFunction(() => document.querySelector('footer').textContent.includes('자기 자신'));
    assert.deepEqual((await data()).partList, saved.partList, 'Rejected JSON must preserve the current assembly');
    await page.evaluate(() => { window.__storageSet = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key.startsWith('hanwha.assembly-editor.v1.')) throw new DOMException('Full', 'QuotaExceededError'); return window.__storageSet.call(this, key, value); }; });
    await click('조립품 저장'); await page.waitForFunction(() => document.querySelector('footer').textContent.includes('저장하지 못했습니다'));
    await page.evaluate(() => { Storage.prototype.setItem = window.__storageSet; });
    await page.evaluate((key) => localStorage.setItem(key, 'broken'), ASSEMBLY_STORAGE_KEY); await click('저장값 복원');
    assert.deepEqual((await data()).partList, saved.partList, 'Corrupt storage must not overwrite the current model');
    await page.evaluate((key, raw) => localStorage.setItem(key, raw), ASSEMBLY_STORAGE_KEY, JSON.stringify(saved));
    await click('저장값 복원'); await click('위치·회전'); await select('flange'); await waitCanvas();
    for (const [width, height] of [[1920, 1080], [1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height }); await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
      await page.screenshot({ path: path.join(output, 'assembly-restored-' + width + '.png') });
    }
    await page.goto('http://localhost:3000/training/upload?example=assembly', { waitUntil: 'networkidle0' }); await ready();
    assert.deepEqual(errors, []);
    console.log('PASS browser assembly: native 3D instance picking/orbit, hierarchy position/rotation editing, relation changes, free-placement preservation, pending-input retention, cycle prevention, exploded/isolate previews, save/reload/restore, JSON and storage errors, direct entry and HD/FHD/QHD');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
if (require.main === module) (async () => { checkModel(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
