'use client';
import { useEffect, useMemo, type Dispatch } from 'react';
import type { Product } from '@/types/training';
import { buildModel } from '@/lib/three/buildModel';
import { disposeModel } from '@/lib/three/disposeModel';
import { setEdgeEmphasis } from '@/lib/three/hairlineEdges';
import { setSurfaceVisible } from '@/lib/three/modelMaterials';
import { getModelSpec } from '@/data/models/modelRegistry';
import type { FlowAction, FlowState } from '../state/flowReducer';
import type { SceneBridge } from '../state/sceneBridge';
import { getStationPosition } from './stationLayout';
import { ProductStation } from './ProductStation';
import { FlowCamera } from './FlowCamera';
import { ExplodeDriver } from './ExplodeDriver';

interface FlowSceneProps { productList: Product[]; flowState: FlowState; dispatch: Dispatch<FlowAction>; bridge: SceneBridge; }

/** 교육 선택 + 공정 선택 장면 (하나의 공간 · 카메라 하나) */
export function FlowScene({ productList, flowState, dispatch, bridge }: FlowSceneProps) {
  const builtModelList = useMemo(() => productList.map((product) => buildModel(getModelSpec(product.modelId))), [productList]);
  const stationPositionList = useMemo(() => productList.map((_, productIndex) => getStationPosition(productIndex, productList.length)), [productList]);
  const activeModel = flowState.activeIndex !== null ? builtModelList[flowState.activeIndex] : null;
  const isExplodeVisible = flowState.phase === 'focus' || flowState.phase === 'explode' || flowState.phase === 'transition';

  useEffect(() => () => builtModelList.forEach((builtModel) => disposeModel(builtModel.root)), [builtModelList]);
  useEffect(() => { setSurfaceVisible(!flowState.isWireframe); setEdgeEmphasis(flowState.isWireframe); return () => { setSurfaceVisible(true); setEdgeEmphasis(false); }; }, [flowState.isWireframe]);

  return (
    <>
      <hemisphereLight args={['#e6ecf0', '#1a1512', 0.8]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} />
      <directionalLight position={[-3, 1.5, -2]} intensity={1.3} color="#f37321" />
      <directionalLight position={[0, 2, -4]} intensity={0.6} color="#9fb4c8" />
      {productList.map((product, productIndex) => (
        <ProductStation key={product.id} stationIndex={productIndex} position={stationPositionList[productIndex]} builtModel={builtModelList[productIndex]}
          progress={product.cards.filter((card) => card.status === 'done').length / Math.max(1, product.cards.length)}
          flowState={flowState} dispatch={dispatch} bridge={bridge} />
      ))}
      <FlowCamera flowState={flowState} stationPositionList={stationPositionList} dispatch={dispatch} />
      {activeModel && isExplodeVisible && <ExplodeDriver builtModel={activeModel} phase={flowState.phase} selectedSectionIndex={flowState.selectedSectionIndex} bridge={bridge} />}
    </>
  );
}
