'use client';
import { useEffect, useState } from 'react';
import { getRenderDpr } from '@/lib/renderBudget';

/** 화면 크기(HD~4K)에 맞춘 3D 렌더 배율 */
export function useRenderDpr(): number {
  const [renderDpr, setRenderDpr] = useState(1);
  useEffect(() => {
    const handleResize = () => setRenderDpr(getRenderDpr(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return renderDpr;
}
