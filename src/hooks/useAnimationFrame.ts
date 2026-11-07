'use client';
import { useEffect, useEffectEvent } from 'react';

/** DOM 오버레이용 rAF 루프. 콜백은 최신 값을 유지하고 루프는 한 번만 등록합니다 */
export function useAnimationFrame(onFrame: (time: number) => void, isActive = true) {
  const handleFrame = useEffectEvent(onFrame);
  useEffect(() => {
    if (!isActive) return;
    let frameId = 0;
    const tick = (time: number) => { handleFrame(time); frameId = requestAnimationFrame(tick); };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isActive]);
}
