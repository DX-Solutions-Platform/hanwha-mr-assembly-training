'use client';
import { useEffect, useRef } from 'react';

export function useKeyPress(keyCode: string, onPress: (event: KeyboardEvent) => void, onRelease?: (event: KeyboardEvent) => void) {
  const pressRef = useRef(onPress); const releaseRef = useRef(onRelease);
  pressRef.current = onPress; releaseRef.current = onRelease;
  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => { if (event.code === keyCode && !event.repeat) pressRef.current(event); };
    const handleUp = (event: KeyboardEvent) => { if (event.code === keyCode) releaseRef.current?.(event); };
    window.addEventListener('keydown', handleDown); window.addEventListener('keyup', handleUp);
    return () => { window.removeEventListener('keydown', handleDown); window.removeEventListener('keyup', handleUp); };
  }, [keyCode]);
}
