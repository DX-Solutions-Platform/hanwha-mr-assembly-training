const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { makeClick } = require('./browser-ui-helpers.cjs');

const base = process.env.QWEN_TEST_URL ?? 'http://localhost:3000';
const folder = path.join(os.tmpdir(), 'hanwha-qwen-shape-qa');
const fixture = path.join(folder, 'qwen-shape-comparison.pdf');
const originalHash = '00080d5b3c9b59f9a411c0f9b0e75e7af392bab7dd0251c27f676d5ef90ffb6e';
const eight = 'qwen3-vl:8b', awq = 'cyankiwi/Qwen3.5-27B-AWQ-4bit';
const awqUrl = 'http://127.0.0.1:18080/v1/models';
const read8b = async () => (await (await fetch('http://127.0.0.1:11434/api/ps')).json()).models.some((model) => model.name === eight);
const awqOnline = async () => (await fetch(awqUrl, { signal: AbortSignal.timeout(1000) }).catch(() => null))?.ok === true;

async function checkRun(page, model) {
  await page.waitForFunction((name) => {
    const status = document.querySelector('[data-shape-run]');
    return status?.dataset.shapeModel === name && status.dataset.shapeRun !== 'running';
  }, { timeout: 510_000 }, model);
  const result = await page.$eval('[data-shape-run]', (node) => ({ status: node.dataset.shapeRun, message: node.textContent, ms: Number(node.dataset.shapeElapsedMs) }));
  assert.equal(result.status, 'complete', result.message);
  return result;
}

async function main() {
  assert.equal(createHash('sha256').update(fs.readFileSync(fixture)).digest('hex'), originalHash);
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const errors = [], models = [], responses = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.url().endsWith('/api/drawing/shape-name')) models.push(JSON.parse(request.postData()).model);
    });
    page.on('response', (response) => {
      if (response.url().endsWith('/api/drawing/shape-name')) responses.push(response.status());
    });
    const click = makeClick(page);
    const read = () => page.evaluate((hash) => JSON.parse(localStorage.getItem('hanwha.part-review.v1.' + hash)).parts, originalHash);
    await page.goto(base + '/training/upload', { waitUntil: 'networkidle0' });
    const input = await page.waitForSelector('input[aria-label="분석할 PDF 선택"]');
    await input.uploadFile(fixture);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => !button.disabled && button.textContent === '부품 검토·보정'));
    const first = await checkRun(page, eight);
    assert.deepEqual(models, Array(7).fill(eight));
    assert.equal(await awqOnline(), false);
    assert.equal(await read8b(), true);
    await click('부품 검토·보정');
    await click('검토 결과 저장');
    const baseline = await read();
    assert.deepEqual(baseline.slice(0, 5).map((part) => part.name), ['플랜지', '볼트', '너트', '와셔', '베이스판']);
    assert.equal(baseline.find((part) => part.partNumber === 'QA-006').hasTemporaryName, true);
    for (const number of ['QA-001', 'QA-007', 'QA-009', 'QA-010', 'QA-011']) {
      await page.click('[data-review-part="number:' + number + '"]');
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].some((button) => button.textContent === '27B로 다시 분석')), false);
    }
    await page.click('[data-review-part="number:QA-006"]');
    console.log('PASS 8B', first, 'QA-006 held; starting a single AWQ retry');
    await click('27B로 다시 분석');
    const second = await checkRun(page, awq);
    assert.deepEqual(models, [...Array(7).fill(eight), awq]);
    assert.ok(responses.every((status) => status === 200), responses);
    assert.equal(await read8b(), false);
    assert.equal(await awqOnline(), true);
    await click('검토 결과 저장');
    const updated = await read();
    const shaft = updated.find((part) => part.partNumber === 'QA-006');
    assert.equal(shaft.name, '축');
    assert.equal(shaft.shapeNameSuggestion.model, awq);
    assert.equal(shaft.shapeNameSuggestion.source.pageNumber, 6);
    assert.deepEqual(updated.filter((part) => part !== shaft), baseline.filter((part) => part.partNumber !== 'QA-006'));
    await click('판단 영역 보기 · 6쪽');
    await page.waitForSelector('[aria-label="검토 원문 강조 위치"]');
    assert.deepEqual(errors, []);
    const result = { hash: originalHash, first, second, models, shaft };
    fs.writeFileSync(path.join(folder, 'comparison-single-retry.json'), JSON.stringify(result, null, 2));
    console.log('PASS single AWQ retry', second, 'QA-006 = 축; all other review records identical');
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
