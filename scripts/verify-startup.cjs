const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/education-select/referenceThree.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function createLoader() {
  const scripts = [], timers = new Map();
  let timerId = 0;
  const context = {
    exports: {},
    window: {
      setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
      clearTimeout(id) { timers.delete(id); },
    },
    document: {
      createElement() { return { remove() { this.removed = true; } }; },
      head: { appendChild(script) { scripts.push(script); } },
    },
  };
  vm.runInNewContext(compiled, context);
  return { context, scripts, timers, load: context.exports.loadReferenceThree };
}

async function checkLoader() {
  const loader = createLoader();
  const pending = loader.load();
  assert.equal(loader.load(), pending, 'Concurrent requests share the pending library load');
  assert.equal(loader.scripts.length, 1);
  loader.scripts[0].onerror();
  await assert.rejects(pending, /Could not load/);
  assert.equal(loader.scripts[0].removed, true);
  assert.equal(loader.timers.size, 0);

  const retry = loader.load();
  assert.notEqual(retry, pending, 'Retry must create a fresh load after failure');
  const three = { REVISION: '149' };
  loader.context.window.THREE = three;
  loader.scripts[1].onload();
  assert.equal(await retry, three);
  assert.equal(await loader.load(), three);
  assert.equal(loader.timers.size, 0);

  const timeout = createLoader();
  const stalled = timeout.load();
  [...timeout.timers.values()][0]();
  await assert.rejects(stalled, /timed out/);
  assert.equal(timeout.scripts[0].removed, true);
  const afterTimeout = timeout.load();
  timeout.context.window.THREE = three;
  timeout.scripts[1].onload();
  assert.equal(await afterTimeout, three);

  const invalid = createLoader();
  const invalidLoad = invalid.load();
  invalid.context.window.THREE = { REVISION: '180' };
  invalid.scripts[0].onload();
  await assert.rejects(invalidLoad, /did not initialize/);
  const validRetry = invalid.load();
  invalid.context.window.THREE = three;
  invalid.scripts[1].onload();
  assert.equal(await validRetry, three);
  console.log('PASS 3D loader: concurrency, failure, timeout, version validation and retry');
}

async function checkEntry() {
  const baseUrl = process.argv[2] ?? 'http://localhost:3000';
  const response = await fetch(baseUrl, { redirect: 'manual' });
  assert.equal(response.status, 200, 'The entry page must show the tutorial instead of redirecting');
  const rawHtml = await response.text();
  const html = rawHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.match(html, /프로젝트 튜토리얼/);
  assert.match(html, /건너뛰기/);
  assert.match(html, /조립의 전 과정을/);
  assert.ok(rawHtml.includes('/intro-keyboard.js') && rawHtml.includes('__next_s'), 'Keyboard bootstrap must be scheduled before React hydration');
  assert.match(html, /href="\/\?step=2"/);
  assert.match(html, /href="\/\?view=start"/);
  assert.doesNotMatch(html, /aria-label="튜토리얼 단계"/);
  const atlas = await fetch(new URL('/intro/tutorial-objects-v2.png', baseUrl));
  assert.equal(atlas.status, 200, 'Rendered tutorial objects must be available locally');
  assert.doesNotMatch(html, /<canvas\b|src="\/vendor\/three/);
  const mobile = await fetch(baseUrl, { headers: { 'user-agent': 'Mozilla/5.0 (iPhone) Mobile' } });
  const mobileHtml = (await mobile.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.match(mobileHtml, /PC에서 이용할 수 있습니다/);
  const titleList = ['조립의 전 과정을', '제품을 선택하고', '안전과 부품을', '도구를 고르고', '실습 기록으로', '도면에서'];
  const partCountList = [7, 3, 2, 2, 1, 3];
  for (let index = 0; index < 6; index++) {
    const entry = await fetch(new URL(`/?step=${index + 1}`, baseUrl));
    const entryHtml = (await entry.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(entryHtml.includes(titleList[index]), `Step ${index + 1} must render without React hydration`);
    assert.equal((entryHtml.match(/data-intro-part=/g) ?? []).length, partCountList[index]);
    if (index === 5) assert.match(entryHtml, /href="\/training"/);
  }
  const start = await fetch(new URL('/?view=start', baseUrl));
  assert.match((await start.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), /시작하기/);
  console.log('PASS entry: server-rendered tutorial, skip, deferred 3D and mobile guide');
}

function checkNavigation() {
  const filename = path.join(__dirname, '../src/features/training-start/introNavigation.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {} }; vm.runInNewContext(code, context);
  const { createIntroNavigation, introNavigationReducer: reduce } = context.exports;
  let state = createIntroNavigation(0);
  for (let count = 0; count < 5; count++) state = reduce(state, { type: 'move', delta: 1 });
  assert.equal(state.index, 0); assert.equal(state.target, 5);
  const visited = [];
  while (state.phase !== 'idle') {
    state = reduce(state, { type: 'exitDone' }); visited.push(state.index);
    state = reduce(state, { type: 'enterDone' });
  }
  assert.deepEqual(visited, [1, 2, 3, 4, 5]);
  assert.equal(reduce(state, { type: 'move', delta: 1 }).index, 5);
  state = reduce(state, { type: 'move', delta: -1, isImmediate: true });
  assert.equal(state.index, 4); assert.equal(state.phase, 'idle');
  state = createIntroNavigation(0);
  state = reduce(reduce(state, { type: 'move', delta: 1 }), { type: 'move', delta: -1 });
  state = reduce(state, { type: 'exitDone' });
  assert.equal(state.index, 0); assert.equal(state.phase, 'idle');
  console.log('PASS navigation: rapid input queue, sequential transitions, bounds, reversal and reduced motion');
}

function checkKeyboard() {
  class Element { closest() { return null; } }
  class Anchor extends Element {
    clicks = 0;
    click() { this.clicks++; }
    getAttribute() { return null; }
  }
  const actions = Object.fromEntries(['next', 'previous', 'skip', 'confirm'].map((name) => [name, new Anchor()]));
  const listeners = [];
  let hasIntro = true;
  const context = { window: {}, HTMLElement: Element, HTMLAnchorElement: Anchor, document: {
    documentElement: { dataset: {} },
    querySelector() { return hasIntro ? { querySelector(selector) { return actions[selector.match(/"(\w+)"/)[1]]; } } : null; },
    addEventListener(type, handler, capture) { listeners.push({ type, handler, capture }); },
  } };
  const code = fs.readFileSync(path.join(__dirname, '../public/intro-keyboard.js'), 'utf8');
  vm.runInNewContext(code, context); vm.runInNewContext(code, context);
  assert.equal(listeners.length, 1); assert.equal(listeners[0].capture, true);
  const press = (key, extra = {}) => listeners[0].handler({ key, target: new Element(), preventDefault() {}, ...extra });
  press('ArrowRight'); press('ArrowLeft'); press('Escape'); press('Enter');
  for (const anchor of Object.values(actions)) assert.equal(anchor.clicks, 1);
  press('ArrowRight', { repeat: true }); press('ArrowRight', { ctrlKey: true });
  hasIntro = false; press('ArrowRight');
  assert.equal(actions.next.clicks, 1);
  console.log('PASS keyboard: works before React, single capture listener, shortcuts and page scoping');
}

(async () => { checkNavigation(); checkKeyboard(); await checkLoader(); await checkEntry(); })().catch((error) => { console.error(error); process.exitCode = 1; });
