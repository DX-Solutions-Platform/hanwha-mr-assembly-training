'use client';
import type { Dispatch } from 'react';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import type { Product } from '@/types/training';
import type { FlowAction, FlowState } from '../state/flowReducer';
import type { SceneBridge } from '../state/sceneBridge';
import { FlowScene } from './FlowScene';

interface FlowCanvasProps { productList: Product[]; flowState: FlowState; dispatch: Dispatch<FlowAction>; bridge: SceneBridge; }

/** 교육 선택·공정 선택 캔버스 (three.js 코드 분할 단위) */
export function FlowCanvas({ productList, flowState, dispatch, bridge }: FlowCanvasProps) {
  return (
    <SceneCanvas camera={{ position: [0, 1.7, 6.6], fov: 38, near: 0.05, far: 60 }} onPointerMissed={() => flowState.phase === 'explode' && dispatch({ type: 'clearSection' })}>
      <FlowScene productList={productList} flowState={flowState} dispatch={dispatch} bridge={bridge} />
    </SceneCanvas>
  );
}
