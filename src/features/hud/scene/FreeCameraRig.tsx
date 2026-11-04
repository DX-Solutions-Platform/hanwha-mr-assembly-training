'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const HOME_POSITION = new THREE.Vector3(0, 1.6, 2.4);
const MOVE_SPEED = 1.2; // m/s
const LOOK_SPEED = 0.0025;
const WORLD_LIMIT = 6; // 작업대를 잃어버리지 않도록 이동 범위 제한

/** 언리얼식 자유 시점: 드래그 회전 · WASD 이동 · QE 상하 · 휠 전후 · F 초기화 */
export function FreeCameraRig() {
  const { camera, gl } = useThree();
  const keyStateRef = useRef<Record<string, boolean>>({});
  const angleRef = useRef({ yaw: 0, pitch: -0.35 });

  useEffect(() => {
    const element = gl.domElement;
    let isDragging = false, lastX = 0, lastY = 0;
    const resetView = () => { camera.position.copy(HOME_POSITION); angleRef.current = { yaw: 0, pitch: -0.35 }; };
    const handleDown = (event: PointerEvent) => { isDragging = true; lastX = event.clientX; lastY = event.clientY; };
    const handleMove = (event: PointerEvent) => {
      if (!isDragging) return;
      angleRef.current.yaw -= (event.clientX - lastX) * LOOK_SPEED;
      angleRef.current.pitch = THREE.MathUtils.clamp(angleRef.current.pitch - (event.clientY - lastY) * LOOK_SPEED, -1.3, 1.3);
      lastX = event.clientX; lastY = event.clientY;
    };
    const handleUp = () => { isDragging = false; };
    const handleWheel = (event: WheelEvent) => { const forward = new THREE.Vector3(); camera.getWorldDirection(forward); camera.position.addScaledVector(forward, -Math.sign(event.deltaY) * 0.15); };
    const handleKeyDown = (event: KeyboardEvent) => { keyStateRef.current[event.code] = true; if (event.code === 'KeyF') resetView(); };
    const handleKeyUp = (event: KeyboardEvent) => { keyStateRef.current[event.code] = false; };
    resetView();
    element.addEventListener('pointerdown', handleDown); window.addEventListener('pointermove', handleMove); window.addEventListener('pointerup', handleUp);
    element.addEventListener('wheel', handleWheel, { passive: true }); window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => {
      element.removeEventListener('pointerdown', handleDown); window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp);
      element.removeEventListener('wheel', handleWheel); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera, gl]);

  useFrame((_, deltaTime) => {
    const keyState = keyStateRef.current, { yaw, pitch } = angleRef.current;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const step = MOVE_SPEED * Math.min(deltaTime, 0.05);
    if (keyState.KeyW) camera.position.addScaledVector(forward, step);
    if (keyState.KeyS) camera.position.addScaledVector(forward, -step);
    if (keyState.KeyD) camera.position.addScaledVector(right, step);
    if (keyState.KeyA) camera.position.addScaledVector(right, -step);
    if (keyState.KeyE) camera.position.y += step;
    if (keyState.KeyQ) camera.position.y -= step;
    camera.position.clampLength(0, WORLD_LIMIT); camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.2, 4);
  });
  return null;
}
