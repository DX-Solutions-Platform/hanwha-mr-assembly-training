const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { makeClick } = require('./browser-ui-helpers.cjs');

const output = path.join(os.tmpdir(), 'hanwha-qwen-shape-qa');
const args = process.argv.slice(2);
const fixture = args.find((arg) => !arg.startsWith('--')) || path.join(output, 'qwen-shape-comparison.pdf');
const modelMode = args.find((arg) => arg.startsWith('--model='))?.slice('--model='.length);
const modelNames = { '8b': 'qwen3-vl:8b', awq: 'cyankiwi/Qwen3.5-27B-AWQ-4bit' };
const route = 'http://localhost:3000/training/upload';
const expected = new Map([
  ['QA-001', '플랜지'], ['QA-002', '볼트'], ['QA-003', '너트'],
  ['QA-004', '와셔'], ['QA-005', '베이스판'], ['QA-006', '축'],
]);
const holdList = ['QA-008', 'QA-009', 'QA-010', 'QA-011'];

async function upload(page) {
  const input = await page.$('input[aria-label="분석할 PDF 선택"]');
  await input.uploadFile(fixture);
  await input.dispose();
  await page.waitForFunction(() => document.querySelector('[data-analysis-status="complete"]') &&
    [...document.querySelectorAll('button')].some((button) => button.textContent === '부품 검토·보정' && !button.disabled));
  return page.$eval('[data-analysis-status="complete"]', (node) => Number(node.dataset.analysisElapsedMs));
}

async function waitForQwen(page, model) {
  await page.waitForSelector('[data-shape-run]:not([data-shape-run=running])', { timeout: 300_000 });
  const run = await page.$eval('[data-shape-run]', (node) => ({
    status: node.dataset.shapeRun, model: node.dataset.shapeModel, ms: Number(node.dataset.shapeElapsedMs), message: node.textContent,
  }));
  assert.equal(run.status, 'complete', run.message);
  assert.equal(run.model, model);
  return run;
}

async function readSaved(page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.startsWith('hanwha.part-review.v1.'));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
}

function score(payload) {
  const correct = [], wrong = [], blank = [], wrongHold = [];
  for (const part of payload.parts) {
    const expectedName = expected.get(part.partNumber);
    if (expectedName) {
      const item = { number: part.partNumber, expected: expectedName, actual: part.name };
      if (part.name === expectedName) correct.push(item);
      else if (part.hasTemporaryName) blank.push(item);
      else wrong.push(item);
    } else if (holdList.includes(part.partNumber) && !part.hasTemporaryName) {
      wrongHold.push({ number: part.partNumber, actual: part.name });
    }
  }
  assert.equal(correct.length + wrong.length + blank.length, expected.size);
  return { correct, wrong, blank, wrongHold };
}

async function measure(browser, mode, index, hash) {
  const model = modelNames[mode];
  const useQwen = !!model;
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const click = makeClick(page), requests = [], errors = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/drawing/shape-name')) requests.push(request.url());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route + '?qwen=' + mode, { waitUntil: 'networkidle0' });
    const pdfMs = await upload(page);
    const qwen = useQwen ? await waitForQwen(page, model) : null;
    await click('부품 검토·보정');
    await click('검토 결과 저장');
    const payload = await readSaved(page);
    assert.equal(payload.document.sha256, hash);
    assert.equal(payload.parts.length, 11);
    assert.equal(payload.parts.find((part) => part.partNumber === 'QA-007').name, 'Hex cap screw');
    assert.ok(payload.evidence.partList.filter((part) => part.partNumber !== 'QA-007').every((part) => part.name === ''), 'Source names are preserved');
    assert.equal(requests.length, useQwen ? 7 : 0, 'Only seven eligible drawings should reach local Qwen');
    assert.ok(requests.every((url) => url === 'http://localhost:3000/api/drawing/shape-name'));
    const requestCount = requests.length;
    const result = score(payload);
    const suggestions = payload.parts.filter((part) => part.shapeNameSuggestion);
    assert.ok(suggestions.every((part) => part.shapeNameSuggestion.model === model));
    if (suggestions.length && index === 2) await checkEvidenceAndRestore(page, click, suggestions[0], model);
    assert.deepEqual(errors, []);
    return { mode, model: model ?? null, useQwen, index: index + 1, pdfMs, shapeMs: qwen?.ms ?? 0, totalMs: pdfMs + (qwen?.ms ?? 0), requests: requestCount, ...result };
  } finally {
    await context.close();
  }
}

async function checkEvidenceAndRestore(page, click, part, model) {
  const { source } = part.shapeNameSuggestion;
  assert.equal(source.pageNumber, Number(part.partNumber.slice(3)));
  assert.ok(source.rect.width < .9 && source.rect.height < .9, 'Evidence identifies a bounded drawing region');
  const select = () => page.click('[data-review-part="number:' + part.partNumber + '"]');
  const inspect = async () => {
    await click('판단 영역 보기 · ' + source.pageNumber + '쪽');
    const style = await page.$eval('[aria-label="검토 원문 강조 위치"]', (node) => Number.parseFloat(node.style.width));
    assert.ok(Math.abs(style - source.rect.width * 100) < .01);
  };
  await select();
  await inspect();
  const suffix = model === modelNames.awq ? '-awq' : '';
  await page.screenshot({ path: path.join(output, 'qwen-evidence' + suffix + '-1920.png') });
  await page.setViewport({ width: 1280, height: 720 });
  await page.screenshot({ path: path.join(output, 'qwen-evidence' + suffix + '-1280.png') });

  await page.reload({ waitUntil: 'networkidle0' });
  await upload(page);
  await click('부품 검토·보정');
  await select();
  await page.waitForSelector('[data-shape-name]');
  await inspect();
  assert.equal(await page.$eval('[aria-label="검토 품명"]', (node) => node.value), part.name);
  await page.click('[aria-label="검토 품명"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.type('Reviewed by operator');
  await page.waitForSelector('[data-shape-name]', { hidden: true });
  await click('검토 결과 저장');
  const updated = (await readSaved(page)).parts.find((entry) => entry.partNumber === part.partNumber);
  assert.equal(updated.name, 'Reviewed by operator');
  assert.equal(updated.shapeNameSuggestion, undefined);
}

async function main() {
  assert.ok(!modelMode || Object.hasOwn(modelNames, modelMode), 'Use --model=8b or --model=awq');
  const hash = createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');
  const previous = path.join(output, 'comparison.json');
  if (modelMode && fs.existsSync(previous)) assert.equal(hash, JSON.parse(fs.readFileSync(previous, 'utf8')).hash, 'Use the exact original comparison PDF');
  const endpoint = modelMode === 'awq' ? 'http://127.0.0.1:18080/v1/models' : 'http://127.0.0.1:11434/api/ps';
  const before = await (await fetch(endpoint, { signal: AbortSignal.timeout(5000) })).json();
  if (modelMode === 'awq') assert.ok(before.data?.some((item) => item.id === modelNames.awq), 'Start the exact AWQ checkpoint in WSL2 first');
  const browser = await puppeteer.launch({ headless: true });
  const runs = [];
  try {
    for (const mode of modelMode ? [modelMode] : ['off', '8b']) {
      for (let index = 0; index < 3; index++) {
        const run = await measure(browser, mode, index, hash);
        runs.push(run);
        console.log(JSON.stringify({
          mode, index: run.index, ms: Math.round(run.totalMs),
          pdfMs: Math.round(run.pdfMs), shapeMs: Math.round(run.shapeMs), correct: run.correct.length,
          wrong: run.wrong, blank: run.blank.length, wrongHold: run.wrongHold, requests: run.requests,
        }));
      }
    }
    const reportPath = path.join(output, modelMode ? 'comparison-' + modelMode + '.json' : 'comparison.json');
    fs.writeFileSync(reportPath, JSON.stringify({ hash, fixture, before, runs }, null, 2));
    console.log('Report: ' + reportPath);
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
