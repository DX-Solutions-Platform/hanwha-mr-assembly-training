'use client';
import { useEffect, useEffectEvent } from 'react';

export function useKeyPress(keyCode: string, onPress: (event: KeyboardEvent) => void, onRelease?: (event: KeyboardEvent) => void) {
  const handlePress = useEffectEvent(onPress);
  const handleRelease = useEffectEvent((event: KeyboardEvent) => onRelease?.(event));
  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => { if (event.code === keyCode && !event.repeat) handlePress(event); };
    const handleUp = (event: KeyboardEvent) => { if (event.code === keyCode) handleRelease(event); };
    window.addEventListener('keydown', handleDown); window.addEventListener('keyup', handleUp);
    return () => { window.removeEventListener('keydown', handleDown); window.removeEventListener('keyup', handleUp); };
  }, [keyCode]);
}
