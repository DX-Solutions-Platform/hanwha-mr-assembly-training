const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeClick } = require('./browser-ui-helpers.cjs');
const { makePdfFixture } = require('./verify-drawing-upload-dev.cjs');

async function checkBrowser() {
  const browser = await require('puppeteer').launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.join(os.tmpdir(), 'hanwha-upload-usability-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const click = makeClick(page);
    const expanded = (label) => page.$eval('button[aria-label="' + label + '"]', (node) => node.getAttribute('aria-expanded'));
    const focus = () => page.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.textContent);
    const waitFocus = (label) => page.waitForFunction((value) => document.activeElement.getAttribute('aria-label') === value || document.activeElement.textContent === value, {}, label);
    const footerCount = () => page.$$eval('[data-task-footer] button', (nodes) => nodes.length);
    const edit = async (value) => {
      await page.click('input[aria-label="조립품 위치 X"]'); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      if (value) await page.keyboard.type(value); else await page.keyboard.press('Backspace'); await page.keyboard.press('Tab');
    };
    const worldX = () => page.$eval('[aria-label="선택 부품 실제 위치"]', (node) => Number(node.dataset.worldX));
    await page.goto('http://localhost:3000/training/upload', { waitUntil: 'networkidle0' });
    assert.equal(await footerCount(), 1, 'The empty state keeps PDF selection in the upload area');
    await page.screenshot({ path: path.join(output, 'upload-empty-1920.png') });
    await page.focus('button[aria-label="예시로 둘러보기"]'); await page.keyboard.press('ArrowDown');
    assert.equal(await expanded('예시로 둘러보기'), 'true'); await waitFocus('PDF → 3D 예시');
    await page.keyboard.press('End'); assert.equal(await focus(), '조립품 편집 예시');
    await page.keyboard.press('Home'); assert.equal(await focus(), 'PDF → 3D 예시');
    await page.keyboard.press('ArrowDown'); assert.equal(await focus(), '조립품 편집 예시');
    await page.keyboard.press('Escape'); assert.equal(await expanded('예시로 둘러보기'), 'false'); assert.equal(await focus(), '예시로 둘러보기');
    await click('조립품 편집 예시'); await page.waitForSelector('[data-assembly-status=ready]');
    await page.waitForSelector('[aria-label="조립품 3D 표시 영역"] canvas');
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(await footerCount(), 2, 'Only More and Save remain in the assembly footer');
    assert.equal(await page.$$eval('[data-assembly-part]', (nodes) => nodes.length), 10);
    assert.equal(await page.evaluate(() => document.body.textContent.includes('위치·관계 적용')), false);
    assert.equal(await page.$eval('[aria-label="조립품 부품 목록"]', (panel) => {
      const rect = panel.getBoundingClientRect(); return [...panel.querySelectorAll('[data-assembly-part]')].every((node) => { const box = node.getBoundingClientRect(); return box.top >= rect.top && box.bottom <= rect.bottom; });
    }), true, 'All ten part selectors fit without scrolling');
    await click('더보기'); await page.screenshot({ path: path.join(output, 'assembly-more-1920.png') });
    await page.keyboard.press('Escape'); assert.equal(await focus(), '더보기');
    await page.keyboard.press('ArrowDown'); await waitFocus('저장값 복원');
    await page.keyboard.press('End'); assert.equal(await focus(), '예시 초기화');
    await page.keyboard.press('Tab'); assert.equal(await expanded('더보기'), 'false', 'Tab can leave the menu');
    await click('더보기'); await page.click('h1'); assert.equal(await expanded('더보기'), 'false', 'Outside click closes the menu');
    await click('입력 데이터'); await page.waitForSelector('dialog[open] textarea'); assert.equal(await focus(), '닫기');
    await page.keyboard.press('Tab'); assert.equal(await focus(), '조립품 입력 데이터');
    await page.keyboard.press('Tab'); assert.equal(await focus(), '닫기', 'Native modal traps keyboard focus');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { hidden: true }); assert.equal(await focus(), '더보기');
    await page.click('[data-assembly-part=base]'); await edit('-12.5'); assert.equal(await worldX(), -12.5, 'Valid edits preview immediately');
    assert.match(await page.$eval('[data-task-footer]', (node) => node.textContent), /미저장/);
    await edit(''); assert.equal(await worldX(), -12.5, 'Invalid text retains the last good preview');
    assert.equal(await page.$$eval('[data-task-footer] button', (nodes) => nodes.find((node) => node.textContent === '조립품 저장').disabled), true);
    await click('더보기'); assert.equal(await page.$eval('button[aria-label="조립품 JSON 내보내기"]', (node) => node.disabled), true); await page.keyboard.press('Escape');
    await click('미적용 입력 취소'); assert.equal(await page.$eval('input[aria-label="조립품 위치 X"]', (node) => node.value), '-12.5');
    await edit('0'); assert.doesNotMatch(await page.$eval('[data-task-footer]', (node) => node.textContent), /미저장/, 'Reverting a field clears the changed state');
    await edit('7'); await click('조립품 저장'); assert.match(await page.$eval('[data-task-footer]', (node) => node.textContent), /저장됨/);
    await edit('10'); await click('저장값 복원'); assert.equal(await worldX(), 7);
    const assemblyFile = path.join(output, 'saved-assembly.json');
    fs.writeFileSync(assemblyFile, await page.evaluate(() => localStorage.getItem('hanwha.assembly-editor.v1.flange-base-m8-v1')));
    const chooserPromise = page.waitForFileChooser(); await click('조립품 JSON 불러오기');
    await (await chooserPromise).accept([assemblyFile]);
    await page.waitForFunction(() => document.querySelector('[data-task-footer]').textContent.includes('파일을 불러왔습니다'));
    assert.equal(await worldX(), 7, 'The file import action opens the native chooser through More');
    await click('보기'); await page.keyboard.press('Escape'); assert.equal(await focus(), '보기');
    for (const [width, height] of [[1920, 1080], [1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height });
      await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
      await page.screenshot({ path: path.join(output, 'assembly-simple-' + width + '.png') });
    }
    await page.setViewport({ width: 1920, height: 1080 }); await click('도면 분석으로');
    await click('PDF → 3D 예시'); await page.waitForSelector('[data-model-status=draft]');
    assert.equal(await footerCount(), 2, 'The PDF model footer also keeps two controls');
    await click('도면 분석으로');
    const filename = path.join(output, 'review.pdf'); fs.writeFileSync(filename, makePdfFixture());
    await (await page.$('input[aria-label="분석할 PDF 선택"]')).uploadFile(filename);
    await page.waitForFunction(() => document.querySelector('[data-analysis-status=complete]') && [...document.querySelectorAll('button')].some((node) => node.textContent === '부품 검토·보정' && !node.disabled));
    assert.equal(await footerCount(), 3); await click('부품 검토·보정');
    assert.equal(await footerCount(), 3); await page.screenshot({ path: path.join(output, 'review-simple-1920.png') });
    assert.deepEqual(errors, []);
    console.log('PASS usability: reduced footer controls, ten selectors without scrolling, keyboard disclosure navigation/Escape/Tab/outside click, modal focus trap/restoration, immediate valid preview, invalid recovery/export blocking, semantic dirty state and save/restore, HD/FHD/QHD');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
checkBrowser().catch((error) => { console.error(error); process.exitCode = 1; });
