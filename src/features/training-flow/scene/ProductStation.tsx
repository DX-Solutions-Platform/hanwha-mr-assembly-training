'use client';
import { useMemo, useRef, type Dispatch } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuiltModel } from '@/lib/three/buildModel';
import { projectToStage } from '@/lib/three/projectToStage';
import type { FlowAction, FlowState } from '../state/flowReducer';
import type { SceneBridge } from '../state/sceneBridge';
import { STATION_SIZE } from '../state/flowTiming';
import { FloatingRing } from './FloatingRing';

interface ProductStationProps {
  stationIndex: number; position: THREE.Vector3; builtModel: BuiltModel; progress: number;
  flowState: FlowState; dispatch: Dispatch<FlowAction>; bridge: SceneBridge;
}

const FOCUS_YAW = 0.55;
const LABEL_OFFSET = new THREE.Vector3(0, -0.12, 0.7);
const labelPoint = new THREE.Vector3();

/** 진열대 한 칸: 모델 + 부유링 + 넓은 선택 범위(보이지 않는 원기둥, 한 번 고르면 유지) */
export function ProductStation({ stationIndex, position, builtModel, progress, flowState, dispatch, bridge }: ProductStationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const visibilityRef = useRef(1);
  const { phase, activeIndex, hoveredIndex } = flowState;
  const isActive = activeIndex === stationIndex;
  const isHovered = hoveredIndex === stationIndex;
  const isSelectPhase = phase === 'select';
  const modelScale = useMemo(() => STATION_SIZE / Math.max(builtModel.size.x, builtModel.size.y, builtModel.size.z), [builtModel]);
  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);

  useFrame(({ camera }, deltaTime) => {
    const group = groupRef.current, spin = spinRef.current; if (!group || !spin) return;
    visibilityRef.current = THREE.MathUtils.damp(visibilityRef.current, isSelectPhase || isActive ? 1 : 0, 6, deltaTime);
    group.visible = visibilityRef.current > 0.01;
    group.scale.setScalar(0.6 + 0.4 * visibilityRef.current);
    if (isSelectPhase) spin.rotation.y += deltaTime * (isHovered ? 0.9 : 0.3);
    else if (isActive) spin.rotation.y = THREE.MathUtils.damp(spin.rotation.y, Math.round(spin.rotation.y / (Math.PI * 2)) * Math.PI * 2 + FOCUS_YAW, 4, deltaTime);
    group.getWorldPosition(labelPoint).add(LABEL_OFFSET);
    projectToStage(labelPoint, camera, bridge.productPointList[stationIndex], isSelectPhase && isHovered);
  });

  const handleHover = () => { if (isSelectPhase) dispatch({ type: 'hoverProduct', productIndex: stationIndex }); };
  const handleClick = (event: ThreeEvent<MouseEvent>) => { if (!isSelectPhase) return; event.stopPropagation(); dispatch({ type: 'selectProduct', productIndex: stationIndex }); };
  const handleSectionMove = (event: ThreeEvent<PointerEvent>) => {
    if (phase !== 'explode' || !isActive) return;
    const sectionIndex = event.object.userData.sectionIndex;
    if (typeof sectionIndex === 'number' && sectionIndex !== flowState.hoveredSectionIndex) dispatch({ type: 'hoverSection', sectionIndex });
  };
  const handleSectionClick = (event: ThreeEvent<MouseEvent>) => {
    if (phase !== 'explode' || !isActive) return;
    const sectionIndex = event.object.userData.sectionIndex;
    if (typeof sectionIndex === 'number') { event.stopPropagation(); dispatch({ type: 'selectSection', sectionIndex }); }
  };

  return (
    <group ref={groupRef} position={position}>
      <FloatingRing stationIndex={stationIndex} progress={progress} isHovered={isHovered} isVisible={isSelectPhase} />
      <group ref={spinRef} position={[0, 0.08, 0]} scale={modelScale}>
        <primitive object={builtModel.root} onPointerMove={handleSectionMove} onClick={handleSectionClick} onPointerOut={() => phase === 'explode' && dispatch({ type: 'hoverSection', sectionIndex: null })} />
      </group>
      {isSelectPhase && (
        <mesh material={hitMaterial} position={[0, 0.7, 0]} onPointerOver={handleHover} onClick={handleClick}>
          <cylinderGeometry args={[1.15, 1.15, 2.2, 12, 1, true]} />
        </mesh>
      )}
    </group>
  );
}
