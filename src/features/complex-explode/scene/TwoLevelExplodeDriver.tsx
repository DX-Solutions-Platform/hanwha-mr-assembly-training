'use client';
import { useEffect, useMemo, useRef, type Dispatch } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuiltModel } from '@/lib/three/buildModel';
import type { ModelSpec } from '@/types/model';
import { createSpring, getSeparationSpin, kickSpring, stepSpring, FLY_OUT_SEC } from '@/lib/physics/explodeSpring';
import { projectToStage } from '@/lib/three/projectToStage';
import type { ComplexAction, ComplexState } from '../state/complexReducer';
import type { ComplexBridge } from '../state/complexBridge';

interface TwoLevelExplodeDriverProps { builtModel: BuiltModel; modelSpec: ModelSpec; complexState: ComplexState; dispatch: Dispatch<ComplexAction>; bridge: ComplexBridge; }

const ISOLATE_PUSH = 0.35;
const ASSEMBLED_THRESHOLD = 0.15;
const worldPoint = new THREE.Vector3();

/**
 * 2단계 분해 물리
 * 1단계: 휠 위 = 공정별로 펼침, 휠 아래 = 조립 (조립되면 외관 설명으로 바뀜)
 * 2단계: 공정 선택 → 그 공정 부품이 한 번 더 펼쳐지고, 나머지 공정은 더 멀리 물러남
 */
export function TwoLevelExplodeDriver({ builtModel, modelSpec, complexState, dispatch, bridge }: TwoLevelExplodeDriverProps) {
  const { gl, camera } = useThree();
  const sectionCount = modelSpec.sectionList.length;
  const levelOneSpring = useMemo(() => createSpring(0), []);
  const levelTwoSpringList = useMemo(() => Array.from({ length: sectionCount }, () => createSpring(0)), [sectionCount]);
  const targetRef = useRef(1);
  const flyStartRef = useRef<number | null>(null);
  const isAssembledRef = useRef(false);
  const { selectedSectionIndex, phase } = complexState;

  useEffect(() => { targetRef.current = 1; kickSpring(levelOneSpring, 1); }, [levelOneSpring]);
  useEffect(() => {
    const element = gl.domElement;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || phase !== 'explode') return;
      const nextTarget = event.deltaY > 0 ? 0 : 1;
      if (nextTarget === targetRef.current) return;
      targetRef.current = nextTarget;
      kickSpring(levelOneSpring, nextTarget ? 1 : -1);
    };
    element.addEventListener('wheel', handleWheel, { passive: true });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [gl, phase, levelOneSpring]);
  useEffect(() => { if (selectedSectionIndex !== null) kickSpring(levelTwoSpringList[selectedSectionIndex], 1); }, [selectedSectionIndex, levelTwoSpringList]);

  useFrame(({ clock }, deltaTime) => {
    stepSpring(levelOneSpring, targetRef.current, deltaTime);
    const levelOne = levelOneSpring.value;
    const isAssembled = levelOne < ASSEMBLED_THRESHOLD;
    if (isAssembled !== isAssembledRef.current) { isAssembledRef.current = isAssembled; dispatch({ type: 'setAssembled', isAssembled }); }
    levelTwoSpringList.forEach((spring, sectionIndex) => stepSpring(spring, sectionIndex === selectedSectionIndex ? 1 : 0, deltaTime));
    if (phase === 'transition') flyStartRef.current ??= clock.elapsedTime; else flyStartRef.current = null;
    const flyProgress = flyStartRef.current === null ? 0 : THREE.MathUtils.clamp((clock.elapsedTime - flyStartRef.current) / FLY_OUT_SEC, 0, 1);

    let partSlot = 0;
    builtModel.partList.forEach((part, partIndex) => {
      const levelTwo = levelTwoSpringList[part.sectionIndex].value;
      const isolate = selectedSectionIndex !== null && selectedSectionIndex !== part.sectionIndex ? ISOLATE_PUSH : 0;
      part.object.position.copy(part.basePosition).addScaledVector(part.sectionOffset, levelOne * (1 + isolate)).addScaledVector(part.partOffset, levelTwo);
      part.object.position.y += Math.sin(clock.elapsedTime * 1.1 + partIndex) * 0.01 * levelOne;
      part.object.rotation.y = part.baseRotationY + part.spinSign * getSeparationSpin(levelTwo) * 0.6;
      if (flyProgress > 0) { part.object.position.addScaledVector(part.sectionOffset.clone().normalize(), flyProgress * flyProgress * 14); part.object.visible = flyProgress < 1; }
      if (part.sectionIndex === selectedSectionIndex && partSlot < bridge.partPointList.length) {
        part.object.getWorldPosition(worldPoint);
        projectToStage(worldPoint, camera, bridge.partPointList[partSlot], levelTwo > 0.5 && phase === 'explode');
        partSlot++;
      }
    });
    for (let slot = partSlot; slot < bridge.partPointList.length; slot++) bridge.partPointList[slot].isVisible = false;

    builtModel.sectionCenterList.forEach((center, sectionIndex) => {
      const firstPart = builtModel.partList.find((part) => part.sectionIndex === sectionIndex);
      worldPoint.copy(center);
      if (firstPart) worldPoint.addScaledVector(firstPart.sectionOffset, levelOne);
      projectToStage(worldPoint, camera, bridge.sectionPointList[sectionIndex], phase === 'explode' && levelOne > 0.6 && selectedSectionIndex === null);
    });
    (modelSpec.exteriorList ?? []).forEach((exterior, exteriorIndex) => {
      worldPoint.set(...exterior.anchor);
      projectToStage(worldPoint, camera, bridge.exteriorPointList[exteriorIndex], phase === 'explode' && isAssembled);
    });
  });

  return null;
}
