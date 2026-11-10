import { useCallback, useEffect, useRef, type DragEvent, type RefObject } from 'react';

export function useDragAutoScroll(active: boolean, container: RefObject<HTMLElement | null>) {
  const dragScroll = useRef<{ x: number; y: number; frame: number } | null>(null);
  const stopDragScroll = useCallback(() => {
    if (dragScroll.current) cancelAnimationFrame(dragScroll.current.frame);
    dragScroll.current = null;
  }, []);
  useEffect(() => stopDragScroll, [stopDragScroll]);

  function trackDragScroll(event: DragEvent<HTMLDivElement>) {
    if (!active) return;
    const list = event.currentTarget;
    const editor = container.current;
    if (!editor) return;
    const { clientX: x, clientY: y } = event;
    if (dragScroll.current) {
      dragScroll.current.x = x;
      dragScroll.current.y = y;
      return;
    }
    const pointer = { x, y, frame: 0 };
    let lastTime = performance.now();
    let remainder = 0;

    const scrollFrame = (time: number) => {
      const bounds = list.getBoundingClientRect();
      const editorBounds = editor.getBoundingClientRect();
      const top = Math.max(bounds.top, editorBounds.top);
      const bottom = Math.min(bounds.bottom, editorBounds.bottom);
      const edge = Math.min(64, (bottom - top) / 3);
      if (pointer.x < bounds.left || pointer.x >= bounds.right || pointer.y < top || pointer.y >= bottom || edge <= 0) {
        stopDragScroll();
        return;
      }
      const fromTop = pointer.y - top;
      const fromBottom = bottom - pointer.y;
      const pressure = fromTop < edge ? fromTop / edge - 1 : Math.max(0, 1 - fromBottom / edge);
      if (!pressure) {
        stopDragScroll();
        return;
      }
      const pixels = remainder + pressure * Math.min(32, time - lastTime) * 0.72;
      const distance = Math.trunc(pixels);
      remainder = pixels - distance;
      lastTime = time;
      if (distance) {
        const before = list.scrollTop;
        list.scrollTop += distance;
        if (list.scrollTop === before) {
          const editorBefore = editor.scrollTop;
          if (distance < 0 ? bounds.top < top : bounds.bottom > bottom) editor.scrollTop += distance;
          if (editor.scrollTop === editorBefore) {
            stopDragScroll();
            return;
          }
        }
      }
      pointer.frame = requestAnimationFrame(scrollFrame);
    };

    dragScroll.current = pointer;
    pointer.frame = requestAnimationFrame(scrollFrame);
  }

  return { trackDragScroll, stopDragScroll };
}
