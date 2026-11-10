const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const puppeteer = require('puppeteer');
const THREE = require('three');
const { loadModule } = require('./verify-drawing-upload-dev.cjs');
const { captureFastenerGeometry } = loadModule('../drawing-flow/flowFastenerContacts');

const base = 'http://localhost:3000/training/upload';
const input = 'input[aria-label="STEP 및 PDF 파일 선택"]';
const cube = path.join(path.dirname(require.resolve('occt-import-js/package.json')), 'test/testfiles/simple-basic-cube/cube.stp');

function checkFastenerGeometry() {
  const material = new THREE.MeshBasicMaterial();
  const piece = (geometry, y, hardware = false) => ({
    obj: new THREE.Mesh(geometry, material), home: new THREE.Vector3(0, y, 0), q: new THREE.Quaternion(), hardware,
  });
  const bore = (depth) => {
    const plate = new THREE.Shape();
    plate.moveTo(-7, -7); plate.lineTo(7, -7); plate.lineTo(7, 7); plate.lineTo(-7, 7); plate.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, 2.1, 0, Math.PI * 2, true); plate.holes.push(hole);
    return new THREE.ExtrudeGeometry(plate, { depth, bevelEnabled: false, curveSegments: 24 })
      .translate(0, 0, -depth / 2).rotateX(Math.PI / 2);
  };
  const screw = piece(new THREE.CylinderGeometry(2, 2, 10, 32), 0, true);
  const receiver = piece(bore(10), 0);
  const one = captureFastenerGeometry(THREE, [screw, receiver]);
  assert.equal(Array.from(one.evidence(0).targets, target => target.index).join(), '1');
  assert.equal(one.evidence(0, new Map([[1, [20, 0, 0]]])).targets.length, 0);
  const two = captureFastenerGeometry(THREE, [screw, piece(bore(5), -2.5), piece(bore(5), 2.5)]);
  assert.equal(Array.from(two.evidence(0).targets, target => target.index).sort().join(), '1,2');
  const solid = captureFastenerGeometry(THREE, [screw, piece(new THREE.BoxGeometry(10, 10, 10), 0)]);
  assert.equal(solid.evidence(0).targets.length, 0, 'An overlapping solid without a bore remains ambiguous');
}

function controls(page) {
  return {
    text: (text) => page.waitForFunction((value) => document.body.innerText.includes(value), { timeout: 30_000 }, text),
    click: async (text) => {
      const handle = await page.waitForFunction((value) => {
        const compact = (text) => text.trim().replace(/\s+/g, '');
        return [...document.querySelectorAll('[role=button], button, a')].find((node) =>
          node.checkVisibility() && !node.disabled && compact(node.textContent) === compact(value));
      }, { timeout: 15_000 }, text);
      try { await handle.asElement().click(); } finally { await handle.dispose(); }
    },
  };
}

async function checkPositionEditor(page) {
  const { text, click } = controls(page);
  const axis = '[data-step-viewport] [data-ax="x"]';
  const drag = async () => {
    await page.waitForSelector(axis, { visible: true });
    const point = await page.$eval(axis, (element) => {
      const box = element.getBoundingClientRect();
      const angle = new DOMMatrix(getComputedStyle(element).transform);
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, dx: angle.a * 60, dy: angle.b * 60 };
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + point.dx, point.y + point.dy, { steps: 5 });
    await page.mouse.up();
    await text('미리보기 · X');
  };
  await page.waitForSelector(axis, { hidden: true });
  await click('위치 수정');
  await drag();
  await click('원래 위치 보기');
  await text('STEP 원래 위치 비교 중');
  await page.waitForSelector(axis, { hidden: true });
  await click('수정 위치 보기');
  await text('미리보기 · X');
  await click('취소');
  await text('STEP 원래 위치');
  await page.waitForSelector(axis, { hidden: true });

  await click('위치 수정');
  await drag();
  await click('위치 적용');
  await text('수정됨 · X');
  await page.waitForSelector(axis, { hidden: true });
  await click('위치 수정');
  await click('원래 위치로');
  await click('위치 적용');
  await page.waitForFunction(() => document.querySelector('[data-position-status]')?.textContent === 'STEP 원래 위치');
  await page.waitForSelector(axis, { hidden: true });
}

async function checkActualUpload(page) {
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  const { text, click } = controls(page);
  await (await page.waitForSelector(input)).uploadFile(cube, path.resolve('public/examples/pdf-model/flange-model-example.pdf'));
  await text('쪽 · 부품표');
  await click('STEP 읽기 시작');
  await text('다음 · 조립도');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'))?.isContextLost() === false;
  });
  assert.match(await page.evaluate(() => document.body.innerText), /cube[\s\S]*300 × 300 × 300/);
  await click('다음 · 조립도');
  await text('와이어프레임 R');
  await click('04 조립 순서');
  await click('와이어프레임 끄기');
  await page.waitForSelector('[data-step-leaders] line', { visible: true });
  await click('와이어프레임 켜기');
  await checkPositionEditor(page);
  await click('검증');
  await text('전체 순서 · 1단계');
  assert.doesNotMatch(await page.$eval('[data-step-validation]', node => node.textContent), /확정됨/);
  await click('이 순서 확정');
  await text('형상 검토 완료');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280);
}

async function checkUnspecifiedFastener(page, folder) {
  const model = path.join(folder, 'fastener.stp');
  const longName = 'bolt 92010A783_NO_THREADS_Passivated 18-8 Stainless Steel Phillips Flat Head Machine Screw';
  const source = fs.readFileSync(cube, 'utf8');
  fs.writeFileSync(model, source.replace("PRODUCT('cube','cube'", `PRODUCT('${longName}','${longName}'`));

  await page.goto(base, { waitUntil: 'networkidle0' });
  const { text, click } = controls(page);
  await (await page.waitForSelector(input)).uploadFile(model);
  await click('STEP 읽기 시작');
  await click('다음 · 조립도');
  await text('와이어프레임 R');
  await click('04 조립 순서');
  await text('편집 중');
  await page.waitForSelector('[data-lk="0"]', { visible: true });
  const layout = await page.evaluate(() => {
    const title = document.querySelector('[data-step-name]');
    const toolbar = document.querySelector('[data-step-toolbar]').getBoundingClientRect();
    const validation = document.querySelector('[data-step-validation]').getBoundingClientRect();
    const controls = document.querySelector('[data-step-view-controls]').getBoundingClientRect();
    const viewport = document.querySelector('[data-step-viewport]').getBoundingClientRect();
    const row = document.querySelector('[data-row]');
    const name = row.querySelector('[data-step-part-name]');
    const nameStyle = getComputedStyle(name);
    const detail = document.querySelector('[data-step-full-part-name]');
    return {
      fullName: title.title,
      truncated: title.scrollWidth > title.clientWidth,
      separate: title.getBoundingClientRect().right <= validation.left && validation.right <= controls.left && toolbar.bottom <= viewport.top,
      selectedLabelHidden: !document.querySelector('[data-step-label="0"]').checkVisibility(),
      rowEllipsis: nameStyle.whiteSpace === 'nowrap' && nameStyle.textOverflow === 'ellipsis' && name.scrollWidth > name.clientWidth,
      quantityClear: name.getBoundingClientRect().right <= row.lastElementChild.getBoundingClientRect().left,
      detailName: detail.textContent,
    };
  });
  assert.deepEqual(layout, {
    fullName: longName + ' 체결', truncated: true, separate: true, selectedLabelHidden: true,
    rowEllipsis: true, quantityClear: true, detailName: longName,
  });
  await page.waitForSelector('[data-step-warning]', { hidden: true });
  assert.doesNotMatch(await page.$eval('[data-step-validation]', node => node.textContent), /순서 검토|확인 필요/);
  const adviceRequest = page.waitForRequest(request => request.url().endsWith('/api/drawing/assembly-review'));
  await click('검증');
  await adviceRequest;
  await text('순서 검토 1건 보기');
  await text('먼저 놓인 부품이 0개 확인됐습니다.');
  await text('그 부품을 이 체결 단계보다 앞에 배치하세요.');
  assert.doesNotMatch(await page.$eval('[data-row]', row => row.textContent), /먼저 놓인 부품|확인 필요/);
  await text('01번 · bolt');
  await page.click('[data-step-action] summary');
  await click('놓기');
  await text('편집 중');
  await page.waitForSelector('[data-step-warning]', { hidden: true });
  await page.waitForSelector('[data-sequence-advice]', { hidden: true });
  await click('↶ 되돌리기');
  await click('검증');
  await text('순서 검토 1건 보기');
  await click('이 순서 확정');
  await text('관리자가 현재 순서를 확정했습니다');
  await text('확정됨 · 1단계');
  await click('← 03 조립도');
  await page.waitForSelector('[data-current-step]', { hidden: true });
  await text('와이어프레임 R');
  await click('04 조립 순서');
  await click('전체 공구 검토');
  await text('공구 확인');
  await text('도면 값 확인 필요');
  await page.waitForSelector('[data-tool-library]', { visible: true });
  assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /05\s*체결 · 공구/);
  await click('체결부 확대');
  await click('전체 조립 보기');
  await click('전체 도구');
  await text('Torx 비트');
  await page.type('[aria-label="도구 검색"]', 'sp13');
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-tool-library]');
    return panel?.innerText.includes('스패너 13 mm') && !panel.innerText.includes('Torx 비트');
  });
  await click('추천 공구로 남은 1곳 모두 확정');
  await text('남은 1곳을 추천 공구로 확정했습니다');
  const torque = '[aria-label="토크 (N·m)"]';
  await page.type(torque, '0.85');
  await page.keyboard.press('Enter');
  await text('담당자가 고친 값입니다');
  const hash = createHash('sha256').update(fs.readFileSync(model)).digest('hex');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key))[0][0], `hanwha-drawing-flow.v1.${hash}.dx7_link_plan_all`);
  assert.equal(saved.nm, 0.85);
  assert.equal(saved.toolK, 'ph2');
}

async function checkContactReview(page, folder) {
  const model = path.join(folder, 'single-contact.stp');
  const source = fs.readFileSync(cube, 'utf8');
  const torxName = 'Low profile torx, M2x5 v2';
  fs.writeFileSync(model, source.replace(/\bDATA;([\s\S]*?)ENDSEC;/, (_, data) => {
    const fastener = data.replace(/#(\d+)/g, (_, id) => '#' + (Number(id) + 1000)).replaceAll('cube', torxName);
    const other = data.replace(/#(\d+)/g, (_, id) => '#' + (Number(id) + 2000)).replaceAll('cube', 'Low profile torx, M2x5 v3');
    return 'DATA;' + data + fastener + other + 'ENDSEC;';
  }));
  const hash = createHash('sha256').update(fs.readFileSync(model)).digest('hex');
  const savedPlanKey = `hanwha-drawing-flow.v1.${hash}.dx7_link_plan_all`;

  await page.goto(base, { waitUntil: 'networkidle0' });
  const { text, click } = controls(page);
  await (await page.waitForSelector(input)).uploadFile(model);
  await click('STEP 읽기 시작');
  await click('다음 · 조립도');
  await text('와이어프레임 R');
  await click('04 조립 순서');
  await text('편집 중');
  const [basePart, fastener] = await page.$$('[data-row]');
  assert.match(await basePart.evaluate(row => row.textContent), /놓기/);
  assert.ok(await fastener.$('[data-link-icon="vertical"]'));
  assert.match(await fastener.evaluate(row => row.textContent), /Low profile torx, M2x5 v2.*체결/s);
  await fastener.click();
  assert.doesNotMatch(await fastener.evaluate(row => row.textContent), /확인 필요|추정했습니다/);
  await page.waitForSelector('[data-step-warning]', { hidden: true });
  await click('검증');
  await text('확인 필요 2건 보기');
  await page.waitForFunction(() => document.querySelector('[data-step-warning]')?.textContent.includes('주변 후보 1개'));
  await click('확인 필요 2건 함께 보기');
  assert.equal(await page.$$eval('[data-contact-review-batch] button', buttons => buttons.length), 4);
  await click('도면 대조 완료 · 표시된 순서 유지');
  await click('이 순서 확정');
  await text('형상 검토 완료 · 이 순서로 확정했습니다');
  await text('도면 확인 2건을 반영했습니다');
  await click('← 03 조립도');
  await page.waitForSelector('[data-current-step]', { hidden: true });
  await text('와이어프레임 R');
  await page.evaluate(key => {
    const plan = JSON.parse(localStorage.getItem(key));
    [plan[0][1], plan[0][2]] = [plan[0][2], plan[0][1]];
    localStorage.setItem(key, JSON.stringify(plan));
  }, savedPlanKey);
  await click('04 조립 순서');
  await click('검증');
  await text('전체 순서 · 3단계');
  await page.waitForSelector('[data-step-warning]', { hidden: true });

  await click('← 03 조립도');
  await page.waitForSelector('[data-current-step]', { hidden: true });
  await page.evaluate((key, name) => {
    const plan = JSON.parse(localStorage.getItem(key));
    const index = plan[0].findIndex(row => row.g?.includes(name));
    const [torx] = plan[0].splice(index, 1);
    plan[0].unshift({ ...torx, t: 'place', g: '이전에 저장된 놓기 안내', off: [1, 0, 0] });
    localStorage.setItem(key, JSON.stringify(plan));
  }, savedPlanKey, torxName);
  await click('04 조립 순서');
  await page.waitForSelector('[data-lk="0"][data-step-kind="fasten"]', { visible: true });
  assert.equal(await page.$eval('[data-step-name]', title => title.title), `${torxName} 체결`);
  await click('← 03 조립도');
  await page.waitForSelector('[data-current-step]', { hidden: true });
  const migrated = await page.evaluate(key => JSON.parse(localStorage.getItem(key))[0][0], savedPlanKey);
  assert.equal(migrated.t, 'fasten');
  assert.deepEqual(migrated.off, [1, 0, 0]);
  assert.doesNotMatch(migrated.g, /놓기/);
}

async function checkDemo(page, folder) {
  await page.setViewport({ width: 1920, height: 1080 });
  const instrumentation = await page.evaluateOnNewDocument(() => {
    let engineClass;
    Object.defineProperty(window, 'FlowEngine', {
      get: () => engineClass,
      set(Base) {
        engineClass = class extends Base {
          constructor(...args) { super(...args); window.diagramTestEngine = this; }
        };
      },
    });
  });
  await page.goto(base + '?start=20', { waitUntil: 'networkidle0' });
  await page.removeScriptToEvaluateOnNewDocument(instrumentation.identifier);
  const { text, click } = controls(page);
  await text('와이어프레임 R');
  await text('프레임 결합 (베이스 · 상부 가이드)');
  const checkDiagram = async () => {
    await page.waitForSelector('[data-diagram-fastener-links] line', { visible: true });
    const layout = await page.evaluate(() => {
      const engine = window.diagramTestEngine;
      const visible = engine.pr.pieces.filter(piece => piece.obj.visible);
      const belowFloor = visible.filter(piece => new window.THREE.Box3().setFromObject(piece.obj).min.y < engine.grid.position.y - 0.001);
      const hardware = engine.pr.pieces.filter(piece => {
        const part = engine.pr.parts[piece.part];
        return part.fastenerPart ?? part.std;
      });
      return {
        belowFloor: belowFloor.length, visible: visible.length,
        hiddenFasteners: hardware.filter(piece => !piece.obj.visible && !piece.wireM.visible).length,
        fasteners: hardware.length,
        dashed: [...document.querySelectorAll('[data-diagram-fastener-links] line')].every(line => line.getAttribute('stroke-dasharray')),
      };
    });
    assert.equal(layout.belowFloor, 0);
    assert.ok(layout.visible > 0 && layout.fasteners > 0 && layout.dashed);
    assert.equal(layout.hiddenFasteners, layout.fasteners);
  };
  await checkDiagram();
  await page.click('[data-trdrop="s0"]');
  await checkDiagram();
  await page.click('[data-trdrop="g0-0"]');
  await checkDiagram();
  const link = await page.waitForFunction(() => [...document.querySelectorAll('[data-link-icon="diagonal"]')].find(icon => icon.checkVisibility()));
  const linkPaths = await link.evaluate(icon => [...icon.querySelectorAll('path')].map(path => path.getAttribute('d')));
  await click('부품 펼치기');
  assert.ok((await page.$$('[data-trdrop]')).length > 20);
  await click('04 조립 순서');
  await page.waitForSelector('[data-diagram-fastener-links]', { hidden: true });
  await text('편집 중');
  const stepLink = await page.waitForSelector('[data-row] [data-link-icon="vertical"]', { visible: true });
  assert.deepEqual(await stepLink.evaluate(icon => [...icon.querySelectorAll('path')].map(path => path.getAttribute('d'))), linkPaths);
  assert.equal(await stepLink.evaluate(icon => icon.querySelector('g').getAttribute('transform')), 'rotate(-45 12 12)');
  await page.waitForSelector('[data-lk][data-step-kind="fasten"] [data-link-icon="vertical"]', { visible: true });
  const initialNodes = await page.$$eval('[data-lk]', nodes => nodes.filter(node => node.checkVisibility()).length);
  await click('검증');
  await page.waitForFunction((initial) => {
    const viewport = document.querySelector('[data-sequence-review="true"]');
    if (!viewport) return false;
    const nodes = [...viewport.querySelectorAll('[data-lk]')];
    const links = [...viewport.querySelectorAll('[data-step-sequence-links] > line')];
    const bounds = viewport.getBoundingClientRect();
    const positions = nodes.map(node => node.getBoundingClientRect());
    return nodes.length > initial && nodes.every(node => node.checkVisibility())
      && new Set(positions.map(({ x, y }) => `${x},${y}`)).size === nodes.length
      && positions.every(box => box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom)
      && links.filter(link => link.checkVisibility()).length === nodes.length - 1;
  }, {}, initialNodes);
  await page.click('[data-lk="1"]');
  await page.waitForFunction(() => document.querySelector('[data-current-step]')?.textContent.startsWith('STEP 02'));
  assert.ok(await page.$('[data-sequence-review="true"]'));
  await click('편집으로');
  await page.waitForSelector('[data-sequence-review="true"]', { hidden: true });
  await page.click('[data-lk="0"]');
  const leaders = (pattern) => page.waitForFunction((expected) => {
    const lines = [...document.querySelectorAll('[data-step-leaders] > line')];
    const visible = lines.filter((line) => line.checkVisibility());
    return lines.length > 2 && visible.map((line) => line.getAttribute('stroke-dasharray') ? 'dashed' : 'solid').join(',') === expected;
  }, { timeout: 10_000 }, pattern);
  await leaders('solid,dashed');
  await click('와이어프레임 끄기');
  await leaders('solid');
  await click('와이어프레임 켜기');
  await leaders('solid,dashed');
  const stepBadge = '[data-lk="1"]';
  const stepMenu = '[data-step-context-menu]';
  await page.click(stepBadge);
  await leaders('dashed,solid,dashed');
  await page.waitForSelector(stepMenu, { hidden: true });
  await page.click(stepBadge, { button: 'right' });
  const contextMenu = await page.waitForSelector(stepMenu, { visible: true });
  assert.deepEqual(await contextMenu.evaluate(menu => Array.from(menu.children, item => item.textContent)), ['앞에 추가', '뒤에 추가', '삭제']);
  assert.ok(await contextMenu.evaluate((menu, badge) => menu.getBoundingClientRect().left - document.querySelector(badge).getBoundingClientRect().right >= 8, stepBadge));
  await page.keyboard.press('Escape');
  await page.waitForSelector(stepMenu, { hidden: true });
  await page.click(stepBadge, { button: 'right' });
  await page.waitForSelector(stepMenu, { visible: true });
  await click('와이어프레임 끄기');
  await page.waitForSelector(stepMenu, { hidden: true });
  await leaders('dashed,solid');
  const currentStep = () => page.$eval('[data-current-step]', (element) => element.textContent);
  const startingStep = await currentStep();
  await click('▶ 재생');
  await page.waitForFunction((step) => document.querySelector('[data-current-step]')?.textContent !== step, {}, startingStep);
  await click('❚❚ 일시정지');
  const pausedStep = await currentStep();
  await delay(1350);
  assert.equal(await currentStep(), pausedStep);
  await click('▶ 재생');
  await page.waitForFunction((step) => document.querySelector('[data-current-step]')?.textContent !== step, {}, pausedStep);
  await click('❚❚ 일시정지');
  await click('전체 공구 검토');
  await text('공구 확인');
  await click('와이어프레임');
  await click('실물');
  const bulk = await page.waitForFunction(() => [...document.querySelectorAll('[role=button]')]
    .find((node) => node.checkVisibility() && /^추천 공구로 남은 \d+곳 모두 확정$/.test(node.textContent.trim())));
  await bulk.asElement().click();
  await click('05 구멍 위치');
  await click('06 설계도 · PDF');
  const downloads = await page.createCDPSession();
  await downloads.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: folder });
  await click('PDF 내보내기');
  await text('MB 내려받음');
  const file = path.join(folder, 'DX-ASM-SHP-001_revA.pdf');
  for (let count = 0; count < 50 && !fs.existsSync(file); count++) await delay(200);
  const bytes = fs.readFileSync(file);
  assert.ok(bytes.length > 100_000, 'PDF export contains rendered sheets');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  try { assert.ok(pdf.numPages >= 8, 'Drawing set has multiple pages'); } finally { await pdf.destroy(); }

  await click('교육장 생성');
  await text('교육장 생성이 완료되었습니다');
  await click('교육장 바로 실행');
  await page.waitForSelector('[aria-label="생성된 조립 교육장"] canvas');
  await text('컬럼 각관을 작업대에 세우세요.');
  await click('← 도면 업데이트');
  await click('교육 목록에서 보기');
  await text('교육장 실행 →');
  await page.reload({ waitUntil: 'networkidle0' });
  await text('소형 금속 성형기');
}

async function checkStepClassification(page, folder) {
  const number = 'FN-812';
  const makeFile = (name, filename) => {
    const file = path.join(folder, filename);
    const source = fs.readFileSync(cube, 'utf8').replace(/\bDATA;([\s\S]*?)ENDSEC;/, (_, data) => {
      const part = data.replace(/#(\d+)/g, (_, id) => '#' + (Number(id) + 1000)).replaceAll('cube', name);
      return 'DATA;' + data + part + 'ENDSEC;';
    });
    fs.writeFileSync(file, source);
    return file;
  };
  const registered = makeFile(number, 'registered-action.stp');
  const renamed = makeFile('PART_008', 'renamed-action.stp');
  const { text, click } = controls(page);
  const open = async (file) => {
    await page.goto(base, { waitUntil: 'networkidle0' });
    await (await page.waitForSelector(input)).uploadFile(file);
    await text(path.basename(file));
    await click('STEP 읽기 시작');
    await text('다음 · 조립도');
    await click('다음 · 조립도');
    await text('와이어프레임 R');
    await click('04 조립 순서');
    await page.waitForSelector('[data-lk="1"]', { visible: true });
    const [, part] = await page.$$('[data-row]');
    await part.click();
    await page.waitForFunction(() => document.querySelector('[data-current-step]')?.textContent.startsWith('STEP 02'));
  };
  const onRequest = request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/drawing/assembly-review') {
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true, items: [{ index: 2, reason: '도면에서 체결 위치를 대조해 주세요.' }] }) });
    }
    if (pathname !== '/api/part-library/lookup') return request.continue();
    const { numbers } = JSON.parse(request.postData());
    const matches = numbers.includes(number) ? [{ partNumber: number, assemblyAction: 'fasten' }] : [];
    return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ matches, existingModelNumbers: [] }) });
  };
  await page.setRequestInterception(true);
  page.on('request', onRequest);
  try {
    await open(registered);
    await page.click('[data-step-action] summary');
    await text('라이브러리 기준');
    await page.waitForSelector('[data-lk="1"][data-step-kind="fasten"]');
    await click('체결');
    await text('작업자가 확인한 유형');

    await open(renamed);
    await page.click('[data-step-action] summary');
    await text('같은 조립 형상에서 확인한 유형');
    await page.waitForSelector('[data-lk="1"][data-step-kind="fasten"]');
    await click('놓기');
    await page.waitForSelector('[data-lk="1"][data-step-kind="fasten"]', { hidden: true });
    await click('후속 체결 단계 추가');
    await page.waitForSelector('[data-lk="2"][data-step-kind="fasten"]');
    await click('검증');
    await text('로컬 Qwen 검토 의견');
    await text('도면에서 체결 위치를 대조해 주세요.');
    await page.waitForSelector('[data-step-warning] button');
    await page.click('[data-step-warning] button');
    await click('이 순서 확정');
    await text('확정됨 · 3단계');
    await click('← 03 조립도');
    await page.waitForSelector('[data-current-step]', { hidden: true });
    await click('04 조립 순서');
    await page.waitForSelector('[data-lk="2"][data-step-kind="fasten"]');
    assert.equal(await page.$('[data-lk="1"][data-step-kind="fasten"]'), null);
    await click('전체 공구 검토');
    await text('공구 확인');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-row]')].filter(node => node.checkVisibility()).length === 3);
    await page.click('[data-row]');
    await page.waitForSelector('[data-tool-library]', { hidden: true });
  } finally {
    page.off('request', onRequest);
    await page.setRequestInterception(false);
  }
}

async function main() {
  checkFastenerGeometry();
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'hanwha-drawing-flow-test-'));
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    const classificationContext = await browser.createBrowserContext();
    try {
      const classificationPage = await classificationContext.newPage();
      classificationPage.on('pageerror', (error) => errors.push(error.message));
      await checkStepClassification(classificationPage, folder);
    } finally {
      await classificationContext.close();
    }
    const page = await browser.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await checkActualUpload(page);
    await checkUnspecifiedFastener(page, folder);
    await checkContactReview(page, folder);
    await checkDemo(page, folder);
    assert.deepEqual(errors, []);
    console.log('PASS drawing flow: STEP/PDF import, assembly tree, sequence validation, tool confirmation, PDF export and saved training');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
