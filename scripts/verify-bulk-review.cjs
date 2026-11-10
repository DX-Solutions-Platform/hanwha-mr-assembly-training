const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadModule, analyze, token, tableTokens, makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { parseReviewImport } = loadModule('review/bulk/reviewImport');
const { buildBulkReviewPlan, confirmReadyParts } = loadModule('review/bulk/bulkReviewModel');
const { groupParts, createPartReview, revisePart, getReviewIssues, needsReviewFields } = loadModule('review/reviewModel');
const { createReviewPackage, decodeReview } = loadModule('review/reviewPersistence');
const { makeClick } = require('./browser-ui-helpers.cjs');
const baseOptions = { selectedKeys: [], rowList: [], sourceName: 'test.csv', material: '', quantity: '', shouldOverwrite: false, hasReviewedNoDimensions: false };
function checkModel() {
  const multi = analyze([
    token('PART', .15, .1), token('DESCRIPTION', .32, .1), token('QTY', .7, .1), token('MATERIAL', .84, .1), token('NUMBER', .15, .12),
    token('FG-01', .15, .17), token('Long flange description', .32, .17, .45), token('2', .7, .17), token('AL6061', .84, .17),
  ]);
  assert.equal(multi.headerCount, 1); assert.equal(multi.partList[0].partNumber, 'FG-01');
  assert.equal(multi.partList[0].name, 'Long flange description'); assert.equal(multi.partList[0].material, 'AL6061');
  const korean = analyze([
    token('부품', .1, .1), token('품', .32, .1), token('수', .65, .1), token('재', .8, .1),
    token('번호', .1, .12), token('명', .32, .12), token('량', .65, .12), token('질', .8, .12),
    token('001234', .1, .17), token('플랜지', .32, .17), token('2', .65, .17), token('스틸', .8, .17),
  ]);
  assert.equal(korean.partList[0].partNumber, '001234'); assert.equal(korean.partList[0].name, '플랜지');
  const labeled = analyze([token('PART NO = 001234', .1, .1), token('PART NAME = Flange', .1, .15), token('QTY = 2', .1, .2), token('MATERIAL = AL6061', .1, .25), token('SPEC = D100', .1, .3), token('678901', .7, .5)]);
  assert.equal(labeled.partList[0].partNumber, '001234'); assert.equal(labeled.partList[0].name, 'Flange');
  assert.equal(labeled.partList[0].quantity, 2); assert.equal(labeled.partList[0].material, 'AL6061');
  assert.match(labeled.partList[0].source.text, /MATERIAL = AL6061/); assert.equal(labeled.partList[1].name, '', 'Labels must not fill unrelated codes on the same page');
  assert.equal(analyze([token('PART NO = 001234', .1, .1), token('PART NO = 678901', .1, .15), token('MATERIAL = Steel', .1, .2)]).partList.length, 0, 'An ambiguous multi-part title block cannot supply guessed fields');
  const imported = parseReviewImport('\uFEFF부품번호,품명,수량,재질,규격·비고\r\n001234,"플랜지, 소형",2,AL6061,"가공\n완료"\r\n1234,Base,1,Steel,');
  assert.equal(imported.rowList.length, 2); assert.equal(imported.rowList[0].partNumber, '001234'); assert.equal(imported.rowList[0].values.name, '플랜지, 소형');
  assert.match(imported.rowList[0].values.specification, /가공\n완료/);
  assert.equal(parseReviewImport('Part No\tName\tQty\tMaterial\n001234\tFlange\t2.5\tAL6061').rowList[0].values.quantity, '2.5');
  assert.equal(parseReviewImport('부품번호;품명;수량\n001234;플랜지;2,5').rowList[0].values.quantity, '2,5');
  const conflict = parseReviewImport('품번,품명,수량\n001234,First,1\n001234,Second,1\n678901,Nut,-1');
  assert.equal(conflict.rowList.length, 0); assert.equal(conflict.warnings.length, 2);
  assert.throws(() => parseReviewImport('Name,Qty\nFlange,1'), /부품번호/);
  assert.throws(() => parseReviewImport('품번,품명\n001234,"Flange'), /따옴표/);
  assert.throws(() => parseReviewImport('품번,partno,품명\n001,001,F'), /중복/);
  assert.throws(() => parseReviewImport('x'.repeat(2 * 1024 * 1024 + 1)), /2 MB/);
  const page = { pageNumber: 1, partList: ['001234', '1234', '678901'].map((partNumber, index) => ({ id: 'code-' + index, kind: 'code', item: '', partNumber, name: '', quantity: null, quantityText: '', material: '', specification: '', source: { pageNumber: 1, text: partNumber, rect: { x: .1, y: .1, width: .1, height: .02 } } })), dimensionList: [] };
  const groups = groupParts([page]), parts = groups.map(createPartReview), selectedKeys = parts.map((part) => part.key);
  const options = { ...baseOptions, selectedKeys, rowList: imported.rowList, material: 'Common steel' };
  const plan = buildBulkReviewPlan(groups, parts, options);
  assert.equal(plan.changes.length, 3); assert.equal(plan.changes[0].after.name, '플랜지, 소형'); assert.equal(plan.changes[1].after.name, 'Base');
  assert.equal(plan.changes[2].after.quantity, '', 'A missing quantity cannot default to one or count appearances');
  assert.equal(parts[0].name, '미지정 부품 001234'); assert.equal(parts[0].hasTemporaryName, true);
  assert.equal(plan.changes[0].after.hasTemporaryName, undefined, 'An imported name replaces a temporary name without overwrite');
  assert.equal(plan.changes[2].after.hasTemporaryName, true, 'Other field changes preserve the temporary label');
  assert.equal(page.partList[0].name, '', 'Bulk edits preserve original evidence');
  const applied = parts.map((part) => plan.changes.find((change) => change.key === part.key)?.after ?? part);
  assert.equal(confirmReadyParts(applied, selectedKeys, '2026-11-05T00:00:00Z')[0].status, 'draft', 'Dimensions require explicit review');
  const reviewed = buildBulkReviewPlan(groups, applied, { ...options, hasReviewedNoDimensions: true }).changes.map((change) => change.after);
  const confirmed = confirmReadyParts(reviewed, selectedKeys, '2026-11-05T00:00:00Z');
  assert.equal(confirmed.filter((part) => part.status === 'confirmed').length, 2, 'Incomplete parts cannot be bulk confirmed');
  const noOverwrite = buildBulkReviewPlan(groups, confirmed, { ...options, material: 'Other steel' }); assert.equal(noOverwrite.changes.length, 0);
  const overwrite = buildBulkReviewPlan(groups, confirmed, { ...options, material: 'Other steel', shouldOverwrite: true });
  assert.equal(overwrite.changes[0].after.status, 'draft'); assert.match(overwrite.changes[0].after.note, /일괄 입력/);
  assert.equal(buildBulkReviewPlan(groups, applied, options).changes.length, 0, 'Reapplying unchanged values must preserve status and notes');
  assert.equal(buildBulkReviewPlan(groups, parts, { ...options, selectedKeys: [], shouldOverwrite: true }).changes.length, 0);
  assert.ok(buildBulkReviewPlan(groups, parts, { ...options, quantity: '0' }).warnings.length);
  const unknown = buildBulkReviewPlan(groups, parts, { ...options, rowList: [{ partNumber: 'UNKNOWN', values: { name: 'Wrong' } }], material: '' });
  assert.equal(unknown.unknownNumbers.length, 1); assert.equal(unknown.changes.length, 0);
  const document = { sha256: 'a'.repeat(64), name: 'bulk.pdf', size: 100, pageCount: 1 };
  const payload = createReviewPackage(document, groups, confirmed, [page]);
  assert.equal(decodeReview(JSON.stringify(payload), document, groups, []).partList[0].status, 'confirmed');
  const bomPage = { ...page, partList: analyze(tableTokens()).partList }, bomGroups = groupParts([bomPage]);
  assert.equal(buildBulkReviewPlan(bomGroups, bomGroups.map((group) => ({ ...createPartReview(group), name: '' })), { ...baseOptions, selectedKeys: bomGroups.map((group) => group.key) }).changes.length, 3, 'PDF evidence can refill missing unique fields');
  console.log('PASS bulk model: multi-line headings, long cells, explicit single-part labels, exact code/leading-zero matching, CSV/TSV/quoted fields, duplicate/invalid rows, blank-only fill, common values, no guesses, confirmation invalidation, explicit dimensions and persistence');
}
function checkTemporaryNames() {
  const record = { id: 'p1-part1', kind: 'table', item: '1', partNumber: '001234', name: '', quantity: 2, quantityText: '2', material: 'Steel', specification: '', source: { pageNumber: 1, text: '001234 2 Steel', rect: { x: .1, y: .1, width: .3, height: .02 } } };
  const page = { pageNumber: 1, partList: [record, { ...record, id: 'p2-part1' }], dimensionList: [] };
  const groups = groupParts([page]), temporary = createPartReview(groups[0]);
  assert.equal(groups.length, 1); assert.equal(temporary.name, '미지정 부품 001234'); assert.equal(temporary.hasTemporaryName, true);
  assert.equal(needsReviewFields(temporary), true, 'Temporary names remain discoverable in the needs filter');
  assert.equal(revisePart(temporary, { quantity: '3' }).hasTemporaryName, true);
  const renamed = revisePart(temporary, { name: 'Custom bracket' }); assert.equal(renamed.hasTemporaryName, undefined);
  assert.equal(buildBulkReviewPlan(groups, [renamed], { ...baseOptions, selectedKeys: [renamed.key], shouldOverwrite: true }).changes.length, 0, 'Missing original names cannot reset a manual name to a placeholder');
  const ready = { ...temporary, hasNoDimensions: true }; assert.equal(getReviewIssues(ready).length, 0, 'A person can explicitly confirm a temporary identifier');
  const confirmed = confirmReadyParts([ready], [ready.key], '2026-11-05T00:00:00Z'); assert.equal(confirmed[0].status, 'confirmed');
  const document = { sha256: 'c'.repeat(64), name: 'unnamed.pdf', size: 100, pageCount: 1 };
  const payload = createReviewPackage(document, groups, confirmed, [page]);
  const decode = (data) => decodeReview(JSON.stringify(data), document, groups, []).partList[0];
  assert.equal(decode(payload).hasTemporaryName, true); assert.equal(decode(payload).status, 'confirmed');
  assert.equal(payload.evidence.partList[0].name, '', 'The generated label must never become original evidence');
  for (const schemaVersion of [1, 2]) {
    const old = JSON.parse(JSON.stringify(payload)); old.schemaVersion = schemaVersion; old.parts[0].name = ''; old.parts[0].status = 'draft'; old.parts[0].confirmedAt = null; delete old.parts[0].hasTemporaryName;
    assert.equal(decode(old).name, temporary.name); assert.equal(decode(old).hasTemporaryName, true, 'Old blank drafts receive a temporary name');
  }
  const invalid = JSON.parse(JSON.stringify(payload)); invalid.parts[0].hasTemporaryName = 'true'; assert.throws(() => decode(invalid), /임시 품명/);
  invalid.parts[0].hasTemporaryName = true; invalid.parts[0].name = 'Pretend original name'; assert.throws(() => decode(invalid), /임시 품명/);
  const conflictGroup = groupParts([{ ...page, partList: [{ ...record, name: 'Plate' }, { ...record, id: 'other', name: 'Bracket' }] }])[0];
  const conflict = createPartReview(conflictGroup); assert.equal(conflict.name, ''); assert.equal(conflict.hasTemporaryName, undefined, 'Conflicting source names must remain an explicit choice');
  const noNumbers = groupParts([{ ...page, partList: [{ ...record, partNumber: '' }, { ...record, id: 'other', partNumber: '' }] }]).map(createPartReview);
  assert.notEqual(noNumbers[0].name, noNumbers[1].name); assert.ok(noNumbers.every((part) => part.hasTemporaryName));
  console.log('PASS temporary names: grouping, unique identifiers, missing-name migration, source conflicts, user confirmation, edits, bulk protection, provenance and JSON compatibility');
}
async function checkBrowser() {
  const browser = await require('puppeteer').launch({ headless: true });
  const output = path.join(os.tmpdir(), 'hanwha-bulk-review-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 }); const click = makeClick(page);
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const pdfPath = path.join(output, 'codes-only.pdf'); fs.writeFileSync(pdfPath, makePdfFixture(1, [[token('001234', .2, .3), token('678901', .5, .4)]]));
    const ready = () => page.waitForFunction(() => document.querySelector('[data-analysis-status=complete]') && [...document.querySelectorAll('button')].some((node) => node.textContent === '부품 검토·보정' && !node.disabled));
    const open = async () => { await click('일괄 입력·확정'); await page.waitForSelector('dialog[open] [aria-label="일괄 부품표 입력"]'); };
    const primary = async () => { const handle = await page.$('dialog[open] > div:last-child button'); await handle.click(); await handle.dispose(); };
    const set = (label, value) => page.$eval('[aria-label="' + label + '"]', (node, value) => { const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    await page.goto('http://localhost:3000/training/upload-dev', { waitUntil: 'networkidle0' }); await (await page.$('input[aria-label="분석할 PDF 선택"]')).uploadFile(pdfPath); await ready(); await click('부품 검토·보정');
    assert.equal(await page.$eval('[aria-label="검토 품명"]', (node) => node.value), '미지정 부품 001234'); await page.waitForSelector('[data-temporary-name]');
    await set('검토 수량', '2'); await set('검토 재질', 'AL6061'); await click('치수 0'); await page.click('[aria-label="원문에 치수 없음 확인"]');
    await click('이 부품 검토 확정'); await page.waitForSelector('[data-review-status=confirmed]'); await click('검토 결과 저장');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('hanwha.part-review.v1.')))));
    assert.equal(saved.parts[0].hasTemporaryName, true); assert.equal(saved.parts[0].status, 'confirmed'); assert.equal(saved.evidence.partList[0].name, '');
    const temporaryJsonPath = path.join(output, 'temporary-review.json'); fs.writeFileSync(temporaryJsonPath, JSON.stringify(saved));
    await page.reload({ waitUntil: 'networkidle0' }); await (await page.$('input[aria-label="분석할 PDF 선택"]')).uploadFile(pdfPath); await ready(); await click('부품 검토·보정');
    await page.waitForSelector('[data-review-status=confirmed]'); await page.waitForSelector('[data-temporary-name]');
    await page.screenshot({ path: path.join(output, 'temporary-name-restored-1920.png') });
    await page.click('[aria-label="검토 품명"]'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.type('Custom flange');
    await page.waitForSelector('[data-temporary-name]', { hidden: true }); await page.waitForSelector('[data-review-status=draft]'); await click('검토 결과 저장');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('hanwha.part-review.v1.')))).parts[0].hasTemporaryName), undefined);
    const jsonChooser = page.waitForFileChooser(); await click('검토 JSON 불러오기'); await (await jsonChooser).accept([temporaryJsonPath]);
    await page.waitForSelector('[data-temporary-name]'); await page.waitForSelector('[data-review-status=confirmed]');
    await click('확정 해제'); await click('치수 0'); await page.click('[aria-label="원문에 치수 없음 확인"]'); await click('품명·수량·재질'); await open();
    const csvPath = path.join(output, 'parts.csv'); fs.writeFileSync(csvPath, '\uFEFF부품번호,품명,수량,재질,규격·비고\n001234,플랜지,2,AL6061,OD100\n678901,베이스판,1,Steel,120x120');
    const chooserPromise = page.waitForFileChooser(); await click('부품표 파일 선택'); await (await chooserPromise).accept([csvPath]);
    await page.waitForFunction(() => document.querySelector('[aria-label="일괄 부품 정보 미리보기"]').textContent.includes('플랜지'));
    assert.equal(await page.$eval('[aria-label="검토 품명"]', (node) => node.value), '미지정 부품 001234', 'Preview cannot overwrite the review before Apply');
    await primary(); await page.waitForFunction(() => document.querySelector('[aria-label="검토 품명"]').value === '플랜지');
    assert.equal(await page.$eval('dialog[open] > div:last-child button', (node) => node.disabled), true, 'No silent confirmation without dimension review');
    await page.click('[aria-label="일괄 원문 치수 없음 확인"]'); await primary();
    await page.waitForFunction(() => document.querySelector('dialog[open] > div:last-child button').textContent.includes('확정 가능한 2종'));
    await page.screenshot({ path: path.join(output, 'bulk-filled-1920.png') }); await primary();
    await page.waitForFunction(() => document.querySelectorAll('[data-review-part] [class]').length > 0 && document.querySelector('[data-review-status=confirmed]'));
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { hidden: true });
    assert.equal(await page.evaluate(() => document.activeElement.textContent), '일괄 입력·확정');
    await click('검토 결과 저장');
    await page.reload({ waitUntil: 'networkidle0' }); await (await page.$('input[aria-label="분석할 PDF 선택"]')).uploadFile(pdfPath); await ready(); await click('부품 검토·보정');
    assert.equal(await page.$eval('[aria-label="검토 품명"]', (node) => node.value), '플랜지'); assert.equal(await page.$eval('[aria-label="검토 재질"]', (node) => node.value), 'AL6061');
    await page.waitForSelector('[data-review-status=confirmed]'); await open(); await page.click('[aria-label="일괄 전체 부품 선택"]');
    await set('일괄 부품표 입력', '품번\t품명\t수량\t재질\n001234\t변경된 플랜지\t3\tAL7075');
    assert.equal(await page.$eval('dialog[open] > div:last-child button', (node) => node.disabled), true, 'Existing values stay protected by default');
    await page.click('[aria-label="일괄 기존값 덮어쓰기"]'); await primary();
    await page.waitForFunction(() => document.querySelector('[aria-label="검토 품명"]').value === '변경된 플랜지');
    await page.keyboard.press('Escape'); await page.waitForSelector('[data-review-status=draft]'); await open();
    await set('일괄 공통 수량', '-1'); assert.equal(await page.$eval('dialog[open] > div:last-child button', (node) => node.disabled), true);
    await set('일괄 공통 수량', '');
    for (const [width, height] of [[1920, 1080], [1280, 720], [900, 900]]) {
      await page.setViewport({ width, height });
      assert.equal(await page.$eval('dialog[open]', (node) => node.scrollWidth <= node.clientWidth + 1), true);
      await page.screenshot({ path: path.join(output, 'bulk-dialog-' + width + '.png') });
    }
    await page.keyboard.press('Escape'); await page.setViewport({ width: 1920, height: 1080 });
    const labeledPath = path.join(output, 'labeled-part.pdf'); fs.writeFileSync(labeledPath, makePdfFixture(1, [[token('PART NO = LBL-001', .1, .1), token('PART NAME = Flange', .1, .15), token('QTY = 2', .1, .2), token('MATERIAL = AL6061', .1, .25)]]));
    await (await page.$('input[aria-label="분석할 PDF 선택"]')).uploadFile(labeledPath); await ready(); await click('부품 검토·보정');
    assert.equal(await page.$eval('[aria-label="검토 품명"]', (node) => node.value), 'Flange');
    assert.equal(await page.$eval('[aria-label="검토 수량"]', (node) => node.value), '2');
    assert.equal(await page.$eval('[aria-label="검토 재질"]', (node) => node.value), 'AL6061');
    await click('보완 0'); assert.equal(await page.$$eval('[data-review-part]', (nodes) => nodes.length), 0);
    await click('전체 1'); assert.equal(await page.$$eval('[data-review-part]', (nodes) => nodes.length), 1);
    await page.screenshot({ path: path.join(output, 'labeled-auto-filled-1920.png') });
    assert.deepEqual(errors, []);
    console.log('PASS browser bulk: native PDF/CSV/JSON chooser, temporary names, confirmation/save/reload/JSON restoration, manual rename, bulk replacement, original evidence, preview/apply separation, batch confirmation, protected values, overwrite invalidation, numeric rejection, keyboard focus and responsive dialog');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
if (require.main === module) (async () => { checkModel(); checkTemporaryNames(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
