const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { Box3, Vector3 } = require('three');
const { makeClick } = require('./browser-ui-helpers.cjs');
const { makePdfFixture } = require('./verify-drawing-upload-dev.cjs');

const base = process.env.LIBRARY_TEST_URL;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-single-view-qa-'));
const number = 'ISO-' + randomBytes(4).toString('hex').toUpperCase();

function part(x, y, left, right, down, cropped = false) {
  const p = [x, y], l = [x - left, y + left / Math.sqrt(3)], r = [x + right, y + right / Math.sqrt(3)], b = [x, y - down];
  const f = [x - left + right, y + (left + right) / Math.sqrt(3)];
  const bl = [l[0], l[1] - down], br = [r[0], r[1] - down];
  const line = (points) => points.map(([a, b], index) => a + ' ' + b + (index ? ' l' : ' m')).join(' ') + ' S';
  const geometry = cropped ? [line([l, p, r]), line([p, b])]
    : [line([l, f, r, br, b, bl, l, p, r]), line([p, b])];
  return { commands: geometry.join('\n'), anchors: [p, l, r, b] };
}

function pdf(name, ...parts) {
  const file = path.join(output, name + '.pdf');
  fs.writeFileSync(file, makePdfFixture(1, [[]], ['1.4 w\n' + parts.map((item) => item.commands).join('\n')]));
  return file;
}

const housing = pdf('junction-housing', part(280, 472, 86, 63, 74));
const assembly = pdf('exploded-mounting-assembly', part(206, 460, 75, 68, 46), part(422, 493, 52, 60, 81));
const partial = part(278, 456, 68, 63, 66, true);
const cropped = pdf('partially-visible-block', partial);

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Run against an isolated application and library directory.');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const errors = [], assets = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.ok() && response.url().endsWith('?use=assembly')) assets.push(response.url()); });
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page);
    const upload = async (file) => {
      await page.goto(base + '/training/upload?qwen=off', { waitUntil: 'networkidle0' });
      await (await page.waitForSelector('input[aria-label="분석할 PDF 선택"]')).uploadFile(file);
    };
    const field = (label) => 'input[aria-label="초안 ' + label + '"]';
    const canvas = () => page.waitForSelector('[data-drawing-model-kind=isometric] canvas');
    const open = async (file) => {
      await upload(file);
      await page.waitForSelector('[data-pdf-model-support=supported]');
      await click('3D 초안 열기');
      return canvas();
    };
    const modelPixels = async () => {
      const image = await (await canvas()).screenshot();
      const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
      let count = 0, left = info.width, right = 0, top = info.height, bottom = 0;
      for (let offset = 0; offset < data.length; offset += info.channels) if (Math.max(data[offset], data[offset + 1], data[offset + 2]) > 95) {
        const pixel = offset / info.channels, x = pixel % info.width, y = Math.floor(pixel / info.width);
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        count++;
      }
      assert.ok(count > 1800, 'The WebGL preview must contain a visible 3D model');
      return { image, aspect: (right - left) / (bottom - top) };
    };
    const edit = async (label, value) => {
      await page.click(field(label)); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(value); await page.keyboard.press('Tab');
    };

    await open(housing);
    await page.waitForFunction(() => document.querySelector('[data-drawing-model-kind=isometric]').textContent.includes('1개 입체 부피'));
    assert.equal(await page.$eval(field('깊이'), (input) => input.value), '');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const oblique = await modelPixels();
    assert.ok(oblique.aspect >= .82 && oblique.aspect <= 1.04, 'Initial preview should match the drawing aspect ratio without real dimensions');
    await click('측면 보기'); await new Promise((resolve) => setTimeout(resolve, 150));
    assert.notDeepEqual(oblique.image, (await modelPixels()).image);
    await click('도면 시점');
    await page.screenshot({ path: path.join(output, 'junction-housing.png') });

    await open(assembly);
    await page.waitForFunction(() => document.querySelector('[data-drawing-model-kind=isometric]').textContent.includes('2개 입체 부피'));
    await new Promise((resolve) => setTimeout(resolve, 180));
    await modelPixels();
    await page.screenshot({ path: path.join(output, 'mounting-assembly.png') });
    await page.select('[aria-label="조정할 입체도 부피"]', '1');
    const slider = await page.$('[aria-label="부피 바닥 높이"]');
    await slider.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.$eval('[aria-label="부피 바닥 높이"]', (input) => input.value), '1');
    await click('초안 저장');
    await open(assembly);
    await page.select('[aria-label="조정할 입체도 부피"]', '1');
    assert.equal(await page.$eval('[aria-label="부피 바닥 높이"]', (input) => input.value), '1');
    await edit('가로', '400'); await edit('세로', '110'); await edit('깊이', '260');
    await click('외관'); await page.select('[aria-label="외관 프리셋"]', 'builtin:2');
    await click('부품 정보'); await edit('부품번호', number); await edit('수량', '1');
    await click('이 모델 검토 확정');
    await click('라이브러리에 GLB 등록'); await click('등록하고 조립에 반영');
    await page.waitForSelector('#part-library-code');
    await page.type('#part-library-code', '0000'); await click('관리자 코드 확인');
    await page.waitForSelector('[data-assembly-status=ready]');
    const bytes = Buffer.from(await (await fetch(assets.at(-1))).arrayBuffer());
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const evidence = json.nodes.find((node) => node.extras?.generationMethod === 'isometric-blocks-from-pdf')?.extras;
    assert.equal(evidence.sourceBlocks.length, 2);
    assert.equal(evidence.sourceBlocks[1].liftPercent, 1);
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
    const volume1 = scene.getObjectByName('isometric-part-1'), volume2 = scene.getObjectByName('isometric-part-2');
    assert.ok(volume1?.isMesh && volume2?.isMesh);
    const size = new Box3().setFromObject(scene, true).getSize(new Vector3()).toArray();
    [.400, .110, .260].forEach((target, axis) => assert.ok(Math.abs(target - size[axis]) < 1e-5));
    const depth1 = new Box3().setFromObject(volume1, true).getSize(new Vector3()).z;
    const depth2 = new Box3().setFromObject(volume2, true).getSize(new Vector3()).z;
    assert.ok(depth1 > .03 && depth2 > .03, 'Both parts must have an actual independent depth');
    assert.ok(volume1.getWorldPosition(new Vector3()).distanceTo(volume2.getWorldPosition(new Vector3())) > .15);

    await upload(cropped);
    await page.waitForSelector('[data-pdf-model-support=unsupported]');
    await click('도면 영역 확인'); await page.waitForSelector('[data-drawing-draft-ready=false]');
    await click('입체도에서 부피 추가');
    const layer = await page.waitForSelector('[aria-label="입체도 기준점 선택"]');
    const bounds = await layer.boundingBox();
    for (const [x, y] of partial.anchors) {
      await page.mouse.click(bounds.x + x / 600 * bounds.width, bounds.y + (1 - y / 800) * bounds.height);
    }
    await canvas();
    await page.waitForFunction(() => document.querySelector('[data-drawing-model-kind=isometric]').textContent.includes('1개 입체 부피'));
    assert.deepEqual(errors, []);
    console.log('PASS single-page housing and two-part mounting assembly, side rotation, depth and independent GLB parts, height correction restore, four-point fallback');
    console.log('Evidence: ' + output);
  } catch (error) {
    console.error('Evidence: ' + output);
    const pages = await browser.pages();
    await pages.at(-1)?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
