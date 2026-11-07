const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { fixture } = require('./verify-pdf-model-example.cjs');

async function checkBrowser() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.join(os.tmpdir(), 'hanwha-real-upload-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  let uploadIndex = 0;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
    const client = await page.createCDPSession(); await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
    const errors = [], samples = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /hydration|hydrated|script tag|Unhandled/i.test(message.text())) errors.push(message.text()); });
    page.on('request', (request) => { if (request.url().includes('/examples/pdf-model/flange-model-example.pdf')) samples.push(request.url()); });
    const press = require('./browser-ui-helpers.cjs').makeClick(page);
    const click = async (label) => {
      if (label === '이 PDF로 3D 생성') await page.waitForSelector('[data-pdf-model-support=supported] button');
      await press(label);
    };
    const upload = async (bytes, name = 'same-name.pdf', label = '분석할 PDF 선택') => {
      const directory = path.join(output, 'input-files', String(++uploadIndex)); fs.mkdirSync(directory, { recursive: true });
      const filename = path.join(directory, name); fs.writeFileSync(filename, bytes);
      const input = await page.$('input[aria-label="' + label + '"]');
      await input.uploadFile(filename);
    };
    const edit = async (label, value) => {
      await page.click('input[aria-label="' + label + '"]');
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(value); await page.keyboard.press('Tab');
    };
    const ready = () => page.waitForSelector('[data-analysis-status=complete]', { timeout: 30000 });
    const modelReady = () => page.waitForSelector('[aria-label="업로드 PDF 3D 생성"] [data-model-status=draft], [aria-label="업로드 PDF 3D 생성"] [data-model-status=confirmed]', { timeout: 30000 });
    const modelCanvas = async () => {
      const canvas = await page.waitForSelector('[aria-label="생성된 플랜지 3D 표시 영역"] canvas');
      await page.waitForFunction(() => document.querySelector('[aria-label="생성된 플랜지 3D 표시 영역"] canvas')?.width > 1);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return canvas;
    };
    const data = async () => {
      await click('생성 JSON 내보내기');
      return page.evaluate(async () => JSON.parse(await window.__modelJson.text()));
    };
    const capture = () => page.evaluate(() => {
      const original = URL.createObjectURL;
      URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__modelJson = blob; return original.call(this, blob); };
    });
    await page.goto('http://localhost:3000/training/upload', { waitUntil: 'networkidle0' }); await capture();
    const supplied = fs.readFileSync(path.join(__dirname, '../public/examples/pdf-model/flange-model-example.pdf'));
    const chooserPromise = page.waitForFileChooser();
    await click('PDF 선택');
    const chooser = await chooserPromise;
    await chooser.accept([path.resolve(__dirname, '../public/examples/pdf-model/flange-model-example.pdf')]); await ready();
    assert.equal(await page.$$eval('[data-record=part]', (nodes) => nodes.length), 1);
    assert.match(await page.$eval('[data-record=part]', (node) => node.textContent), /FLG-001.*Training flange.*AL6061/);
    assert.equal(await page.$$eval('button[aria-label$="쪽 원문 확대"]', (nodes) => nodes.length), 1);
    assert.equal(await page.evaluate(() => document.body.textContent.includes('측면 다리 프레임')), false);
    await page.waitForSelector('[data-pdf-model-support=supported]');
    await page.screenshot({ path: path.join(output, 'main-analysis-1920.png') });
    await click('이 PDF로 3D 생성'); await modelReady();
    const original = await data();
    assert.equal(original.document.sha256, createHash('sha256').update(supplied).digest('hex'));
    assert.equal(original.values.parameters.outerDiameter, 100);
    assert.equal(original.values.parameters.holeCount, 4);
    assert.equal(original.values.part.partNumber, 'FLG-001');
    const canvas = await modelCanvas(), canvasBox = await canvas.boundingBox();
    const initialPixels = await canvas.screenshot();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 80, canvasBox.y + canvasBox.height / 2 + 40, { steps: 12 });
    await page.mouse.up(); await new Promise((resolve) => setTimeout(resolve, 300));
    const rotatedPixels = await canvas.screenshot();
    assert.notEqual(createHash('sha256').update(initialPixels).digest('hex'), createHash('sha256').update(rotatedPixels).digest('hex'), 'Dragging must rotate the rendered 3D model');
    await page.mouse.wheel({ deltaY: -180 }); await new Promise((resolve) => setTimeout(resolve, 300));
    assert.notEqual(createHash('sha256').update(rotatedPixels).digest('hex'), createHash('sha256').update(await canvas.screenshot()).digest('hex'), 'The mouse wheel must zoom the rendered model');
    await click('시점 초기화');
    await page.screenshot({ path: path.join(output, 'main-generated-1920.png') });
    await edit('생성 외경', '60'); await page.waitForSelector('[aria-label="PDF 3D 입력값 편집"] [role=alert]');
    assert.match(await page.$eval('[aria-label="PDF 3D 입력값 편집"] [role=alert]', (node) => node.textContent), /외곽/);
    assert.equal(await page.$$eval('button', (nodes) => nodes.find((node) => node.textContent === '3D 다시 생성').disabled), true);
    assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 100 mm/);
    await edit('생성 외경', '120'); await edit('생성 두께', '12'); await edit('생성 볼트 구멍 개수', '6');
    await page.waitForSelector('[data-model-status=pending]');
    assert.match(await page.$eval('[aria-label="생성 형상 치수"]', (node) => node.textContent), /외경 100 mm/);
    await click('3D 다시 생성');
    await page.waitForSelector('[data-model-status=draft]');
    await click('이 모델 검토 확정'); await click('생성 결과 저장');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('이 브라우저에 저장했습니다'));
    const edited = await data();
    assert.equal(edited.values.parameters.outerDiameter, 120);
    assert.equal(edited.values.parameters.thickness, 12);
    assert.equal(edited.values.parameters.holeCount, 6);
    assert.equal(edited.source.values.parameters.outerDiameter, 100);
    assert.equal(edited.status, 'confirmed');
    await page.reload({ waitUntil: 'networkidle0' }); await capture(); await upload(supplied, 'renamed-original.pdf'); await ready();
    await click('이 PDF로 3D 생성'); await modelReady();
    const afterReload = await data();
    assert.equal(afterReload.values.parameters.outerDiameter, 120);
    assert.equal(afterReload.values.parameters.thickness, 12);
    assert.equal(afterReload.values.parameters.holeCount, 6);
    assert.equal(afterReload.status, 'confirmed');
    await modelCanvas();
    await page.screenshot({ path: path.join(output, 'main-restored-original-1920.png') });
    console.log('PASS native workflow: file chooser, original PDF, keyboard edits to 120/12/6, regeneration, confirmation, save and reload restoration');
    const revisedTokens = fixture().tokens.map((item) => {
      const replacements = { 'OD = 100 mm': 'OD = 136 mm', 'THK = 10 mm': 'THK = 12 mm', 'HOLE_COUNT = 4': 'HOLE_COUNT = 6', 'FLG-001': 'FLG-042', 'Training flange': 'Custom flange', 'AL6061': 'AL7075' };
      return replacements[item.text] ? { ...item, text: replacements[item.text] } : item;
    });
    const revisedPdf = makePdfFixture(1, [revisedTokens]);
    // Selecting another PDF in the 3D workspace cannot change the original
    // analysis action's file identity when returning to that action.
    await upload(revisedPdf, 'other-flange.pdf', '3D 생성용 PDF 선택');
    await page.waitForFunction(() => document.querySelector('input[aria-label="생성 외경"]')?.value === '136');
    await click('도면 분석으로'); await click('이 PDF로 3D 생성'); await modelReady();
    const returned = await data();
    assert.equal(returned.document.sha256, original.document.sha256, 'Returning to the original PDF must not reuse the other PDF model');
    assert.equal(returned.values.parameters.outerDiameter, 120, 'The saved original model must be restored after the other PDF is previewed');
    assert.equal(returned.values.part.partNumber, 'FLG-001');
    await modelCanvas(); await page.screenshot({ path: path.join(output, 'main-returned-original-1920.png') });
    // A failed model replacement must keep the current model and its identity.
    await upload(makePdfFixture(1), 'unsupported-model.pdf', '3D 생성용 PDF 선택');
    await page.waitForFunction(() => document.querySelector('footer').textContent.includes('FLANGE_V1'));
    assert.equal((await data()).document.sha256, original.document.sha256);
    await click('도면 분석으로'); await click('이 PDF로 3D 생성'); await modelReady();
    assert.equal((await data()).document.sha256, original.document.sha256, 'A failed replacement cannot change which PDF the current model belongs to');
    await click('도면 분석으로'); await upload(revisedPdf, 'flange-model-example.pdf'); await ready();
    assert.equal(await page.$$eval('[data-record=part]', (nodes) => nodes.length), 1);
    assert.match(await page.$eval('[data-record=part]', (node) => node.textContent), /FLG-042.*Custom flange.*AL7075/);
    await click('이 PDF로 3D 생성'); await modelReady();
    const revised = await data();
    assert.equal(revised.document.name, original.document.name, 'The same filename must not determine the result');
    assert.notEqual(revised.document.sha256, original.document.sha256);
    assert.equal(revised.document.sha256, createHash('sha256').update(revisedPdf).digest('hex'));
    assert.equal(revised.values.parameters.outerDiameter, 136);
    assert.equal(revised.values.parameters.thickness, 12);
    assert.equal(revised.values.parameters.holeCount, 6);
    assert.equal(revised.values.part.partNumber, 'FLG-042');
    assert.equal(revised.source.evidence.outerDiameter.text, 'OD = 136 mm');
    assert.deepEqual(samples, [], 'User PDF generation must never silently load the built-in example PDF');
    await page.$eval('input[aria-label="생성 외경"]', (input) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '150'); input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('도면 분석으로'); await click('이 PDF로 3D 생성'); await page.waitForSelector('[data-model-status=pending]');
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '150');
    await click('3D 다시 생성'); await click('이 모델 검토 확정'); await click('생성 결과 저장');
    await page.reload({ waitUntil: 'networkidle0' }); await capture(); await upload(revisedPdf, 'renamed.pdf'); await ready();
    await click('이 PDF로 3D 생성'); await modelReady();
    assert.equal(await page.$eval('input[aria-label="생성 외경"]', (node) => node.value), '150');
    const restored = await data();
    assert.equal(restored.values.parameters.outerDiameter, 150); assert.equal(restored.source.values.parameters.outerDiameter, 136);
    assert.equal(restored.status, 'confirmed');
    for (const [width, height] of [[1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height }); await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
      await page.screenshot({ path: path.join(output, 'main-generated-' + width + '.png') });
    }
    await click('도면 분석으로'); await upload(makePdfFixture(1), 'flange-model-example.pdf'); await ready();
    assert.equal(await page.$$eval('[data-record=part]', (nodes) => nodes.length), 3);
    await page.waitForSelector('[data-pdf-model-support=unsupported]');
    assert.equal(await page.$$eval('button', (nodes) => nodes.some((node) => node.textContent === '이 PDF로 3D 생성')), false);
    assert.equal(await page.evaluate(() => document.body.textContent.includes('측면 다리 프레임')), false);
    await page.setViewport({ width: 1920, height: 1080 }); await page.screenshot({ path: path.join(output, 'main-unsupported-1920.png') });
    await upload(makePdfFixture(1, [[]]), 'image-only.pdf'); await ready();
    assert.equal(await page.$$eval('[data-record=part]', (nodes) => nodes.length), 0, 'Missing text must never produce invented parts');
    await page.waitForSelector('[data-pdf-model-support=unsupported]');
    await upload(Buffer.from('not a PDF'), 'broken.pdf'); await page.waitForSelector('[data-analysis-status=error]');
    assert.equal(await page.$$eval('[data-record=part]', (nodes) => nodes.length), 0);
    assert.deepEqual(samples, [], 'Unsupported PDFs cannot fall back to the built-in model');
    await page.goto('http://localhost:3000/training/upload?example=flange', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[aria-label="PDF 3D 생성 예시"] [data-model-status]', { timeout: 30000 });
    assert.ok(samples.length > 0, 'The sample is loaded only after explicitly entering sample mode');
    assert.deepEqual(errors, []);
    console.log('PASS main upload: native file/mouse/keyboard workflow, rendered orbit/zoom, invalid dimensions, 120/12/6 save/restore, secondary-PDF identity and failed replacement recovery, actual BOM, same-name changed PDF, no sample fallback and HD/FHD/QHD');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
checkBrowser().catch((error) => { console.error(error); process.exitCode = 1; });
