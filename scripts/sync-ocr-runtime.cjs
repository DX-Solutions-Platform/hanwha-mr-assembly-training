const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = path.dirname(require.resolve('tesseract.js/package.json'));
const core = path.dirname(require.resolve('tesseract.js-core/package.json'));
const version = require(path.join(source, 'package.json')).version;
if (version !== '7.0.0' || require(path.join(core, 'package.json')).version !== '7.0.0') throw new Error('Update OCR_ENGINE_ID before changing the OCR runtime.');
const target = path.join(root, 'public/vendor/ocr-7.0.0');
fs.mkdirSync(path.join(target, 'core'), { recursive: true });
fs.mkdirSync(path.join(target, 'lang'), { recursive: true });
for (const name of ['tesseract.min.js', 'worker.min.js']) fs.copyFileSync(path.join(source, 'dist', name), path.join(target, name));
fs.copyFileSync(path.join(source, 'LICENSE.md'), path.join(target, 'LICENSE.tesseract.md'));
fs.copyFileSync(path.join(core, 'LICENSE'), path.join(target, 'LICENSE.core.txt'));
for (const name of fs.readdirSync(core).filter((name) => /\.wasm(?:\.js)?$/.test(name))) fs.copyFileSync(path.join(core, name), path.join(target, 'core', name));
const hashes = {};
for (const language of ['eng', 'kor']) {
  const folder = path.dirname(require.resolve('@tesseract.js-data/' + language + '/package.json'));
  if (require(path.join(folder, 'package.json')).version !== '1.0.0') throw new Error('OCR language model version changed.');
  const input = path.join(folder, '4.0.0_best_int', language + '.traineddata.gz');
  const bytes = fs.readFileSync(input); hashes[language] = createHash('sha256').update(bytes).digest('hex');
  fs.copyFileSync(input, path.join(target, 'lang', language + '.traineddata.gz'));
}
fs.writeFileSync(path.join(target, 'NOTICE.txt'), [
  'Tesseract.js 7.0.0, Tesseract.js-core 7.0.0; unmodified distribution files.',
  'Upstream: https://github.com/naptha/tesseract.js / https://github.com/naptha/tesseract.js-core',
  'Language data: @tesseract.js-data/{eng,kor} 1.0.0 / 4.0.0_best_int.',
  'Language upstream (Apache 2.0): https://github.com/naptha/tessdata',
  'Model SHA-256: ' + JSON.stringify(hashes),
  'Recreate with: node scripts/sync-ocr-runtime.cjs',
  'OCR runs locally in browser workers; no document is sent to an OCR service.', '',
].join('\n'));
console.log('Local OCR runtime synchronized: ' + version);
