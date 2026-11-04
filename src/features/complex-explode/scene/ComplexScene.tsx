'use client';
import { useEffect, useMemo, type Dispatch } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { buildModel } from '@/lib/three/buildModel';
import { disposeModel } from '@/lib/three/disposeModel';
import { setEdgeEmphasis } from '@/lib/three/hairlineEdges';
import { setSurfaceVisible } from '@/lib/three/modelMaterials';
import { getModelSpec } from '@/data/models/modelRegistry';
import type { ComplexAction, ComplexState } from '../state/complexReducer';
import type { ComplexBridge } from '../state/complexBridge';
import { TwoLevelExplodeDriver } from './TwoLevelExplodeDriver';
import { ComplexCamera } from './ComplexCamera';

interface ComplexSceneProps { complexState: ComplexState; dispatch: Dispatch<ComplexAction>; bridge: ComplexBridge; }

const readSectionIndex = (event: ThreeEvent<PointerEvent | MouseEvent>) => (typeof event.object.userData.sectionIndex === 'number' ? (event.object.userData.sectionIndex as number) : null);

/** 여객기·스마트폰 2단계 분해 캔버스 */
export function ComplexScene({ complexState, dispatch, bridge }: ComplexSceneProps) {
  const modelSpec = useMemo(() => getModelSpec(complexState.modelId), [complexState.modelId]);
  const builtModel = useMemo(() => buildModel(modelSpec), [modelSpec]);
  useEffect(() => () => disposeModel(builtModel.root), [builtModel]);
  useEffect(() => { setSurfaceVisible(!complexState.isWireframe); setEdgeEmphasis(complexState.isWireframe); return () => { setSurfaceVisible(true); setEdgeEmphasis(false); }; }, [complexState.isWireframe]);

  return (
    <SceneCanvas camera={{ position: [3, 2.4, 6], fov: 36, near: 0.05, far: 80 }} onPointerMissed={() => dispatch({ type: 'clearSection' })}>
      <hemisphereLight args={['#e6ecf0', '#1a1512', 0.8]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 1.5, -3]} intensity={1.2} color="#f37321" />
      <directionalLight position={[0, 2, -5]} intensity={0.6} color="#9fb4c8" />
      <primitive object={builtModel.root}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => { const sectionIndex = readSectionIndex(event); if (sectionIndex !== complexState.hoveredSectionIndex) dispatch({ type: 'hoverSection', sectionIndex }); }}
        onPointerOut={() => dispatch({ type: 'hoverSection', sectionIndex: null })}
        onClick={(event: ThreeEvent<MouseEvent>) => { const sectionIndex = readSectionIndex(event); if (sectionIndex !== null) { event.stopPropagation(); dispatch({ type: 'selectSection', sectionIndex }); } }} />
      <TwoLevelExplodeDriver builtModel={builtModel} modelSpec={modelSpec} complexState={complexState} dispatch={dispatch} bridge={bridge} />
      <ComplexCamera builtModel={builtModel} viewDistance={modelSpec.viewDistance} selectedSectionIndex={complexState.selectedSectionIndex} />
    </SceneCanvas>
  );
}
