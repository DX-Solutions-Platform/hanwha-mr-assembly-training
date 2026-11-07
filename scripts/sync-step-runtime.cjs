const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.dirname(require.resolve('occt-import-js/package.json'));
const version = require(path.join(source, 'package.json')).version;
if (version !== '0.0.23') throw new Error('Update the STEP worker and model identity before changing OCCT versions.');
const target = path.join(root, 'public/vendor/occt-0.0.23');
fs.mkdirSync(target, { recursive: true });
for (const name of ['occt-import-js.js', 'occt-import-js.wasm', 'license.occt-import-js.txt', 'license.occt.txt']) {
  fs.copyFileSync(path.join(source, 'dist', name), path.join(target, name));
}
fs.writeFileSync(path.join(target, 'NOTICE.txt'), [
  'occt-import-js 0.0.23 / Open CASCADE WebAssembly runtime; unmodified distribution files.',
  'License texts are included alongside the JavaScript and WASM.',
  'Package and source: https://registry.npmjs.org/occt-import-js/-/occt-import-js-0.0.23.tgz',
  'Upstream: https://github.com/kovacsv/occt-import-js',
  'Recreate these assets: node scripts/sync-step-runtime.cjs',
  '',
].join('\n'));
console.log('STEP runtime synchronized: ' + version);
