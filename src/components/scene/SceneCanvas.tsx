'use client';
import { useState, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useRenderDpr } from '@/hooks/useRenderDpr';
import { RENDER_QUALITY_STEP_LIST } from '@/lib/renderBudget';

interface SceneCanvasProps {
  children: ReactNode;
  camera?: CanvasProps['camera'];
  hasShadows?: boolean;
  onPointerMissed?: CanvasProps['onPointerMissed'];
  frameloop?: CanvasProps['frameloop'];
  resize?: CanvasProps['resize'];
  orthographic?: boolean;
  detailDpr?: number;
}

/**
 * 모든 3D 화면 공통 캔버스 (저사양 PC · Quest 3 기준)
 * - 렌더 배율: 픽셀 예산(useRenderDpr) × 품질 단계(프레임 저하 시 자동 하향)
 * - 배경 투명(alpha) → 뒤의 HorizonBackdrop이 보임, 후처리 없음, 스텐실 끔
 */
export function SceneCanvas({ children, camera, hasShadows = false, onPointerMissed, frameloop = 'always', resize, orthographic, detailDpr }: SceneCanvasProps) {
  const baseDpr = useRenderDpr();
  const [qualityIndex, setQualityIndex] = useState(0);
  const renderDpr = (detailDpr ?? baseDpr) * RENDER_QUALITY_STEP_LIST[qualityIndex];
  const lastIndex = RENDER_QUALITY_STEP_LIST.length - 1;
  return (
    <Canvas
      dpr={renderDpr}
      shadows={hasShadows}
      camera={camera}
      frameloop={frameloop}
      resize={resize}
      orthographic={orthographic}
      onPointerMissed={onPointerMissed}
      gl={{ antialias: detailDpr !== undefined || renderDpr < 1.2, alpha: true, stencil: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setQualityIndex((index) => Math.min(index + 1, lastIndex))}
        onIncline={() => setQualityIndex((index) => Math.max(index - 1, 0))}
      />
      {children}
    </Canvas>
  );
}
