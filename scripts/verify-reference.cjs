// 원본 상태 병합 계약과 생성된 고정 데이터의 출처를 검증합니다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'src/features/reference-pages/referenceRuntime.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const runtimeModule = new Module(filename, module); runtimeModule.filename = filename; runtimeModule.paths = Module._nodeModulePaths(path.dirname(filename)); runtimeModule._compile(compiled, filename);
const logic = new runtimeModule.exports.PortedLogic({});
let updates = 0; logic.forceUpdate = (callback) => { updates++; callback?.(); };
logic.updateReferenceState({ card: 3, count: 1 });
assert.equal(logic.referenceState.card, 3); // boot 직전에도 URL의 카드가 읽혀야 합니다.
logic.updateReferenceState((state) => ({ count: state.count + 1 }));
logic.updateReferenceState((state) => ({ count: state.count + 1 }));
assert.equal(logic.referenceState.count, 3); assert.equal(logic.referenceState.card, 3); assert.equal(updates, 3);

const generated = path.join(root, 'src/features/reference-pages/generated');
const manifest = JSON.parse(fs.readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const reference = process.argv[2] && path.resolve(process.argv[2]);
const names = new Set(['BOM', 'ACTS', 'HOLES', 'TOOLS', 'META', 'PUMP_CARDS', 'SECTIONS', 'RTOOLS', 'CARDS', 'PARTS', 'NAMES']);
const fields = (code, kind) => {
  const source = ts.createSourceFile('input', code, ts.ScriptTarget.Latest, true, kind);
  assert.equal(source.parseDiagnostics.length, 0);
  const component = source.statements.find(ts.isClassDeclaration); assert.ok(component);
  return new Map(component.members.filter((node) => ts.isPropertyDeclaration(node) && node.initializer && names.has(node.name.getText(source))).map((node) => [node.name.getText(source), node.initializer.getText(source)]));
};
const normalize = (text) => text.replaceAll('/models/hammer.glb', 'uploads/hammer_optimized_14MB/hammer_optimized_14MB.glb').replaceAll("var(--font-mono),'JetBrains Mono',monospace", "'JetBrains Mono',monospace").replace(/\s/g, '');
let checked = 0;
for (const item of manifest) {
  const code = fs.readFileSync(path.join(generated, item.component + '.tsx'), 'utf8');
  assert.ok(!code.includes('extends DCLogic')); assert.ok(!code.includes('support.js')); assert.ok(!code.includes('window.__hud =')); assert.ok(!code.includes('window.__tmInst ='));
  const actual = fields(code, ts.ScriptKind.TSX);
  if (reference) {
    const raw = fs.readFileSync(path.join(reference, item.reference), 'utf8');
    assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), item.sha256);
    const original = raw.match(/<script[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
    for (const [name, value] of fields(original, ts.ScriptKind.TS)) { assert.equal(normalize(actual.get(name)), normalize(value), item.component + '.' + name); checked++; }
  }
}
const menu = fs.readFileSync(path.join(generated, 'TrainingMenuReference.tsx'), 'utf8');
assert.ok(menu.includes('{v.scanEl}')); assert.ok(!menu.includes('String(v.scanEl)'));
const guide = fs.readFileSync(path.join(generated, 'DesignGuideReference.tsx'), 'utf8');
assert.ok(guide.includes('as="feTurbulence"')); assert.ok(guide.includes('baseFrequency='));
console.log(`Reference state/React-node/SVG checks passed; ${manifest.length} pages; ${checked} original data fields verified.`);
