import type * as Three from 'three';
import type { ReferenceThree, ReferenceRenderer } from '@/features/education-select/referenceThree';
import { createBomModels } from './bomModels';
import { PracticeScene } from '@/features/training-practice/practiceScene';
import type { PracticeState, PracticeCallbacks } from '@/features/training-practice/practiceTypes';

export type PreparationPhase = 'transition' | 'setup' | 'safety' | 'bom' | 'placing' | 'main';
export interface PreparationState extends PracticeState { phase: PreparationPhase; introDelay: number; hoveredIndex: number | null; bomStartedAt: number; flyStartedAt: number; }
interface PreparationCallbacks extends PracticeCallbacks {
  getState: () => PreparationState;
  onHover: (index: number | null) => void;
  onLabel: (index: number, x: number, y: number, opacity: number) => void;
  onHorizon: (y: number, elapsed: number) => void;
}

const smooth = (value: number) => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };

/** Demo 1 HUD.dc.html의 burst → parts → partsFly → main. */
export function mountPreparationScene(T: ReferenceThree, canvas: HTMLCanvasElement, callbacks: PreparationCallbacks) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }) as ReferenceRenderer;
  renderer.setPixelRatio(1); renderer.setSize(1920, 1080, false); renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.localClippingEnabled = true;
  const scene = new T.Scene(), fog = new T.Fog(0x090c0e, 3, 15); scene.fog = fog;
  const camera = new T.PerspectiveCamera(40, 16 / 9, 0.05, 80);
  const cameraHome = new T.Vector3(0, 2, 3.4), cameraLook = new T.Vector3(0, 1.15, 0);
  const world = new T.Group(); world.position.set(0, 0, 3.4); scene.add(world);
  const zone = (angle: number, radius: number) => new T.Vector3(radius * Math.sin(angle), 0.906, -radius * Math.cos(angle));
  const zones = { left: zone(-0.55, 5), work: zone(0, 3.4), right: zone(0.5, 4.3) };
  const grids = [new T.GridHelper(60, 600, 0xf37321, 0xf37321), new T.GridHelper(60, 60, 0xf37321, 0xf37321)];
  const clipping = new T.Plane(new T.Vector3(0, 0, -1), -100);
  grids.forEach((grid, index) => {
    grid.position.set(0, index ? 0.9041 : 0.904, -6);
    const material = grid.material as Three.Material; material.opacity = index ? 0.16 : 0.1; material.transparent = true; material.depthWrite = false;
    material.clippingPlanes = [clipping]; grid.visible = false; world.add(grid);
  });
  const shadow = new T.Mesh(new T.PlaneGeometry(14, 10), new T.ShadowMaterial({ opacity: 0.5 }));
  shadow.position.set(0, 0.905, -3.4); shadow.rotation.x = -Math.PI / 2; shadow.receiveShadow = true; world.add(shadow);
  const ringPoints = Array.from({ length: 241 }, (_, index) => { const angle = index / 240 * Math.PI * 2; return new T.Vector3(Math.sin(angle) * 3.9, 0.907, -Math.cos(angle) * 3.9); });
  const userRing = new T.Line(new T.BufferGeometry().setFromPoints(ringPoints), new T.LineBasicMaterial({ color: 0xd7dde0, transparent: true, opacity: 0.14, toneMapped: false })); world.add(userRing);
  const padMaterial = new T.LineBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.8 });
  const pad = (position: Three.Vector3, width: number, depth: number, angle: number) => {
    const group = new T.Group(); group.position.copy(position); group.rotation.y = -angle; world.add(group);
    const points = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([x,z]) => new T.Vector3(x * width / 2, 0, z * depth / 2));
    group.add(new T.Line(new T.BufferGeometry().setFromPoints(points), padMaterial));
    const floor = new T.Mesh(new T.PlaneGeometry(width, depth), new T.MeshBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.06 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.001; group.add(floor); return group;
  };
  const pads = [pad(zones.work, 0.6, 0.6, 0), pad(zones.left, 0.7, 0.7, -0.55), pad(zones.right.clone().add(new T.Vector3(-0.15, 0, 0.25)), 2.3, 1, 0.5)];
  const platform = new T.Group(); platform.position.copy(zones.work); world.add(platform);
  const platformMesh = new T.Mesh(new T.CylinderGeometry(0.78, 0.82, 0.035, 72), new T.MeshStandardMaterial({ color: 0x15181c, metalness: 0.35, roughness: 0.75 }));
  platformMesh.position.y = -0.0175; platformMesh.receiveShadow = true; platform.add(platformMesh);
  const shock = new T.Mesh(new T.RingGeometry(0.96, 1, 96), new T.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
  shock.rotation.x = -Math.PI / 2; shock.position.copy(zones.work); shock.position.y += 0.01; world.add(shock);
  const { parts, holoMaterial, ringMaterial } = createBomModels(T, world);
  scene.add(new T.HemisphereLight(0xc9d2dc, 0x2a2724, 0.6));
  const spot = new T.SpotLight(0xf4f1ec, 1.7, 12, 0.7, 1, 1.1); spot.position.set(0, 4.4, 0.6); spot.target.position.set(0, 0.9, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; scene.add(spot, spot.target);
  const fill = new T.DirectionalLight(0x8fa6c0, 0.5); fill.position.set(-3, 3, 2); scene.add(fill);
  const practice = new PracticeScene(T, canvas, camera, world, parts, pads, callbacks.getState, callbacks);
  const ray = new T.Raycaster(), pointer = new T.Vector2();
  const onMove = (event: PointerEvent) => {
    if (callbacks.getState().phase !== 'bom') return;
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, camera); const hit = ray.intersectObjects(parts.map((part) => part.hit), false)[0];
    const index: number | null = hit ? hit.object.userData.bom : null; canvas.style.cursor = index !== null ? 'pointer' : 'default';
    if (index !== callbacks.getState().hoveredIndex) callbacks.onHover(index);
  };
  canvas.addEventListener('pointermove', onMove);
  const startedAt = performance.now(); let last = startedAt, frame = 0, revealZ: number | null = null, clippingDone = false;
  const loop = () => {
    frame = requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    const elapsed = (now - startedAt) / 1000, state = callbacks.getState(), introDelay = state.introDelay / 1000, burst = elapsed - introDelay;
    const target = new T.Vector3(zones.work.x, 1.32, zones.work.z + 3.4), back = smooth((burst - 1.4) / 1.2);
    const orbit = new T.Vector3(target.x, Math.max(0.95, target.y + Math.sin(0.36) * 3.9), target.z + Math.cos(0.36) * 3.9);
    if (state.phase !== 'main') { camera.position.copy(orbit).lerp(cameraHome, back); camera.lookAt(target.clone().lerp(cameraLook, back)); }
    camera.updateMatrixWorld(true);
    const flightTime = (now - state.flyStartedAt) / 1000;
    const showPads = (burst >= 2 && state.phase === 'setup') || state.phase === 'main' || (state.phase === 'placing' && flightTime > 0.9); userRing.visible = showPads; pads.forEach((item) => { item.visible = showPads; });
    const platformScale = Math.max(0.001, 0.95 * (1 - smooth(Math.max(0, burst) / 0.35)));
    platform.scale.setScalar(platformScale); platform.visible = burst >= 0 && platformScale > 0.002;
    const sw = Math.max(0, Math.min(1, burst / 0.8)); shock.scale.setScalar(0.6 + sw * 7); shock.material.opacity = burst >= 0 ? (1 - sw) * 0.85 : 0;
    if (elapsed >= introDelay + 0.15 && !clippingDone) {
      revealZ ??= camera.position.z;
      grids.forEach((grid) => { grid.visible = true; });
      const k = Math.min(1, (burst - 0.15) / 0.9), ease = 1 - Math.pow(1 - k, 3); clipping.constant = revealZ - 16 + 18 * ease;
      if (k === 1) { clippingDone = true; grids.forEach((grid) => { const material = grid.material as Three.Material; material.clippingPlanes = null; material.needsUpdate = true; }); }
    }
    parts.forEach((part, index) => {
      if (state.phase === 'main') return;
      const pt = state.phase === 'bom' || state.phase === 'placing' ? (now - state.bomStartedAt) / 1000 : -9, appear = smooth((pt - index * 0.07) / 0.5), hovered = state.phase === 'bom' && state.hoveredIndex === index;
      part.root.visible = appear > 0.001;
      if (state.phase === 'safety' || state.phase === 'bom' || state.phase === 'placing') part.spin.rotation.y += dt * (hovered ? 1.4 : 0.35);
      part.real.visible = hovered; part.hologram.visible = !hovered;
      part.root.position.copy(part.slot); part.root.position.y += (1 - appear) * -0.15 + Math.sin(now / 1000 * 1.4 + index) * 0.008;
      part.root.scale.setScalar(Math.max(0.001, appear * (hovered ? 1.2 : 1)));
      if (state.phase === 'placing') {
        const progress = smooth((flightTime - index * 0.05) / 0.75);
        part.root.position.lerp(practice.destination(part), progress); part.root.position.y += Math.sin(progress * Math.PI) * 0.35;
        part.root.scale.multiplyScalar(1 - progress * 0.1); part.real.visible = progress > 0.85; part.hologram.visible = progress <= 0.85;
        if (progress > 0.85) part.spin.rotation.y *= 0.9;
      }
    });
    holoMaterial.opacity = 0.14 + 0.04 * Math.sin(now / 1000 * 3); ringMaterial.opacity = 0.45 + 0.2 * Math.sin(now / 1000 * 2.2);
    practice.step(now, dt); camera.updateMatrixWorld(true);
    if (state.phase === 'main') ringMaterial.opacity = 0.35;
    // __HZ_LOCK: 바닥 그리드의 실제 끝에 지평선을 고정합니다.
    const floorPosition = grids[0].getWorldPosition(new T.Vector3()), direction = new T.Vector3(); camera.getWorldDirection(direction); direction.y = 0;
    if (direction.lengthSq() < 1e-6) direction.set(0, 0, -1); direction.normalize();
    let distance = 1e9;
    if (Math.abs(direction.x) > 1e-5) distance = Math.min(distance, ((direction.x > 0 ? floorPosition.x + 30 : floorPosition.x - 30) - camera.position.x) / direction.x);
    if (Math.abs(direction.z) > 1e-5) distance = Math.min(distance, ((direction.z > 0 ? floorPosition.z + 30 : floorPosition.z - 30) - camera.position.z) / direction.z);
    distance = Math.max(2, distance); fog.near = 4; fog.far = distance * 1.15;
    const horizon = new T.Vector3(camera.position.x + direction.x * distance, floorPosition.y, camera.position.z + direction.z * distance).project(camera);
    callbacks.onHorizon((1 - horizon.y) / 2 * 1080, burst + 1.8);
    world.updateMatrixWorld(true);
    parts.forEach((part, index) => {
      if (!part.root.visible || state.phase !== 'bom') { callbacks.onLabel(index, 0, 0, 0); return; }
      const point = part.root.position.clone(); point.y -= part.row ? 0.22 : 0.17; world.localToWorld(point); point.project(camera);
      callbacks.onLabel(index, (point.x + 1) / 2 * 1920, (1 - point.y) / 2 * 1080, point.z > 1 ? 0 : Math.min(1, part.root.scale.x));
    });
    practice.afterFrame(); practice.render(renderer, scene);
  };
  frame = requestAnimationFrame(loop);
  const dispose = () => {
    cancelAnimationFrame(frame); canvas.removeEventListener('pointermove', onMove); practice.dispose();
    const geometries = new Set<Three.BufferGeometry>(), materials = new Set<Three.Material>();
    scene.traverse((object) => { const mesh = object as Three.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => materials.add(material)); });
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose()); spot.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
  return Object.assign(dispose, { pickTool: (index: number) => practice.assembly.pickTool(index), confirmToolSafety: () => practice.assembly.confirmToolSafety(), useRest: () => practice.assembly.useRest(), getReport: () => practice.assembly.buildReport() });
}
