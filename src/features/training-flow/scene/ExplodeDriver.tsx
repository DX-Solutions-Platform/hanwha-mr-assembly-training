'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuiltModel } from '@/lib/three/buildModel';
import { createSpring, getSeparationSpin, kickSpring, stepSpring, FLY_OUT_SEC } from '@/lib/physics/explodeSpring';
import { projectToStage } from '@/lib/three/projectToStage';
import type { FlowPhase } from '../state/flowReducer';
import type { SceneBridge } from '../state/sceneBridge';

interface ExplodeDriverProps { builtModel: BuiltModel; phase: FlowPhase; selectedSectionIndex: number | null; bridge: SceneBridge; }

const sectionPoint = new THREE.Vector3();
const partWorld = new THREE.Vector3();

/**
 * 분해 화면 물리
 * - 포커싱이 끝나면 "파악" 펼쳐지고(스프링+회전 분리) 공중에서 둥둥 떠 있음
 * - 휠 아래 = 조립 · 휠 위 = 분해 (Ctrl+휠은 확대)
 * - 교육 시작: 부품이 화면 밖으로 날아가 사라짐
 */
export function ExplodeDriver({ builtModel, phase, selectedSectionIndex, bridge }: ExplodeDriverProps) {
  const { gl, camera } = useThree();
  const springList = useMemo(() => builtModel.partList.map(() => createSpring(0)), [builtModel]);
  const targetRef = useRef(0);
  const phaseStartRef = useRef<number | null>(null);
  const flyDirectionListRef = useRef<THREE.Vector3[] | null>(null);

  useEffect(() => { phaseStartRef.current = null; if (phase === 'explode') { targetRef.current = 1; springList.forEach((spring) => kickSpring(spring, 1)); } }, [phase, springList]);

  useEffect(() => {
    if (phase !== 'explode') return;
    const element = gl.domElement;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const nextTarget = event.deltaY > 0 ? 0 : 1;
      if (nextTarget === targetRef.current) return;
      targetRef.current = nextTarget;
      springList.forEach((spring) => kickSpring(spring, nextTarget ? 1 : -1));
    };
    element.addEventListener('wheel', handleWheel, { passive: true });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [phase, gl, springList]);

  useEffect(() => () => { builtModel.partList.forEach((part) => { part.object.visible = true; part.object.position.copy(part.basePosition); part.object.rotation.set(0, part.baseRotationY, 0); }); }, [builtModel]);

  useFrame(({ clock }, deltaTime) => {
    const elapsed = clock.elapsedTime;
    phaseStartRef.current ??= elapsed;
    const phaseTime = elapsed - phaseStartRef.current;
    const isFlying = phase === 'transition';
    if (isFlying && !flyDirectionListRef.current) flyDirectionListRef.current = createFlyDirectionList(builtModel, camera);
    if (!isFlying) flyDirectionListRef.current = null;

    builtModel.partList.forEach((part, partIndex) => {
      const spring = springList[partIndex];
      if (phaseTime >= part.staggerSec) stepSpring(spring, targetRef.current, deltaTime);
      const value = spring.value;
      const lift = selectedSectionIndex === part.sectionIndex ? 0.05 : 0;
      part.object.position.copy(part.basePosition).addScaledVector(part.sectionOffset, value);
      part.object.position.y += lift + Math.sin(elapsed * 1.2 + partIndex) * 0.006 * Math.min(1, value);
      part.object.rotation.y = part.baseRotationY + part.spinSign * getSeparationSpin(value);
      if (isFlying && flyDirectionListRef.current) {
        const flyProgress = THREE.MathUtils.clamp((phaseTime - Math.min(0.25, partIndex * 0.015)) / FLY_OUT_SEC, 0, 1);
        const flyEase = flyProgress * flyProgress * flyProgress;
        part.object.position.addScaledVector(flyDirectionListRef.current[partIndex], flyEase);
        part.object.rotation.x = part.spinSign * 2 * flyEase;
        part.object.visible = flyProgress < 1;
      }
    });

    const averageValue = springList.reduce((sum, spring) => sum + spring.value, 0) / Math.max(1, springList.length);
    builtModel.sectionCenterList.forEach((center, sectionIndex) => {
      const firstPart = builtModel.partList.find((part) => part.sectionIndex === sectionIndex);
      sectionPoint.copy(center);
      if (firstPart) sectionPoint.addScaledVector(firstPart.sectionOffset, averageValue);
      builtModel.root.localToWorld(sectionPoint);
      const target = bridge.sectionPointList[sectionIndex];
      if (target) projectToStage(sectionPoint, camera, target, phase === 'explode' && averageValue > 0.6);
    });
  });

  return null;
}

/** 화면 중심 기준 바깥쪽으로 날아갈 방향 (모델 로컬 좌표) */
function createFlyDirectionList(builtModel: BuiltModel, camera: THREE.Camera): THREE.Vector3[] {
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const centerScreen = new THREE.Box3().setFromObject(builtModel.root).getCenter(new THREE.Vector3()).project(camera);
  const inverseWorld = builtModel.root.matrixWorld.clone().invert();
  const distance = 9 / (builtModel.root.getWorldScale(new THREE.Vector3()).x || 1);
  return builtModel.partList.map((part, partIndex) => {
    part.object.getWorldPosition(partWorld);
    const screen = partWorld.clone().project(camera);
    let deltaX = screen.x - centerScreen.x, deltaY = screen.y - centerScreen.y;
    if (Math.hypot(deltaX, deltaY) < 0.04) { const angle = partIndex * 2.4; deltaX = Math.cos(angle); deltaY = Math.sin(angle); }
    const length = Math.hypot(deltaX, deltaY);
    const worldDirection = right.clone().multiplyScalar(deltaX / length).addScaledVector(up, (deltaY / length) * 0.8);
    return worldDirection.transformDirection(inverseWorld).multiplyScalar(distance);
  });
}
