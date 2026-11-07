import { useEffect, useState } from 'react';
import type { StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import type { createPartDrawingRenderer, DrawingTarget } from './renderPartDrawing';

export interface DrawingRequest {
  key: string;
  target: DrawingTarget | null;
}

export function useStepDrawings(model: StepModel, requests: DrawingRequest[], resolution = 1) {
  const [images, setImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!requests.length) return;
    let isCancelled = false;
    let index = 0;
    let frame = 0;
    let renderer: ReturnType<typeof createPartDrawingRenderer> | undefined;
    const dispose = () => { renderer?.dispose(); renderer = undefined; };

    function drawNext() {
      const { key, target } = requests[index++];
      let image: string | null = null;
      try {
        if (target && renderer) image = renderer.draw(model, target);
      } catch {
        // A failed figure should not prevent the remaining figures from rendering.
      }
      setImages((current) => ({ ...current, [key]: image }));
      if (index < requests.length) frame = requestAnimationFrame(drawNext);
      else dispose();
    }

    void import('./renderPartDrawing').then(({ createPartDrawingRenderer }) => {
      if (isCancelled) return;
      renderer = createPartDrawingRenderer(resolution);
      frame = requestAnimationFrame(drawNext);
    }).catch(() => {
      if (!isCancelled) setImages(Object.fromEntries(requests.map(({ key }) => [key, null])));
      dispose();
    });
    return () => {
      isCancelled = true;
      cancelAnimationFrame(frame);
      dispose();
    };
  }, [model, requests, resolution]);

  return images;
}
