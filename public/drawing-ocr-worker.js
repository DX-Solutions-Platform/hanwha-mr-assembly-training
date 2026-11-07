/* Tesseract host worker: terminating this job also stops its child OCR worker. */
const ROOT = self.location.origin + '/vendor/ocr-7.0.0';
let enginePromise;
let currentJob;
let isBusy = false;
let isRefining = false, refineProgress = 0;
function progress(message) {
  const value = message.status === 'recognizing text' ? isRefining ? .85 + refineProgress * .15 : message.progress * .85 : message.progress;
  if (currentJob) self.postMessage({ id: currentJob.id, type: 'progress', status: message.status, progress: value });
}
async function engine() {
  if (!enginePromise) {
    importScripts(ROOT + '/tesseract.min.js');
    enginePromise = Tesseract.createWorker(['kor', 'eng'], 1, {
      workerPath: ROOT + '/worker.min.js', corePath: ROOT + '/core', langPath: ROOT + '/lang',
      workerBlobURL: false, cacheMethod: 'none', gzip: true, logger: progress,
      errorHandler: (reason) => { if (currentJob) self.postMessage({ id: currentJob.id, type: 'error', message: String(reason).slice(0, 300) }); },
    }).then(async (worker) => {
      await worker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1', user_defined_dpi: '300' });
      return worker;
    });
  }
  return enginePromise;
}
self.onmessage = async ({ data }) => {
  if (isBusy || !data || data.type !== 'recognize' || typeof data.id !== 'number' || !(data.image instanceof Blob)) return;
  isBusy = true; currentJob = data; isRefining = false; refineProgress = 0;
  try {
    const worker = await engine();
    const { data: result } = await worker.recognize(data.image, { rotateAuto: false }, { text: true, blocks: true });
    importScripts(self.location.origin + '/drawing-ocr-refine.js');
    isRefining = true;
    const refined = await self.refineDrawingOcr(worker, data.image, result, (value) => { refineProgress = value; progress({ status: 'recognizing text', progress: 1 }); });
    const wordList = [];
    for (const line of refined.lines) {
      let offset = 0;
      for (const word of line.words || []) {
        const index = line.text.indexOf(word.text, offset);
        const joinWithPrevious = index >= 0 ? offset > 0 && index === offset : word.joinWithPrevious ?? false;
        if (index >= 0) offset = index + word.text.length;
        wordList.push({ text: word.text, confidence: word.confidence, bbox: word.bbox, baseline: line.baseline, lineBox: line.bbox, joinWithPrevious });
      }
    }
    self.postMessage({ id: data.id, type: 'result', wordList, confidence: result.confidence, refinedLineCount: refined.refinedLineCount });
  } catch (reason) {
    self.postMessage({ id: data.id, type: 'error', message: String(reason?.message || reason).slice(0, 300) });
  } finally { currentJob = null; isBusy = false; }
};
