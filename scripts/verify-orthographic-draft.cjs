const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { Box3, Color, Raycaster, Vector3 } = require('three');
const { makePdfFixture, token } = require('./verify-drawing-upload-dev.cjs');
const { makeClick } = require('./browser-ui-helpers.cjs');

const base = process.env.LIBRARY_TEST_URL;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-orthographic-qa-'));
const buildId = randomBytes(3).toString('hex').toUpperCase();

function pdf(name, pageText, pageShapes) {
  const file = path.join(output, name + '.pdf');
  fs.writeFileSync(file, makePdfFixture(pageShapes.length, pageText, pageShapes));
  return file;
}

const polygon = (points) => points.map(([x, y], index) => x + ' ' + y + (index ? ' l' : ' m')).join(' ') + ' h S';
const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const at = (x, y, scale, commands) => 'q ' + scale + ' 0 0 ' + scale + ' ' + x + ' ' + y + ' cm .8 w ' + commands + ' Q';
const label = (name, x, baseline) => token(name, x / 600, (788 - baseline) / 800);
const roundHole = '26 57 m 26 61.42 22.42 65 18 65 c 13.58 65 10 61.42 10 57 c 10 52.58 13.58 49 18 49 c 22.42 49 26 52.58 26 57 c h S';
const bracket = pdf('l-bracket-three-views', [[label('FRONT VIEW', 136, 370), label('RIGHT SIDE VIEW', 355, 370), label('TOP VIEW', 137, 598)]], [[
  at(72, 390, 1.6, polygon([[0, 0], [120, 0], [120, 24], [36, 24], [36, 90], [0, 90]]) + ' ' + roundHole),
  at(334, 390, 1.6, polygon(rect(80, 90)) + ' 0 24 m 80 24 l S'),
  at(72, 618, 1.6, polygon(rect(120, 80)) + ' 36 0 m 36 80 l S'),
].join('\n')]);
const portal = (w, left, right) => [[0, 0], [left, 0], [left, 70], [w - right, 70], [w - right, 0], [w, 0], [w, 90], [0, 90]];
const assembly = pdf('open-frame-unlabelled', [[], [], []], [
  at(150, 340, 2, polygon(portal(120, 20, 20))),
  at(150, 340, 2, polygon(rect(120, 80))),
  at(150, 340, 2, polygon(portal(80, 26, 14))),
]);

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Run against an isolated application and library directory.');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const errors = [], assetRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /THREE|shader|hydration/i.test(message.text())) errors.push(message.text()); });
    page.on('response', (response) => { if (response.ok() && response.url().endsWith('?use=assembly')) assetRequests.push(response.url()); });
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page);
    const upload = async (file) => {
      await page.goto(base + '/training/upload?qwen=off', { waitUntil: 'networkidle0' });
      await (await page.waitForSelector('input[aria-label="분석할 PDF 선택"]')).uploadFile(file);
    };
    const canvas = () => page.waitForSelector('[data-drawing-model-kind=orthographic] canvas', { timeout: 30000 });
    const field = (label) => 'input[aria-label="초안 ' + label + '"]';
    const edit = async (label, value) => {
      await page.click(field(label)); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(value); await page.keyboard.press('Tab');
    };
    const chooseBlack = async () => {
      await click('외관');
      await page.select('[aria-label="외관 프리셋"]', 'builtin:2');
      assert.equal(await page.$eval('input[aria-label="모델 색상"]', (input) => input.value), '#303236');
    };
    const register = async (name) => {
      await click('치수');
      await edit('가로', '120'); await edit('세로', '90'); await edit('깊이', '80');
      await click('부품 정보'); await edit('부품번호', name + '-' + buildId); await edit('수량', '1');
      await click('이 모델 검토 확정');
      await click('라이브러리에 GLB 등록'); await click('등록하고 조립에 반영');
      await page.waitForSelector('#part-library-code, [data-assembly-status=ready]');
      const code = await page.$('#part-library-code');
      if (code) { await code.type('0000'); await click('관리자 코드 확인'); }
      await page.waitForSelector('[data-assembly-status=ready]');
      const bytes = Buffer.from(await (await fetch(assetRequests.at(-1))).arrayBuffer());
      assert.equal(bytes.subarray(0, 4).toString(), 'glTF');
      const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
      const extra = json.nodes.find((node) => node.extras?.generationMethod === 'orthographic-hull-from-pdf')?.extras;
      assert.ok(extra?.sourceViews.front && extra?.sourceViews.top && extra?.sourceViews.side);
      assert.deepEqual(extra.parameters, { width: 120, height: 90, depth: 80 });
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
      const size = new Box3().setFromObject(scene, true).getSize(new Vector3()).toArray();
      [.120, .090, .080].forEach((length, axis) => assert.ok(Math.abs(length - size[axis]) < .0015));
      return { scene, extra, json };
    };
    const hit = (scene, from, direction) => new Raycaster(new Vector3(...from), new Vector3(...direction)).intersectObject(scene, true).length > 0;

    await upload(bracket);
    await page.waitForSelector('[data-pdf-model-support=supported]');
    await click('3D 초안 열기'); await canvas();
    assert.equal(await page.$eval(field('깊이'), (input) => input.value), '', 'Render the draft before a measurement is entered.');
    assert.equal(await page.$$eval('[data-projection-view][data-selected=true]', (nodes) => nodes.length), 3);
    await chooseBlack();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const dark = await (await canvas()).screenshot();
    const { data, info } = await sharp(dark).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let outline = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      const [r, g, b] = data.subarray(index, index + 3);
      if (r > 90 && r > g * 1.35 && g > b * 1.25) outline++;
    }
    assert.ok(outline > 150, 'A black model should have a visible amber contour.');
    await page.screenshot({ path: path.join(output, 'l-bracket-black.png') });
    const part = await register('BRACKET');
    const pbr = part.json.materials[0].pbrMetallicRoughness;
    assert.equal(part.json.materials.length, 1, 'The preview overlay must not be exported.');
    assert.ok(Math.abs(pbr.baseColorFactor[0] - new Color('#303236').r) < 1e-5);
    assert.equal(hit(part.scene, [-.042, .012, .2], [0, 0, -1]), false, 'The bracket bore must be open.');
    assert.equal(hit(part.scene, [-.042, -.010, .2], [0, 0, -1]), true, 'The bracket web must have volume.');
    assert.equal(hit(part.scene, [.04, .030, .2], [0, 0, -1]), false, 'The L-shaped shoulder must stay open.');

    await upload(assembly);
    await page.waitForSelector('[data-pdf-model-support=unsupported]');
    await click('도면 영역 확인');
    const viewNames = ['정면도', '평면도', '측면도'];
    const choose = async (name, sourcePage) => {
      await page.waitForSelector('select[aria-label="검토 원문 페이지"]');
      await page.select('select[aria-label="검토 원문 페이지"]', String(sourcePage));
      await click(name + ' 지정');
      await page.waitForSelector('[aria-label="도면 형상 영역 선택"]');
      const move = async (key, repeat) => { for (let index = 0; index < repeat; index++) await page.keyboard.press(key); };
      await page.keyboard.down('Shift'); await move('ArrowLeft', 3); await move('ArrowUp', 2);
      await page.keyboard.up('Shift'); await page.keyboard.press('Enter');
      await page.keyboard.down('Shift'); await move('ArrowRight', 5); await move('ArrowDown', 4);
      await page.keyboard.up('Shift'); await page.keyboard.press('Enter');
    };
    for (const [index, name] of viewNames.entries()) await choose(name, index + 1);
    await canvas(); await click('초안 저장');
    await upload(assembly);
    await page.waitForSelector('[data-pdf-model-support=unsupported]');
    await click('도면 영역 확인'); await canvas();
    await chooseBlack();
    await page.setViewport({ width: 1280, height: 720 });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-drawing-model-kind=orthographic] canvas');
      return canvas && document.documentElement.scrollWidth === innerWidth &&
        Math.abs(canvas.getBoundingClientRect().width - canvas.parentElement.getBoundingClientRect().width) < 2;
    });
    await page.screenshot({ path: path.join(output, 'open-frame-oblique.png') });
    await click('측면 보기');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await page.screenshot({ path: path.join(output, 'open-frame-side.png') });
    await page.setViewport({ width: 1920, height: 1080 });
    const frame = await register('FRAME');
    assert.deepEqual(Object.values(frame.extra.sourceViews).map((view) => view.pageNumber), [1, 2, 3]);
    assert.equal(hit(frame.scene, [.2, -.033, 0], [-1, 0, 0]), false, 'The frame must be open between front and rear supports.');
    assert.equal(hit(frame.scene, [.2, -.033, .022], [-1, 0, 0]), true, 'The longer front leg footprint must be present.');
    assert.equal(hit(frame.scene, [.2, -.033, -.022], [-1, 0, 0]), false, 'Right-side orientation must preserve asymmetric support depths.');
    assert.equal(hit(frame.scene, [.2, .038, 0], [-1, 0, 0]), true, 'The upper deck must span the opening.');
    assert.deepEqual(errors, []);
    console.log('PASS labeled L-bracket with through bore, unlabeled asymmetric frame across three pages, dark orange contour, GLB and manual selection restore');
    console.log('Evidence: ' + output);
  } catch (error) {
    console.error('Evidence: ' + output);
    const [page] = await browser.pages().then((pages) => pages.slice(-1));
    await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
