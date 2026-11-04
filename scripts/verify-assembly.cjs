// 원본 체결식의 경계 및 안전 판정 회귀 검사. 별도 런타임/의존성 추가 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.join(__dirname, '../src/features/training-practice/assemblyMath.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mathModule = new Module(filename, module); mathModule._compile(compiled, filename);
const { angularDelta, tighten, displayedTorque, displayedResistance, overTorque, BOLT_ORDER } = mathModule.exports;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
assert.deepEqual(BOLT_ORDER, [0, 2, 1, 3]);
close(angularDelta(-179 * Math.PI / 180, 179 * Math.PI / 180), 2 * Math.PI / 180);
close(angularDelta(179 * Math.PI / 180, -179 * Math.PI / 180), -2 * Math.PI / 180);
close(tighten(0.5, -Math.PI).progress, 0.5); // 역방향으로 체결이 진행되면 안 됩니다.
close(tighten(0, Math.PI * 0.3).progress, 0.1);
assert.ok(tighten(0.9, 0.1).rotation < tighten(0.5, 0.1).rotation); // 마지막 구간 저항 증가.
close(displayedTorque(0.82), 2.5); close(displayedTorque(1), 12);
close(displayedResistance(0.7), 0.2); close(displayedResistance(1), 1);
assert.equal(overTorque(0.45, false).warn, false); assert.equal(overTorque(0.450001, false).warn, true);
assert.equal(overTorque(1, true).warn, false); assert.ok(overTorque(0.450001, false).torque > 12.6);
let progress = 0, previousTorque = 0;
for (let index = 0; index < 20000 && progress < 1; index++) {
  const next = tighten(progress, 0.01); assert.ok(next.progress >= progress && next.progress <= 1);
  const torque = displayedTorque(next.progress); assert.ok(torque >= previousTorque); previousTorque = torque; progress = next.progress;
}
close(progress, 1); close(previousTorque, 12);
console.log('Assembly boundary and monotonicity checks passed.');
