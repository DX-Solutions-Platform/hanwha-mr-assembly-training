const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const browser = await require('puppeteer').launch({ headless: true });
  const output = path.join(os.tmpdir(), 'hanwha-intro-layout-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    for (const [width, height] of [[1920, 1080], [1348, 833], [1280, 720], [1100, 900], [900, 900], [800, 600], [600, 850], [375, 812]]) {
      await page.setViewport({ width, height });
      for (let step = 1; step <= 6; step++) {
        await page.goto('http://localhost:3000/?step=' + step, { waitUntil: 'networkidle0' });
        await page.waitForSelector('[data-project-intro] h1');
        const overflow = await page.evaluate(() => [...document.querySelectorAll('main, main > div, [data-intro-phase]')].filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, width: node.clientWidth, scroll: node.scrollWidth })));
        assert.deepEqual(overflow, [], 'Step ' + step + ' at ' + width + 'px must fit without horizontal scrolling or hiding overflowing content');
        const next = await page.$('[data-intro-action="' + (step === 6 ? 'confirm' : 'next') + '"]');
        await next.scrollIntoView(); const rect = await next.boundingBox(); assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= width + 1 && rect.y >= 0 && rect.y + rect.height <= height + 1);
        if (step === 1) await page.screenshot({ path: path.join(output, 'intro-' + width + '.png') });
      }
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    for (const width of [1348, 1100, 900]) {
      await page.setViewport({ width, height: 833 }); await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
      for (let sample = 0; sample < 3; sample++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        assert.equal(await page.$eval('[data-intro-phase]', (node) => node.scrollWidth <= node.clientWidth + 1), true, 'Animated objects must stay contained at ' + width + 'px');
      }
      if (width === 1348) await page.screenshot({ path: path.join(output, 'intro-1348-animated.png') });
    }
    await page.setViewport({ width: 900, height: 900 }); await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.querySelector('h1').textContent.includes('제품을 선택하고'));
    await page.keyboard.press('ArrowLeft'); await page.waitForFunction(() => document.querySelector('h1').textContent.includes('조립의 전 과정'));
    await page.click('[data-intro-action=next]'); await page.waitForFunction(() => document.querySelector('h1').textContent.includes('제품을 선택하고'));
    await page.keyboard.press('Escape'); await page.waitForSelector('a[href="/training"]');
    assert.deepEqual(errors, []);
    console.log('PASS intro layout: all six steps at eight window widths including the reported 1348x833 size, live animation at three narrow widths, no horizontal overflow, footer visibility, keyboard/mouse navigation and skip');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
