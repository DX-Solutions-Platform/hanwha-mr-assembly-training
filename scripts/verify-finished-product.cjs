const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { makePdfFixture, token } = require('./verify-drawing-upload-dev.cjs');
const { makeClick } = require('./browser-ui-helpers.cjs');

const base = process.env.LIBRARY_TEST_URL;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-finished-product-qa-'));
const id = randomBytes(3).toString('hex').toUpperCase();
const partNumber = 'KIT-PART-' + id, productNumber = 'KIT-' + id;
const productName = '완제품 분리 테스트';

function box(x, y, left, right, height) {
  const l = [x - left, y + left / Math.sqrt(3)], r = [x + right, y + right / Math.sqrt(3)];
  const f = [x - left + right, y + (left + right) / Math.sqrt(3)];
  const bl = [l[0], l[1] - height], br = [r[0], r[1] - height], b = [x, y - height];
  const polygon = [l, f, r, br, b, bl, l, [x, y], r].map(([a, b], index) => a + ' ' + b + (index ? ' l' : ' m')).join(' ');
  return '1.4 w ' + polygon + ' S ' + x + ' ' + y + ' m ' + b.join(' ') + ' l S';
}
const table = [
  token('ITEM', .06, .73), token('PART NO', .15, .73), token('DESCRIPTION', .40, .73), token('QTY', .67, .73), token('MATERIAL', .78, .73),
  token('1', .07, .77), token(partNumber, .15, .77), token('Mounting bracket', .40, .77), token('2', .68, .77), token('AL6061', .78, .77),
];
const drawing = path.join(output, 'assembly-drawing.pdf'), renamed = path.join(output, 'renamed-copy.pdf');
fs.writeFileSync(drawing, makePdfFixture(3, [table, [], []], [box(281, 480, 93, 81, 68), box(282, 460, 75, 60, 50), '']));
fs.copyFileSync(drawing, renamed);

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Run against an isolated application and library directory.');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page);
    const summary = '[aria-label="완제품 도면 요약"]';
    const workspace = '[aria-label="완제품 관리 화면"]';
    const pagePicker = '[aria-label="완제품 대표 도면"]';
    const draftSource = '[aria-label="검토 원문 페이지"]';
    const upload = async (file) => {
      await page.goto(base + '/training/upload?qwen=off', { waitUntil: 'networkidle0' });
      await (await page.waitForSelector('input[aria-label="분석할 PDF 선택"]')).uploadFile(file);
      await page.waitForSelector(summary);
    };
    const manage = async () => {
      await click('완제품 관리');
      await page.waitForSelector(workspace);
    };
    const set = async (label, value) => {
      await page.click('input[aria-label="' + label + '"]');
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(value); await page.keyboard.press('Tab');
    };
    const value = (label) => page.$eval('input[aria-label="' + label + '"]', (input) => input.value);
    const waitForSource = (number) => page.waitForFunction((selector, expected) =>
      document.querySelector(selector)?.value === String(expected) && !!document.querySelector('[data-drawing-draft-ready=true] canvas'), {}, draftSource, number);
    const readyPart = () => page.waitForSelector('[data-pdf-model-support=supported]');
    const savedProduct = () => page.waitForSelector('[aria-label="저장된 완제품 3D"] [data-library-model-ready]');
    const displayedPages = () => page.$$eval('[aria-label="PDF 페이지 목록"] button', (tiles) => tiles.map((tile) => tile.getAttribute('aria-label')));

    await upload(drawing);
    assert.match(await page.$eval(summary, (element) => element.textContent), /1쪽 · 완제품 후보/);
    assert.equal((await displayedPages()).length, 3);
    await manage();
    assert.equal(await page.$eval(pagePicker, (select) => select.value), '1');
    await set('완제품 이름', productName); await set('완제품 번호', productNumber);
    await click('완제품 정보 저장');
    await page.waitForFunction(() => document.querySelector('footer')?.textContent.includes('완제품 정보를 저장했습니다'));
    await click('도면 분석으로');
    await page.waitForSelector(summary + '[data-finished-page="1"]');
    assert.deepEqual(await displayedPages(), ['2쪽 원문 확대', '3쪽 원문 확대']);
    await page.screenshot({ path: path.join(output, 'separated-drawings.png') });

    await readyPart(); await click('3D 초안 열기');
    await waitForSource(2);
    await set('초안 깊이', '22'); await click('초안 저장');
    await click('도면 분석으로'); await manage();
    assert.match(await page.$eval(workspace, (element) => element.textContent), /부품표에서 읽은 1종/);
    await click('완제품 3D 만들기');
    await waitForSource(1);
    assert.equal(await value('초안 깊이'), '');
    assert.equal(await page.$$eval('button', (nodes) => nodes.some((node) => node.textContent === '라이브러리에 GLB 등록')), false);
    await click('외관');
    await page.select('[aria-label="외관 프리셋"]', 'builtin:0');
    await click('완제품 모델 저장');
    await savedProduct();
    const canvas = await page.$('[aria-label="저장된 완제품 3D"] canvas');
    await new Promise((resolve) => setTimeout(resolve, 200));
    const pixels = await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer();
    let lit = 0;
    for (let index = 0; index < pixels.length; index += 3) if (Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) > 100) lit++;
    assert.ok(lit > 1500, 'A saved finished product must render a visible model.');
    await page.screenshot({ path: path.join(output, 'finished-product.png') });

    const result = await fetch(base + '/api/part-library/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numbers: [productNumber] }) });
    assert.deepEqual((await result.json()).matches, [], 'Finished-product save must not create a component-library record');
    await upload(renamed);
    await page.waitForSelector(summary + '[data-finished-page="1"]');
    assert.match(await page.$eval(summary, (element) => element.textContent), /3D 저장됨/);
    await manage(); await savedProduct();
    assert.equal(await value('완제품 이름'), productName);
    assert.equal(await value('완제품 번호'), productNumber);
    await click('완제품 3D 편집'); await waitForSource(1);
    await click('외관');
    assert.equal(await value('모델 색상'), '#d6c2a3');
    await click('완제품 관리로'); await savedProduct();
    await click('부품 검토·보정');
    await page.waitForFunction((number) => document.body.textContent.includes(number), {}, partNumber);
    await click('도면 분석으로'); await readyPart(); await click('3D 초안 열기'); await waitForSource(2);
    assert.equal(await value('초안 깊이'), '22');

    await click('도면 분석으로'); await manage();
    await page.select(pagePicker, '2'); await click('완제품 정보 저장');
    await page.waitForFunction(() => document.querySelector('footer')?.textContent.includes('완제품 정보를 저장했습니다'));
    await click('도면 분석으로'); await page.waitForSelector(summary + '[data-finished-page="2"]');
    assert.deepEqual(await displayedPages(), ['1쪽 원문 확대', '3쪽 원문 확대']);
    await manage(); await page.select(pagePicker, ''); await click('완제품 정보 저장');
    await page.waitForFunction(() => document.querySelector('footer')?.textContent.includes('완제품 도면 지정을 해제했습니다'));
    await upload(drawing);
    assert.doesNotMatch(await page.$eval(summary, (element) => element.textContent), /완제품 후보/);
    assert.equal((await displayedPages()).length, 3);

    const bekvam = path.join(os.homedir(), 'Downloads', 'bekvaem-step-stool-aspen__AA-323406-9-2.pdf');
    if (fs.existsSync(bekvam)) {
      await upload(bekvam); await manage();
      assert.equal(await page.$eval(pagePicker, (select) => select.value), '1');
      await click('완제품 3D 만들기'); await waitForSource(1);
      await page.waitForSelector('[data-drawing-model-kind=step-stool]');
      await click('완제품 모델 저장'); await savedProduct();
      await page.setViewport({ width: 1280, height: 720 });
      await page.waitForFunction(() => {
        const canvas = document.querySelector('[aria-label="저장된 완제품 3D"] canvas');
        return document.documentElement.scrollWidth === innerWidth && canvas &&
          Math.abs(canvas.getBoundingClientRect().width - canvas.parentElement.getBoundingClientRect().width) < 2;
      });
      await new Promise((resolve) => setTimeout(resolve, 260));
      await page.screenshot({ path: path.join(output, 'bekvam-finished-product.png') });
      await click('도면 분석으로');
      assert.equal((await displayedPages()).length, 7);
      console.log('PASS original BEKVÄM cover saved as a separate finished-product model, seven other pages, compact viewport');
    }
    assert.deepEqual(errors, []);
    console.log('PASS candidate, separate galleries and draft, preserved cover BOM, saved local product GLB, isolated part catalog, hash-based restore, reassignment and removal');
    console.log('Evidence: ' + output);
  } catch (error) {
    console.error('Evidence: ' + output);
    const pages = await browser.pages();
    await pages.at(-1)?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
