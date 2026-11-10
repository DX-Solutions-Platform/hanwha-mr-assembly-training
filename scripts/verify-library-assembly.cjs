const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Mesh, MeshStandardMaterial } = require('three');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { makeClick } = require('./browser-ui-helpers.cjs');
const { loadModule, makePdfFixture, token } = require('./verify-drawing-upload-dev.cjs');

const base = process.env.LIBRARY_TEST_URL;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-glb-assembly-qa-'));
const suffix = randomBytes(3).toString('hex').toUpperCase();
const entries = [
  ['base', 'BASE', 'Base plate', 1],
  ['flange', 'FLG', 'Flange', 1],
  ['bolt', 'BOLT', 'Hex bolt', 3],
  ['nut', 'NUT', 'Hex nut', 2],
  ['nut', 'PENDING', 'Pending nut', 1],
  ['base', 'MISSING', 'Plate without GLB', 1],
].map(([kind, code, name, quantity]) => ({ kind, code, name, quantity, partNumber: code + '-' + suffix }));

function createPdf(name, quantities = entries.map((entry) => entry.quantity)) {
  const file = path.join(output, name + '.pdf');
  const heading = [token('ITEM', .06, .12), token('PART NO', .15, .12), token('DESCRIPTION', .36, .12), token('QTY', .67, .12), token('MATERIAL', .8, .12)];
  const lines = entries.flatMap(({ name, partNumber }, index) => {
    const y = .16 + index * .038;
    return [token(String(index + 1), .07, y), token(partNumber, .15, y), token(name, .36, y), token(String(quantities[index]), .67, y), token('Steel', .8, y)];
  });
  fs.writeFileSync(file, makePdfFixture(1, [[...heading, ...lines]]));
  return file;
}

async function registerAssets() {
  const session = await fetch(base + '/api/part-library/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: '0000' }) });
  assert.equal(session.status, 200);
  const cookie = session.headers.get('set-cookie').split(';')[0];
  const registered = await fetch(base + '/api/part-library', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({
    parts: entries.map(({ code, name, partNumber }) => ({
      partNumber, name, status: code === 'PENDING' ? 'pending' : 'approved', category: 'custom', revision: 'A',
      material: 'Steel', specification: '', source: 'GLB assembly QA', usage: 'QA', dimensionList: [],
    })),
  }) });
  assert.equal(registered.status, 200);
  assert.equal((await registered.json()).saved, entries.length);
  global.FileReader = class {
    readAsArrayBuffer(blob) { void blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend(); }); }
  };
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const { buildAssemblyGeometry } = loadModule('assembly/buildAssemblyGeometry');
  const keys = new Map();
  for (const entry of entries.filter(({ code }) => code !== 'MISSING')) {
    const geometry = buildAssemblyGeometry(entry.kind);
    const material = new MeshStandardMaterial({ color: entry.kind === 'nut' ? 0xf0a267 : 0xb0b6bc });
    const mesh = new Mesh(geometry, material);
    mesh.name = entry.partNumber;
    mesh.scale.setScalar(.001);
    mesh.rotation.x = -Math.PI / 2;
    const bytes = await new GLTFExporter().parseAsync(mesh, { binary: true });
    geometry.dispose(); material.dispose();
    const uploaded = await fetch(base + '/api/part-library/asset/model?' + new URLSearchParams({ number: entry.partNumber, name: entry.partNumber + '.glb' }), { method: 'PUT', headers: { cookie }, body: bytes });
    assert.equal(uploaded.status, 200);
    keys.set(entry.code, (await uploaded.json()).key);
  }
  const pathFor = (code) => base + '/api/part-library/asset/' + keys.get(code);
  assert.equal((await fetch(pathFor('BASE'))).status, 401);
  assert.equal((await fetch(pathFor('PENDING') + '?use=assembly')).status, 404);
  const response = await fetch(pathFor('BASE') + '?use=assembly');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'model/gltf-binary');
  return keys;
}

async function main() {
  assert.ok(base && new URL(base).port !== '3000', 'Use a test server with a temporary PART_LIBRARY_DATA_DIR.');
  const keys = await registerAssets();
  const fixture = createPdf('library-assembly');
  const sha256 = createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const errors = [], requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.url().includes('?use=assembly')) requests.push(response.status()); });
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page);
    const upload = async (file) => {
      await page.goto(base + '/training/upload-dev', { waitUntil: 'networkidle0' });
      await (await page.waitForSelector('input[aria-label="분석할 PDF 선택"]')).uploadFile(file);
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.startsWith('라이브러리 3D 조립')));
    };
    const open = async (count) => {
      await click('라이브러리 3D 조립 · ' + count + '개');
      await page.waitForSelector('[data-assembly-status="ready"]');
      await page.waitForSelector('[aria-label="조립품 3D 표시 영역"] canvas');
      assert.equal(await page.$$eval('[data-assembly-part]', (nodes) => nodes.length), count);
    };
    const canvasImage = async () => {
      const canvas = await page.$('[aria-label="조립품 3D 표시 영역"] canvas');
      for (let attempt = 0; attempt < 8; attempt++) {
        const png = await canvas.screenshot();
        const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
        let litPixels = 0;
        for (let index = 0; index < data.length; index += info.channels) {
          if (Math.min(data[index], data[index + 1], data[index + 2]) > 85) litPixels++;
        }
        if (litPixels > 300) return png;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error('No GLB surfaces were rendered on the 3D canvas.');
    };
    const id = (code, index = 1) => 'lib:' + entries.find((entry) => entry.code === code).partNumber + ':' + index;
    const select = async (code, index) => {
      await page.click('[data-assembly-part="' + id(code, index) + '"]');
      await page.waitForSelector('[data-editing-part="' + id(code, index) + '"]');
    };
    const choose = (label, value) => page.select('select[aria-label="조립품 ' + label + '"]', value);
    const edit = async (label, value) => {
      await page.click('input[aria-label="조립품 ' + label + '"]');
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(String(value)); await page.keyboard.press('Tab');
    };
    const worldX = () => page.$eval('[aria-label="선택 부품 실제 위치"]', (node) => Number(node.dataset.worldX));
    const saved = () => page.evaluate((hash) => JSON.parse(localStorage.getItem('hanwha.assembly-drawing.v1.' + hash)), sha256);
    await upload(fixture);
    await page.waitForFunction(() => document.querySelector('summary') && [...document.querySelectorAll('summary')].some((node) => node.textContent.includes('배치 제외 2종')));
    await page.waitForNetworkIdle({ idleTime: 500 });
    assert.deepEqual(requests, [200, 200, 200, 200], 'Download each approved GLB once before opening the editor');
    await open(7);
    const initialImage = await canvasImage();
    await page.screenshot({ path: path.join(output, 'library-assembly.png') });
    await select('FLG'); await click('결합 관계');
    await choose('결합 종류', 'fixed');
    await choose('기준 부품', id('BASE'));
    await choose('기준 결합점', 'top');
    await choose('선택 결합점', 'bottom');
    await click('위치·회전');
    await edit('위치 Z', 4); await edit('회전 Z', 30);
    await select('BOLT', 2); await click('결합 관계');
    await choose('결합 종류', 'fixed'); await choose('기준 부품', id('FLG'));
    await click('위치·회전');
    const boltX = await worldX();
    await select('BASE'); const baseX = await worldX();
    await edit('위치 X', baseX + 25);
    await select('BOLT', 2);
    assert.ok(Math.abs(await worldX() - boltX - 25) < 1e-7, 'A child follows both hierarchy levels');
    assert.notDeepEqual(await canvasImage(), initialImage);
    await click('조립품 저장');
    const stored = await saved();
    assert.equal(stored.drawingSha256, sha256);
    assert.equal(stored.partList.length, 7);
    for (const entry of entries.slice(0, 4)) {
      const parts = stored.partList.filter((part) => part.partNumber === entry.partNumber);
      assert.equal(parts.length, entry.quantity);
      assert.ok(parts.every((part) => part.model.key === keys.get(entry.code) && part.kind === entry.kind));
    }
    assert.equal(stored.partList.find((part) => part.id === id('FLG')).relation.parentId, id('BASE'));
    assert.equal(stored.partList.find((part) => part.id === id('BOLT', 2)).relation.parentId, id('FLG'));
    assert.equal(stored.partList.find((part) => part.id === id('FLG')).rotation[2], 30);
    await upload(fixture);
    await open(7);
    await page.waitForFunction(() => document.querySelector('footer')?.textContent.includes('저장한 조립품을 복원했습니다.'));
    await select('BOLT', 2);
    assert.ok(Math.abs(await worldX() - boltX - 25) < 1e-7);
    await click('결합 관계'); assert.equal(await page.$eval('select[aria-label="조립품 기준 부품"]', (node) => node.value), id('FLG'));
    await select('FLG'); await click('위치·회전');
    assert.equal(await page.$eval('input[aria-label="조립품 위치 Z"]', (node) => node.value), '4');
    assert.equal(await page.$eval('input[aria-label="조립품 회전 Z"]', (node) => node.value), '30');
    const secondPdf = createPdf('other-quantities', [1, 1, 2, 1, 1, 1]);
    await upload(secondPdf);
    await open(5);
    await select('FLG'); await click('결합 관계');
    assert.equal(await page.$eval('select[aria-label="조립품 결합 종류"]', (node) => node.value), 'free');
    await click('도면 분석으로'); await click('부품 검토·보정');
    await page.click('[data-review-part="number:' + entries.find((entry) => entry.code === 'BOLT').partNumber + '"]');
    await page.click('#review-quantity');
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.type('4');
    await open(7);
    await click('조립품 저장');
    await upload(secondPdf); await open(7);
    await page.waitForFunction(() => document.querySelector('footer')?.textContent.includes('저장한 조립품을 복원했습니다.'));
    assert.deepEqual(await saved(), stored);
    assert.deepEqual(errors, []);
    console.log('PASS PDF-only library assembly: 4 GLBs, 7 instances, protected missing/pending assets, edited hierarchy, save/reupload restore, separate PDF counts');
    console.log('Screenshot: ' + path.join(output, 'library-assembly.png'));
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
