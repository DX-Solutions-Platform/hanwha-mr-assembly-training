const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Box3, Color, Raycaster, Vector3 } = require('three');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { makePdfFixture, token } = require('./verify-drawing-upload-dev.cjs');
const { makeClick } = require('./browser-ui-helpers.cjs');

const base = process.env.LIBRARY_TEST_URL;
const drawing = process.env.DRAWING_DRAFT_PDF ?? path.join(os.homedir(), 'Downloads', 'bekvaem-step-stool-aspen__AA-323406-9-2.pdf');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-drawing-draft-qa-'));
const partNumber = 'DRAFT-' + randomBytes(3).toString('hex').toUpperCase();
const fixture = (name, texts, drawingCommands) => {
  const file = path.join(output, name + '.pdf');
  fs.writeFileSync(file, makePdfFixture(1, [texts], drawingCommands ? [drawingCommands] : undefined));
  return file;
};

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Use an isolated server and temporary PART_LIBRARY_DATA_DIR.');
  assert.ok(fs.existsSync(drawing), 'Set DRAWING_DRAFT_PDF to the BEKVÄM manual.');
  const renamedDrawing = path.join(output, 'renamed.pdf');
  fs.copyFileSync(drawing, renamedDrawing);
  const supplement = fixture('dimensions', [token('220 mm', .18, .2), token('340 mm', .18, .27), token('255 mm', .18, .34)]);
  const nextDrawing = fixture('reuse', [token('PART NO = ' + partNumber, .12, .14), token('PART NAME = Step stool', .12, .19), token('QTY = 2', .12, .24), token('MATERIAL = SUS316', .12, .29)]);
  const unknown = fixture('unsupported-perspective', [], '1.5 w 140 620 m 350 660 l 480 597 l 260 550 l h S 140 620 m 140 420 l 260 350 l 480 390 l 480 597 l S 260 550 m 260 350 l S');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage(), errors = [], modelUrls = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.url().includes('?use=assembly') && response.ok()) modelUrls.push(response.url()); });
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page);
    const upload = async (file) => {
      await page.goto(base + '/training/upload?qwen=off', { waitUntil: 'networkidle0' });
      await (await page.waitForSelector('input[aria-label="분석할 PDF 선택"]')).uploadFile(file);
    };
    const waitButton = (label) => page.waitForFunction((text) => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === text && !button.disabled), { timeout: 90000 }, label);
    const waitCanvas = async () => {
      await page.waitForSelector('[data-drawing-draft-ready=true]');
      return page.waitForSelector('[aria-label="도면 입체 미리보기"] canvas');
    };
    const openDraft = async () => {
      await page.waitForSelector('[data-pdf-model-support=supported]');
      await waitButton('3D 초안 열기'); await click('3D 초안 열기');
      return waitCanvas();
    };
    const field = (label) => 'input[aria-label="' + label + '"]';
    const value = (label) => page.$eval(field(label), (node) => node.value);
    const edit = async (label, text) => {
      await page.click(field(label)); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(text); await page.keyboard.press('Tab');
    };
    const canvasImage = async (canvas) => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const png = await canvas.screenshot();
        const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
        let lit = 0;
        for (let index = 0; index < data.length; index += info.channels) {
          if (Math.max(data[index], data[index + 1], data[index + 2]) > 95) lit++;
        }
        if (lit > 1500) return png;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new Error('No solid geometry rendered.');
    };
    await upload(drawing);
    let canvas = await openDraft();
    assert.match(await page.$eval('[data-drawing-draft-ready=true]', (node) => node.textContent), /비율 초안/);
    assert.equal(await value('초안 가로'), '');
    const initial = await canvasImage(canvas);
    await page.screenshot({ path: path.join(output, 'bekvam-initial.png') });
    await click('측면 보기');
    await page.waitForFunction(() => document.querySelector('[data-drawing-draft-ready=true] canvas'));
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.notDeepEqual(await canvasImage(canvas), initial);
    await page.screenshot({ path: path.join(output, 'bekvam-side.png') });
    await click('시점 초기화');
    await click('도면 영역 선택');
    await page.waitForSelector('[aria-label="도면 형상 영역 선택"]');
    const move = async (direction, count) => { for (let index = 0; index < count; index++) await page.keyboard.press(direction); };
    await page.keyboard.down('Shift');
    await move('ArrowLeft', 4); await move('ArrowUp', 2);
    await page.keyboard.up('Shift'); await page.keyboard.press('Enter');
    await page.keyboard.down('Shift');
    await move('ArrowRight', 8); await move('ArrowDown', 4);
    await page.keyboard.up('Shift'); await page.keyboard.press('Enter');
    canvas = await waitCanvas();
    await canvasImage(canvas);
    await click('외관');
    await page.select('[aria-label="외관 프리셋"]', 'builtin:0');
    assert.equal(await value('모델 색상'), '#d6c2a3');
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.notDeepEqual(await canvasImage(canvas), initial);
    await page.select('[aria-label="외관 프리셋"]', 'builtin:1');
    await edit('모델 실제 재질', 'SUS316');
    await edit('모델 표면 처리', '헤어라인');
    await edit('모델 색상 코드', 'SHOP-S316');
    await edit('외관 프리셋 이름', '현장 실버 시험');
    await click('프리셋 저장');
    await click('치수');
    await (await page.$('input[aria-label="보조 치수 도면 PDF 선택"]')).uploadFile(supplement);
    const pick = async (label, millimeters) => {
      const selector = 'select[aria-label="' + label + ' 치수 원문에서 선택"]';
      const option = await page.waitForFunction((selector, label) => [...(document.querySelector(selector)?.options ?? [])].find((item) => item.textContent === label)?.value, {}, selector, '보조 1쪽 · ' + millimeters + ' mm');
      await page.select(selector, await option.jsonValue());
    };
    await pick('가로', 220); await pick('세로', 340); await edit('초안 깊이', '255');
    assert.equal(await value('초안 가로'), '220');
    assert.equal(await value('초안 세로'), '340');
    await page.waitForSelector('[aria-label="검토 원문 강조 위치"]');
    await click('부품 정보');
    await edit('초안 부품번호', partNumber); await edit('초안 수량', '1');
    await click('초안 저장');
    await upload(renamedDrawing); canvas = await openDraft();
    assert.equal(await value('초안 가로'), '220');
    assert.equal(await value('초안 세로'), '340');
    assert.equal(await value('초안 깊이'), '255');
    await click('외관');
    assert.equal(await value('모델 실제 재질'), 'SUS316');
    assert.equal(await value('모델 표면 처리'), '헤어라인');
    await page.select('[aria-label="외관 프리셋"]', 'builtin:0');
    await page.select('[aria-label="외관 프리셋"]', 'local:0');
    assert.equal(await value('모델 색상 코드'), 'SHOP-S316');
    await click('이 모델 검토 확정');
    await click('라이브러리에 GLB 등록'); await click('등록하고 조립에 반영');
    await page.waitForSelector('#part-library-code');
    await page.type('#part-library-code', '0000'); await click('관리자 코드 확인');
    await page.waitForSelector('[data-assembly-status=ready]');
    const url = modelUrls[0], bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), 'glTF');
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const extras = gltf.nodes.find((node) => node.extras?.generationMethod === 'step-stool-from-pdf')?.extras;
    assert.ok(extras);
    assert.equal(extras.part.material, 'SUS316');
    assert.equal(extras.appearance.treatment, '헤어라인');
    assert.equal(extras.appearance.colorCode, 'SHOP-S316');
    assert.deepEqual(extras.parameters, { width: 220, height: 340, depth: 255 });
    assert.match(extras.dimensionSources.width, /dimensions\.pdf.*220 mm/);
    const pbr = gltf.materials[0].pbrMetallicRoughness;
    assert.equal(pbr.metallicFactor, .84); assert.equal(pbr.roughnessFactor, .19);
    assert.ok(Math.abs(pbr.baseColorFactor[0] - new Color('#c9d0d6').r) < 1e-5);
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
    const bounds = new Box3().setFromObject(scene, true).getSize(new Vector3()).toArray();
    [.220, .340, .255].forEach((length, axis) => assert.ok(Math.abs(bounds[axis] - length) < 1e-5, 'Measured geometry did not match the GLB bounding box'));
    const leftRear = scene.getObjectByName('left-rear-leg'), rightFront = scene.getObjectByName('right-front-leg');
    const top = scene.getObjectByName('top-platform'), step = scene.getObjectByName('lower-step');
    assert.ok(leftRear?.isMesh && rightFront?.isMesh && top?.isMesh && step?.isMesh);
    const rearPosition = leftRear.getWorldPosition(new Vector3()), frontPosition = rightFront.getWorldPosition(new Vector3());
    assert.ok(frontPosition.z - rearPosition.z > .16 && frontPosition.x - rearPosition.x > .18);
    assert.ok(top.getWorldPosition(new Vector3()).y - step.getWorldPosition(new Vector3()).y > .16);
    const handle = top.localToWorld(new Vector3(0, 0, -.16));
    const ray = new Raycaster(new Vector3(handle.x, handle.y + 1, handle.z), new Vector3(0, -1, 0));
    assert.equal(ray.intersectObject(top).length, 0, 'The handle must be an actual through-hole');
    ray.ray.origin.x += .07;
    assert.ok(ray.intersectObject(top).length > 0, 'A ray beside the handle must hit solid wood');
    console.log('PASS actual PDF, side view and clipped region, independent legs/platforms, through-hole, GLB bounds, appearance and draft restore');

    await page.goto(base + '/part-library', { waitUntil: 'networkidle0' });
    await page.click('[data-library-number="' + partNumber + '"]');
    await click('외관 설정');
    await page.waitForSelector('dialog[open]');
    assert.equal(await value('모델 색상 코드'), 'SHOP-S316');
    await page.select('[aria-label="외관 프리셋"]', 'builtin:3');
    await click('외관 저장');
    await page.waitForFunction(() => document.querySelector('[aria-label="선택 부품 상세"]')?.textContent.includes('RAL 7035'));
    const response = await fetch(base + '/api/part-library/lookup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numbers: [partNumber] }),
    });
    const match = (await response.json()).matches[0];
    assert.equal(match.appearance.finish, 'satin');
    assert.equal(match.appearance.treatment, '분체도장');
    await upload(nextDrawing); await waitButton('라이브러리 3D 조립 · 2개');
    await click('라이브러리 3D 조립 · 2개');
    await page.waitForSelector('[data-assembly-status=ready]');
    assert.equal(await page.$$eval('[data-assembly-part]', (nodes) => nodes.length), 2);
    assert.equal(modelUrls.at(-1), url);
    await upload(unknown);
    await waitButton('도면 영역 확인'); await click('도면 영역 확인');
    await page.waitForSelector('[data-drawing-draft-ready=false]');
    assert.equal(await page.$('[aria-label="도면 입체 미리보기"] canvas'), null);
    await click('STEP 파일 연결');
    await page.waitForSelector('[aria-label="STEP 부품 연결 작업 화면"]');
    assert.deepEqual(errors, []);
    console.log('PASS library appearance and GLB reuse, unrecognized perspective held without a relief model, working STEP route');
    console.log('Screenshot: ' + path.join(output, 'bekvam-initial.png'));
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
