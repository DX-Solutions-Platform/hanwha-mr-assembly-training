import type * as Three from 'three';
import type { ReferenceThree, ReferenceRenderer } from './referenceThree';
import type { SelectionProduct } from './selectionProducts';
import { createSelectionModels } from './selectionModels';
import { createSelectionRing } from './selectionRing';
import { createProcessParts } from '@/features/process-select/processParts';
import { ReferenceProcessScene } from '@/features/process-select/referenceProcessScene';
import type { ProcessCallbacks } from '@/features/process-select/processTypes';

interface ShelfCallbacks extends ProcessCallbacks {
  getHoveredIndex: () => number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  onLabelPosition: (index: number, x: number, y: number) => void;
}

/** Demo 1.dc.html bootShelf: 같은 장면에서 교육 선택 → 공정 분해. */
export function mountReferenceShelf(T: ReferenceThree, canvas: HTMLCanvasElement, products: SelectionProduct[], callbacks: ShelfCallbacks) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }) as ReferenceRenderer;
  renderer.setPixelRatio(1); renderer.setSize(1920, 1080, false); renderer.setClearColor(0, 0);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.shadowMap.enabled = true;
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xe6ecf0, 0x1a1512, 0.8));
  const key = new T.DirectionalLight(0xffffff, 1.7);
  key.position.set(1.4, 3, 2.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  key.shadow.camera.left = key.shadow.camera.bottom = -6; key.shadow.camera.right = key.shadow.camera.top = 6;
  scene.add(key);
  const rim = new T.DirectionalLight(0xf37321, 1.4); rim.position.set(-2, 1, -1.6); scene.add(rim);
  const fog = new T.Fog(0x07090b, 9, 24); scene.fog = fog;
  const grid = new T.GridHelper(48, 192, 0x5a3418, 0x241509);
  const gridMaterial = grid.material as Three.Material; gridMaterial.transparent = true; gridMaterial.opacity = 0.5;
  scene.add(grid);

  const camera = new T.PerspectiveCamera(34, 16 / 9, 0.05, 60);
  const restPosition = new T.Vector3(0, 3.1, 7.9), restLook = new T.Vector3(0, 0.55, 0);
  const cameraPosition = restPosition.clone(), cameraLook = restLook.clone();
  camera.position.copy(restPosition); camera.lookAt(restLook); camera.updateMatrixWorld();
  const { build, droneProps } = createSelectionModels(T);
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'JetBrains Mono, monospace';
  const count = products.length;
  const spacing = Math.min(1.7, 6.8 / Math.max(1, count));
  const base = 1.58 * Math.min(1, 6.8 / Math.max(1, count) / 1.7);
  const positions = products.map((_, index) => (index - (count - 1) / 2) * spacing);
  const items = products.map((product) => {
    const holder = new T.Group(), spin = new T.Group(), model = new T.Group(); build[product.kind](model);
    const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3());
    const scale = 0.68 / Math.max(Math.hypot(size.x, size.z), size.y * 0.85);
    model.scale.setScalar(scale); const center = bounds.getCenter(new T.Vector3());
    model.position.set(-center.x * scale, 0.05 - bounds.min.y * scale, -center.z * scale);
    spin.add(model); holder.add(spin);
    const parts = createProcessParts(T, model, product.kind, bounds, size);
    const fx = createSelectionRing(T, holder, product, fontFamily);
    const hit = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.95, 12), new T.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.48; holder.add(hit); scene.add(holder);
    return { holder, spin, hit, fx, parts, kind: product.kind, tilt: 0, lift: 0, scale: 0, rotation: Math.random() * 6 };
  });
  const processScene = new ReferenceProcessScene(T, canvas, camera, items, positions, callbacks);

  const ray = new T.Raycaster(), pointer = new T.Vector2(), labelPoint = new T.Vector3();
  let overviewWheel: { x: number; y: number } | null = null;
  const pickAt = (event: PointerEvent | MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(items.map((item) => item.hit), false)[0];
    return hit ? items.findIndex((item) => item.hit === hit.object) : null;
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

  const startTime = performance.now(); let lastTime = startTime, animationFrame = 0, processBlend = 0;
  const frame = () => {
    animationFrame = requestAnimationFrame(frame);
    const now = performance.now(); if (now - lastTime < 12) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
    processScene.synchronize(now);
    if (processScene.renderFlight(now)) { renderer.render(scene, camera); return; }
    const activeIndex = processScene.activeIndex, processCamera = processScene.cameraTargets(dt);
    const hovered = callbacks.getHoveredIndex(), targetPosition = restPosition.clone(), targetLook = restLook.clone();
    if (processCamera) { targetPosition.copy(processCamera.position); targetLook.copy(processCamera.look); }
    else if (hovered !== null && positions[hovered] !== undefined) {
      const x = positions[hovered]; targetPosition.set(x * 0.5, 2.7, 6.6); targetLook.set(x * 0.75, 0.5, 0);
    }
    const smoothing = Math.min(1, dt * (activeIndex !== null ? 4 : 2.2));
    cameraPosition.lerp(targetPosition, smoothing); cameraLook.lerp(targetLook, smoothing);
    camera.position.copy(cameraPosition); camera.lookAt(cameraLook);
    processBlend += ((activeIndex !== null ? 1 : 0) - processBlend) * Math.min(1, dt * 2.2);
    gridMaterial.opacity = 0.5 * (1 - processBlend); gridMaterial.visible = !processScene.isWireframe;
    grid.visible = processBlend < 0.97; fog.near = 9 - processBlend * 4;
    items.forEach((item, index) => {
      const selected = activeIndex === index, other = activeIndex !== null && !selected;
      const active = hovered === index || selected;
      const entrance = Math.max(0, Math.min(1, ((now - startTime) / 1000 - 0.3 - index * 0.12) / 0.8));
      const ease = 1 - Math.pow(1 - entrance, 3);
      item.holder.position.set(positions[index], 0, 0);
      item.lift += ((active ? 0.08 : 0) + (selected ? 0.12 : 0) - item.lift) * Math.min(1, dt * 8);
      item.scale += ((selected ? 1.12 : other ? 0.001 : active ? 1.05 : 1) - item.scale) * Math.min(1, dt * 7);
      if (!processScene.step(item, index, now, dt)) { item.rotation += dt * (active ? 1.1 : 0.35); item.spin.rotation.set(0, item.rotation, 0); }
      item.spin.position.y = item.lift + Math.sin(now / 1000 * 1.3 + index) * 0.008;
      item.spin.scale.setScalar(Math.max(0.001, ease)); item.holder.scale.setScalar(Math.max(0.001, base * item.scale * (0.85 + 0.15 * ease)));
      const fx = item.fx, time = now / 1000, visibility = ease * (1 - processBlend);
      fx.fl.visible = fx.flSh.visible = fx.hScan.visible = visibility > 0.01;
      fx.fl.position.y = 0.035 + (active ? Math.sin(time * 1.6 + index) * 0.006 : 0) - processBlend * 0.15;
      fx.flMain.rotation.z += dt * (active ? 0.6 : 0); fx.flOut.rotation.z -= dt * (active ? 0.35 : 0);
      fx.flMain.material.opacity = (active ? 1 : 0.7) * visibility; fx.flOut.material.opacity = (active ? 1 : 0.6) * visibility;
      fx.flShM.opacity = (active ? 0.14 : 0.06) * visibility;
      const scan = (time / 1.4 + index * 0.27) % 1; fx.hScan.position.y = 0.05 + scan * 0.85;
      fx.hScanM.opacity = active ? (1 - scan) * 0.85 * visibility : 0;
      if (products[index].kind === 'drone') droneProps.forEach((propeller) => { propeller.rotation.y += dt * (active ? 30 : 6); });
      labelPoint.set(positions[index], -0.02, 0.62 * base).project(camera);
      callbacks.onLabelPosition(index, (labelPoint.x + 1) / 2 * 1920, (1 - labelPoint.y) / 2 * 1080 + 14);
    });
    processScene.afterFrame(now, dt);
    renderer.render(scene, camera);
  };
  animationFrame = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(animationFrame);
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
    key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
}
