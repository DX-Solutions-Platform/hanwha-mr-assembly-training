import type * as Three from 'three';
import type { ReferenceThree, ReferenceRenderer } from './referenceThree';
import type { SelectionProduct } from './selectionProducts';
import { createSelectionModels } from './selectionModels';
import { createSelectionRing } from './selectionRing';
import { createProcessParts } from '@/features/process-select/processParts';
import { ReferenceProcessScene } from '@/features/process-select/referenceProcessScene';
import type { ProcessCallbacks } from '@/features/process-select/processTypes';
import type { buildNuriShelfModel } from './nuriShelfModel';

interface ShelfCallbacks extends ProcessCallbacks {
  onReady: () => void;
  getHoveredIndex: () => number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  onLabelPosition: (index: number, x: number, y: number) => void;
}

/** Demo 1.dc.html bootShelf: 같은 장면에서 교육 선택 → 공정 분해. */
export function mountReferenceShelf(T: ReferenceThree, canvas: HTMLCanvasElement, products: SelectionProduct[], callbacks: ShelfCallbacks,
  buildNuri?: typeof buildNuriShelfModel) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }) as ReferenceRenderer;
  const resize = () => {
    const width = Math.min(1600, Math.round(canvas.clientWidth * Math.min(1.25, window.devicePixelRatio || 1)));
    if (!width) return;
    const height = Math.max(1, Math.round(width * 9 / 16));
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
      invalidate();
    }
  };
  renderer.setClearColor(0, 0);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xe6ecf0, 0x1a1512, 0.8));
  const key = new T.DirectionalLight(0xffffff, 1.7);
  key.position.set(1.4, 3, 2.2);
  scene.add(key);
  const rim = new T.DirectionalLight(0xf37321, 1.4); rim.position.set(-2, 1, -1.6); scene.add(rim);
  const fog = new T.Fog(0x07090b, 9, 24); scene.fog = fog;

  const camera = new T.PerspectiveCamera(34, 16 / 9, 0.05, 60);
  const restPosition = new T.Vector3(0, 3.1, 7.9), restLook = new T.Vector3(0, 0.55, 0);
  const cameraPosition = restPosition.clone(), cameraLook = restLook.clone();
  const targetPosition = restPosition.clone(), targetLook = restLook.clone();
  camera.position.copy(restPosition); camera.lookAt(restLook); camera.updateMatrixWorld();
  const build = createSelectionModels(T);
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'JetBrains Mono, monospace';
  const count = products.length;
  const spacing = Math.min(1.7, 6.8 / Math.max(1, count));
  const base = 1.58 * Math.min(1, 6.8 / Math.max(1, count) / 1.7);
  const positions = products.map((_, index) => (index - (count - 1) / 2) * spacing);
  const items = products.map((product, index) => {
    const { kind } = product;
    const holder = new T.Group(), spin = new T.Group(), model = new T.Group();
    if (kind === 'nuri') buildNuri?.(T, model);
    else build[kind](model);
    const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3());
    const scale = 0.68 / Math.max(Math.hypot(size.x, size.z), size.y * 0.85);
    model.scale.setScalar(scale); const center = bounds.getCenter(new T.Vector3());
    model.position.set(-center.x * scale, 0.05 - bounds.min.y * scale, -center.z * scale);
    spin.add(model); holder.add(spin);
    const ring = createSelectionRing(T, product, fontFamily);
    const hit = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.95, 12), new T.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.48; holder.add(hit, ring); scene.add(holder);
    holder.position.x = positions[index];
    const rotation = -0.3 + index % 3 * 0.35;
    spin.rotation.y = rotation;
    const item = { holder, spin, hit, ring, tilt: 0, lift: 0, scale: 0, rotation };
    if (kind === 'nuri') return { ...item, kind };
    return { ...item, kind, parts: createProcessParts(T, model, kind, bounds, size) };
  });
  const processItems = items.filter((item) => item.kind !== 'nuri');
  const processScene = new ReferenceProcessScene(T, canvas, camera, processItems, positions, callbacks, invalidate);

  const ray = new T.Raycaster(), pointer = new T.Vector2(), labelPoint = new T.Vector3();
  const hitTargets: Three.Object3D[] = items.map((item) => item.hit);
  let overviewWheel: { x: number; y: number } | null = null;
  const pickAt = (event: PointerEvent | MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(hitTargets, false)[0];
    return hit ? hitTargets.indexOf(hit.object) : null;
  };
  const handleMove = (event: PointerEvent) => {
    if (callbacks.getState().activeIndex !== null) return;
    if (overviewWheel) {
      if (Math.hypot(event.clientX - overviewWheel.x, event.clientY - overviewWheel.y) < 80 * (canvas.getBoundingClientRect().width / 1920)) return;
      overviewWheel = null;
    }
    const index = pickAt(event); canvas.style.cursor = index !== null ? 'pointer' : 'default';
    if (index !== null && index !== callbacks.getHoveredIndex()) callbacks.onHover(index);
  };
  const handleWheel = (event: WheelEvent) => { if (callbacks.getState().activeIndex !== null) return; event.preventDefault(); overviewWheel = { x: event.clientX, y: event.clientY }; callbacks.onHover(null); };
  const handleClick = (event: MouseEvent) => { if (callbacks.getState().activeIndex !== null) return; const index = pickAt(event); if (index !== null) callbacks.onSelect(index); };
  canvas.addEventListener('pointermove', handleMove); canvas.addEventListener('wheel', handleWheel, { passive: false }); canvas.addEventListener('click', handleClick);

  const startTime = performance.now();
  let animationFrame: number | null = null;
  let lastTime = startTime, processBlend = 0, isReady = false, flightFinished = false;
  function invalidate() {
    if (animationFrame === null) animationFrame = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    animationFrame = null;
    const state = callbacks.getState();
    if (state.isTransition && flightFinished) return;
    if (now - lastTime < 12) { invalidate(); return; }
    const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
    processScene.synchronize(now);
    const flight = processScene.renderFlight(now);
    flightFinished = flight === 'complete';
    if (flight) {
      renderer.render(scene, camera);
      if (!flightFinished) invalidate();
      return;
    }
    const activeIndex = processScene.activeIndex, processCamera = processScene.cameraTargets(dt);
    const hovered = callbacks.getHoveredIndex();
    targetPosition.copy(restPosition); targetLook.copy(restLook);
    if (processCamera) { targetPosition.copy(processCamera.position); targetLook.copy(processCamera.look); }
    else if (hovered !== null && positions[hovered] !== undefined) {
      const x = positions[hovered]; targetPosition.set(x * 0.5, 2.7, 6.6); targetLook.set(x * 0.75, 0.5, 0);
    }
    const smoothing = Math.min(1, dt * (activeIndex !== null ? 4 : 2.2));
    cameraPosition.lerp(targetPosition, smoothing); cameraLook.lerp(targetLook, smoothing);
    camera.position.copy(cameraPosition); camera.lookAt(cameraLook);
    if (activeIndex === null) camera.updateMatrixWorld();
    const targetBlend = activeIndex === null ? 0 : 1;
    processBlend += (targetBlend - processBlend) * Math.min(1, dt * 2.2);
    fog.near = 9 - processBlend * 4;
    let moving = cameraPosition.distanceToSquared(targetPosition) > 0.000025 ||
      cameraLook.distanceToSquared(targetLook) > 0.000025 || Math.abs(targetBlend - processBlend) > 0.005;
    items.forEach((item, index) => {
      const selected = activeIndex === index, other = activeIndex !== null && !selected;
      const active = hovered === index || selected;
      const entrance = Math.max(0, Math.min(1, ((now - startTime) / 1000 - 0.3 - index * 0.12) / 0.8));
      const ease = 1 - Math.pow(1 - entrance, 3);
      const targetLift = selected ? 0.2 : active ? 0.08 : 0;
      const targetScale = selected ? 1.12 : other ? 0.001 : active ? 1.05 : 1;
      item.lift += (targetLift - item.lift) * Math.min(1, dt * 8);
      item.scale += (targetScale - item.scale) * Math.min(1, dt * 7);
      if (entrance < 1 || Math.abs(targetLift - item.lift) > 0.001 || Math.abs(targetScale - item.scale) > 0.002) moving = true;
      item.holder.visible = !other || item.scale > 0.015;
      if (item.kind === 'nuri' || !processScene.step(item, index, now, dt)) item.spin.rotation.set(0, item.rotation, 0);
      item.spin.position.y = item.lift;
      item.spin.scale.setScalar(Math.max(0.001, ease)); item.holder.scale.setScalar(Math.max(0.001, base * item.scale * (0.85 + 0.15 * ease)));
      const visibility = ease * (1 - processBlend);
      item.ring.visible = visibility > 0.01;
      item.ring.material.opacity = (active ? 1 : 0.7) * visibility;
      if (activeIndex === null) {
        labelPoint.set(positions[index], -0.02, 0.62 * base).project(camera);
        callbacks.onLabelPosition(index, (labelPoint.x + 1) / 2 * 1920, (1 - labelPoint.y) / 2 * 1080 + 14);
      }
    });
    processScene.afterFrame(now);
    renderer.render(scene, camera);
    if (!isReady) { isReady = true; callbacks.onReady(); }
    if (moving || processScene.isAnimating(now)) invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  invalidate();

  function dispose() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    processScene.dispose();
    canvas.removeEventListener('pointermove', handleMove); canvas.removeEventListener('wheel', handleWheel); canvas.removeEventListener('click', handleClick);
    const geometries = new Set<Three.BufferGeometry>(), materials = new Set<Three.Material>(), textures = new Set<Three.Texture>();
    scene.traverse((object) => {
      const mesh = object as Three.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
        materials.add(material); const map = (material as Three.MeshBasicMaterial).map; if (map) textures.add(map);
      });
    });
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose()); textures.forEach((texture) => texture.dispose());
    renderer.dispose(); renderer.forceContextLoss();
  }
  return { invalidate, dispose };
}
