'use client';
import dynamic from 'next/dynamic';
import { Stage } from '@/components/common/Stage';
import { HorizonBackdrop } from '@/components/backdrop/HorizonBackdrop';
import { useHudController } from './useHudController';
import { HudUiLayer } from './HudUiLayer';

// three.js는 클라이언트 전용 + 코드 분할 (첫 화면 로딩 부담 감소)
const HudScene = dynamic(() => import('./scene/HudScene').then((module) => module.HudScene), { ssr: false });

/** 교육장 단독 페이지: /training/hud?product=&card= */
export function HudScreen({ productId, cardIndex }: { productId: string; cardIndex: number }) {
  const controller = useHudController({ productId, cardIndex });
  const { hudState, dispatch } = controller;
  return (
    <Stage
      background={<HorizonBackdrop isFlat hasIntro={false} />}
      scene={<HudScene phase={hudState.phase} benchHeight={hudState.benchHeight} isLayoutEditing={hudState.isLayoutEditing} onExplodeDone={() => dispatch({ type: 'explodeDone' })} onPlacingDone={() => dispatch({ type: 'placingDone' })} />}
    >
      <HudUiLayer controller={controller} />
    </Stage>
  );
}
