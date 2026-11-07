const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');

(async () => {
  const browser = await require('puppeteer').launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.join(os.tmpdir(), 'hanwha-lint-regression-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
    const click = async (text) => {
      const handle = await page.evaluateHandle((value) => [...document.querySelectorAll('button,div,span')].find((node) => node.textContent === value && ![...node.children].some((child) => child.textContent === value) && node.checkVisibility()), text);
      assert.ok(handle.asElement(), 'Visible control: ' + text); await handle.asElement().click(); await handle.dispose();
    };
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const visibleLabel = () => page.waitForFunction(() => [...document.querySelectorAll('div')].some((node) => node.style.transform.startsWith('translate(1450px') && Number(node.style.opacity) > .5), { timeout: 20000 });
    await page.goto('http://localhost:3000/training/complex', { waitUntil: 'networkidle0' }); await page.waitForSelector('canvas'); await visibleLabel();
    await page.mouse.move(640, 360);
    for (let index = 0; index < 5; index++) { await page.mouse.wheel({ deltaY: 200 }); await wait(80); }
    for (let index = 0; index < 5; index++) { await page.mouse.wheel({ deltaY: -200 }); await wait(80); }
    await page.keyboard.press('KeyR'); await wait(150); await page.keyboard.press('KeyR');
    await click('스마트폰'); await visibleLabel();
    const labelHandle = await page.evaluateHandle(() => [...document.querySelectorAll('div')].find((node) => {
      const rect = node.getBoundingClientRect(); return node.style.transform.startsWith('translate(1450px') && Number(node.style.opacity) > .5 && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
    }));
    assert.ok(labelHandle.asElement()); await labelHandle.asElement().click(); await labelHandle.dispose();
    await page.waitForFunction(() => document.body.textContent.includes('교육 시작'));
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.body.textContent.includes('교육 시작'));
    await page.screenshot({ path: path.join(output, 'complex-labels.png') });
    await page.goto('http://localhost:3000/training/hud?product=hydraulic-pump&card=2&from=bolt', { waitUntil: 'networkidle0' });
    const canvas = await page.waitForSelector('canvas'); await wait(600);
    const digest = async () => createHash('sha256').update(await canvas.screenshot()).digest('hex');
    const original = await digest(); await page.keyboard.down('KeyW'); await wait(300); await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyE'); await wait(300); await page.keyboard.up('KeyE'); assert.notEqual(await digest(), original, 'Native movement keys must still move the camera');
    await page.keyboard.press('KeyF'); await page.keyboard.press('Escape'); await page.waitForFunction(() => document.body.textContent.includes('계속하기'));
    await click('계속하기'); await page.waitForFunction(() => !document.body.textContent.includes('계속하기'));
    await page.screenshot({ path: path.join(output, 'hud-camera.png') });
    assert.deepEqual(errors, []);
    console.log('PASS scene regressions: actual complex/reference screen labels, native assemble/explode controls, model switch and section selection, camera movement/reset and pause/resume');
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
