'use client';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface OrbitOffset { yaw: number; pitch: number; zoom: number; pan: THREE.Vector3; }

const ROTATE_SPEED = 0.005;
const PITCH_LIMIT = 0.9;

/**
 * 분해 화면 시점 조작 (확정: 초기 방식)
 * 왼쪽 드래그 회전 · 오른쪽/Shift 드래그 이동 · Ctrl+휠 확대 · F 초기화 (휠은 조립·분해에 사용)
 */
export function useOrbitDrag(isEnabled: boolean) {
  const { gl, camera } = useThree();
  const orbitRef = useRef<OrbitOffset>({ yaw: 0, pitch: 0, zoom: 1, pan: new THREE.Vector3() });

  useEffect(() => {
    if (!isEnabled) return;
    const element = gl.domElement;
    let dragButton = -1, lastX = 0, lastY = 0;
    const reset = () => { orbitRef.current.yaw = 0; orbitRef.current.pitch = 0; orbitRef.current.zoom = 1; orbitRef.current.pan.set(0, 0, 0); };
    const handleDown = (event: PointerEvent) => { dragButton = event.shiftKey ? 2 : event.button; lastX = event.clientX; lastY = event.clientY; };
    const handleMove = (event: PointerEvent) => {
      if (dragButton < 0) return;
      const deltaX = event.clientX - lastX, deltaY = event.clientY - lastY;
      lastX = event.clientX; lastY = event.clientY;
      const orbit = orbitRef.current;
      if (dragButton === 0) {
        orbit.yaw -= deltaX * ROTATE_SPEED;
        orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + deltaY * ROTATE_SPEED * 0.8, -PITCH_LIMIT, PITCH_LIMIT);
      } else {
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        const panScale = 0.0022 * orbit.zoom;
        orbit.pan.addScaledVector(right, -deltaX * panScale).addScaledVector(up, deltaY * panScale);
      }
    };
    const handleUp = () => { dragButton = -1; };
    const handleWheel = (event: WheelEvent) => { if (!event.ctrlKey) return; event.preventDefault(); orbitRef.current.zoom = THREE.MathUtils.clamp(orbitRef.current.zoom * (event.deltaY > 0 ? 1.1 : 0.9), 0.4, 2.2); };
    const handleKey = (event: KeyboardEvent) => { if (event.code === 'KeyF') reset(); };
    const preventMenu = (event: MouseEvent) => event.preventDefault();
    element.addEventListener('pointerdown', handleDown); window.addEventListener('pointermove', handleMove); window.addEventListener('pointerup', handleUp);
    element.addEventListener('wheel', handleWheel, { passive: false }); window.addEventListener('keydown', handleKey); element.addEventListener('contextmenu', preventMenu);
    return () => {
      element.removeEventListener('pointerdown', handleDown); window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp);
      element.removeEventListener('wheel', handleWheel); window.removeEventListener('keydown', handleKey); element.removeEventListener('contextmenu', preventMenu);
      reset();
    };
  }, [isEnabled, gl, camera]);

  return orbitRef;
}

/** 기준 시점 + 사용자 조작량 → 카메라 위치 */
export function applyOrbit(target: THREE.Vector3, baseOffset: THREE.Vector3, orbit: OrbitOffset, outPosition: THREE.Vector3, outLook: THREE.Vector3) {
  const spherical = new THREE.Spherical().setFromVector3(baseOffset);
  spherical.theta += orbit.yaw;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi - orbit.pitch, 0.2, Math.PI - 0.2);
  spherical.radius *= orbit.zoom;
  outLook.copy(target).add(orbit.pan);
  outPosition.setFromSpherical(spherical).add(outLook);
}
