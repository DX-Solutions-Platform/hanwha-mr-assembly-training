export function paceDemoProgress(duration: number, signal: AbortSignal, onProgress: (percent: number) => void) {
  const startedAt = performance.now();
  let available = 3;
  let displayed = 3;
  const timer = window.setInterval(() => {
    if (signal.aborted) return;
    const elapsed = (performance.now() - startedAt) / duration;
    const percent = Math.min(98, available, Math.floor(3 + 97 * elapsed));
    if (percent <= displayed) return;
    displayed = percent;
    onProgress(percent);
  }, 150);

  return {
    report(percent: number) { available = Math.max(available, percent); },
    async wait() {
      signal.throwIfAborted();
      const remaining = duration - (performance.now() - startedAt);
      if (remaining <= 0) return;
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          signal.removeEventListener('abort', abort);
          resolve();
        }, remaining);
        function abort() {
          window.clearTimeout(timeout);
          reject(signal.reason);
        }
        signal.addEventListener('abort', abort, { once: true });
      });
    },
    dispose() { window.clearInterval(timer); },
  };
}
