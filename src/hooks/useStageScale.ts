'use client';
import { useEffect, useState } from 'react';
import { theme } from '@/styles/theme';

/** 1920×1080 좌표계를 화면에 맞게 축소/확대 (HD ~ 4K 대응) */
export function useStageScale(): number {
  const [stageScale, setStageScale] = useState(1);
  useEffect(() => {
    const handleResize = () => setStageScale(Math.min(window.innerWidth / theme.stage.width, window.innerHeight / theme.stage.height));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return stageScale;
}
