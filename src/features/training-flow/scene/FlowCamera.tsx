'use client';
import { useEffect, useMemo, useRef, type Dispatch } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { applyOrbit, useOrbitDrag } from '@/components/scene/useOrbitDrag';
import type { FlowAction, FlowState } from '../state/flowReducer';

const OVERVIEW_POSITION = new THREE.Vector3(0, 1.7, 6.6);
const OVERVIEW_LOOK = new THREE.Vector3(0, 0.55, -2.2);
const FOCUS_OFFSET = new THREE.Vector3(0, 0.8, 2.3);
const FOCUS_LOOK_Y = 0.5;
const HOVER_APPROACH = 0.16;

interface FlowCameraProps { flowState: FlowState; stationPositionList: THREE.Vector3[]; dispatch: Dispatch<FlowAction>; }

/** 전체 보기 → (마우스 올림) 살짝 다가감 → (선택) 가운데로 포커싱 → 분해 화면 시점 조작 */
export function FlowCamera({ flowState, stationPositionList, dispatch }: FlowCameraProps) {
  const { camera, gl } = useThree();
  const { phase, activeIndex, hoveredIndex } = flowState;
  const orbitRef = useOrbitDrag(phase === 'explode');
  const lookRef = useRef(OVERVIEW_LOOK.clone());
  const target = useMemo(() => ({ position: new THREE.Vector3(), look: new THREE.Vector3() }), []);

  useEffect(() => {
    if (phase !== 'select') return;
    const element = gl.domElement;
    const handleWheel = () => dispatch({ type: 'hoverProduct', productIndex: null }); // 휠 → 전체 보기
    element.addEventListener('wheel', handleWheel, { passive: true });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [phase, gl, dispatch]);

  useFrame((_, deltaTime) => {
    if (activeIndex !== null && phase !== 'select') {
      const station = stationPositionList[activeIndex];
      applyOrbit(new THREE.Vector3(station.x, FOCUS_LOOK_Y, station.z), FOCUS_OFFSET, orbitRef.current, target.position, target.look);
    } else if (hoveredIndex !== null) {
      const station = stationPositionList[hoveredIndex];
      target.position.copy(OVERVIEW_POSITION).lerp(new THREE.Vector3(station.x, OVERVIEW_POSITION.y, station.z + 4), HOVER_APPROACH);
      target.look.copy(OVERVIEW_LOOK).lerp(new THREE.Vector3(station.x, FOCUS_LOOK_Y, station.z), HOVER_APPROACH * 2);
    } else {
      target.position.copy(OVERVIEW_POSITION); target.look.copy(OVERVIEW_LOOK);
    }
    const smoothing = 1 - Math.exp(-deltaTime * (phase === 'explode' ? 8 : 3.2));
    camera.position.lerp(target.position, smoothing);
    lookRef.current.lerp(target.look, smoothing);
    camera.lookAt(lookRef.current);
  });
  return null;
}
