import { useEffect, useState } from 'react';
import type { DrawingPage } from '../../types';
import type { DrawingShape } from './draftGeometry';
import { readDrawingShape } from './readDrawingShape';
import { findLabeledViews, readOrthographicShape } from './readOrthographicViews';
import { readIsometricDrawing } from './readIsometricDrawing';

export function useDrawingShape(pages: DrawingPage[], enabled: boolean) {
  const [completed, setCompleted] = useState<{ pages: DrawingPage[]; shape: DrawingShape | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void (async () => {
      const { signal } = controller;
      const regions = await findLabeledViews(pages, signal).catch(() => null);
      const projected = regions && await readOrthographicShape(pages, regions, signal).catch(() => null);
      if (signal.aborted) return;
      if (projected) { setCompleted({ pages, shape: projected }); return; }
      for (const page of pages) {
        if (controller.signal.aborted) return;
        const shape = await readDrawingShape(page, signal).catch(() => null) ??
          await readIsometricDrawing(page, signal).catch(() => null);
        if (shape && !controller.signal.aborted) { setCompleted({ pages, shape }); return; }
      }
      if (!controller.signal.aborted) setCompleted({ pages, shape: null });
    })();
    return () => controller.abort();
  }, [pages, enabled]);
  return enabled && completed?.pages === pages ? completed : null;
}
