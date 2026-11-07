/* Re-read uncertain cells from their pixels; do not guess material names or symbols. */
self.refineDrawingOcr = async (worker, image, result, report) => {
  const lines = (result.blocks || []).flatMap(block => (block.paragraphs || []).flatMap(paragraph => paragraph.lines || []));
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return { lines, refinedLineCount: 0 };
  const bitmap = await createImageBitmap(image);
  const jobs = [];
  for (const line of lines) {
    const groups = [];
    for (const word of line.words || []) {
      const previous = groups[groups.length - 1];
      if (!previous || word.bbox.x0 - previous.right > (line.bbox.y1 - line.bbox.y0) * 1.5) groups.push({ words: [word], right: word.bbox.x1 });
      else { previous.words.push(word); previous.right = Math.max(previous.right, word.bbox.x1); }
    }
    groups.forEach((group, index) => { if (group.words.some(word => /[가-힣]/.test(word.text))) jobs.push({ line, group, right: groups[index + 1]?.words[0].bbox.x0 ?? bitmap.width * .97, korean: true }); });
    if (/^\s*\d+(?:[.,]\d+)?\s*[£€¥+].*\d/.test(line.text) && /mm|cm/.test(line.text)) jobs.push({ line, group: { words: line.words }, right: line.bbox.x1 + 25, korean: false });
  }
  let refinedLineCount = 0;
  try {
    for (const [index, job] of jobs.slice(0, 32).entries()) {
      report(index / Math.min(32, jobs.length));
      await worker.reinitialize(job.korean ? 'kor' : 'eng', 1);
      await worker.setParameters({ tessedit_pageseg_mode: '7', preserve_interword_spaces: '0', tessedit_char_whitelist: job.korean ? '' : '0123456789.,+-±° mcin' });
      const pad = Math.max(12, Math.round((job.line.bbox.y1 - job.line.bbox.y0) * .7));
      const left = Math.max(0, Math.min(...job.group.words.map(word => word.bbox.x0)) - pad), top = Math.max(0, job.line.bbox.y0 - pad);
      const width = Math.min(bitmap.width - left, job.right - left - (job.korean ? pad / 2 : 0)), height = Math.min(bitmap.height - top, job.line.bbox.y1 - top + pad);
      const canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d'); context.drawImage(bitmap, -left, -top);
      const { data } = await worker.recognize(await canvas.convertToBlob({ type: 'image/png' }), { rotateAuto: false }, { text: true, blocks: true });
      const words = (data.blocks || []).flatMap(block => (block.paragraphs || []).flatMap(paragraph => (paragraph.lines || []).flatMap(line => line.words || [])));
      const original = job.group.words.map(word => word.text).join(' ');
      const acceptable = job.korean ? /[가-힣]/.test(data.text) : /±/.test(data.text);
      if (words.length && data.confidence >= 60 && acceptable) {
        const changed = data.text.trim() !== original;
        const box = value => ({ x0: value.x0 + left, y0: value.y0 + top, x1: value.x1 + left, y1: value.y1 + top });
        let textOffset = 0;
        const replacement = words.map(word => {
          const index = data.text.indexOf(word.text, textOffset), joinWithPrevious = textOffset > 0 && index === textOffset;
          if (index >= 0) textOffset = index + word.text.length;
          return { ...word, bbox: box(word.bbox), confidence: changed ? Math.min(75, word.confidence) : word.confidence, joinWithPrevious };
        });
        const offset = job.line.words.indexOf(job.group.words[0]); job.line.words.splice(offset, job.group.words.length, ...replacement); refinedLineCount++;
      }
    }
  } finally { bitmap.close(); await worker.reinitialize(['kor', 'eng'], 1); await worker.setParameters({ tessedit_pageseg_mode: '3', tessedit_char_whitelist: '', preserve_interword_spaces: '1', user_defined_dpi: '300' }); }
  report(1); return { lines, refinedLineCount };
};
