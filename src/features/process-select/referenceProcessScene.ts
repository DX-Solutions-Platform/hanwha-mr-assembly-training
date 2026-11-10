import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { ProcessCallbacks, ProcessItem } from './processTypes';
import { updateProcessLabels } from './processLabels';
import { updateProcessAppearance, clearProcessAppearance, type ProcessEdges } from './processAppearance';

interface ProcessSession {
  index: number; startedAt: number; value: number; velocity: number; target: number;
  yaw: number; pitch: number; zoom: number; yawTarget: number; pitchTarget: number; zoomTarget: number; yawVelocity: number;
  pan: Three.Vector3; panTarget: Three.Vector3; center: Three.Vector3 | null; edges: ProcessEdges | null;
  appearanceKey?: string;
}

export class ReferenceProcessScene {
  private session: ProcessSession | null = null;
  private pointer: Three.Vector2;
  private ray: Three.Raycaster;
  private hasPointer = false;
  private drag = { on: false, button: 0, x: 0, y: 0, moved: 0 };
  private wireframe = false;
  private flight: { startedAt: number; parts: { object: Three.Object3D; position: Three.Vector3; rotation: Three.Euler; offset: Three.Vector3; delay: number; spin: number }[] } | null = null;

  constructor(private T: ReferenceThree, private canvas: HTMLCanvasElement, private camera: Three.PerspectiveCamera, private items: ProcessItem[], private positions: number[], private callbacks: ProcessCallbacks, private invalidate: () => void) {
    this.pointer = new T.Vector2(); this.ray = new T.Raycaster();
    canvas.addEventListener('wheel', this.onWheel, { capture: true, passive: false });
    canvas.addEventListener('pointerdown', this.onDown, true); canvas.addEventListener('click', this.onClick, true);
    canvas.addEventListener('contextmenu', this.onContext);
    window.addEventListener('pointermove', this.onMove, true); window.addEventListener('pointerup', this.onUp, true); window.addEventListener('keydown', this.onKey);
  }

  synchronize(now: number) {
    const index = this.callbacks.getState().activeIndex;
    if ((this.session?.index ?? null) === index) {
      if (!this.callbacks.getState().isTransition) this.restoreFlight();
      return;
    }
    this.reset();
    if (index !== null) this.session = {
      index, startedAt: now, value: 0, velocity: 0, target: 1,
      yaw: 0, pitch: 0, zoom: 1, yawTarget: 0, pitchTarget: 0, zoomTarget: 1, yawVelocity: 0,
      pan: new this.T.Vector3(), panTarget: new this.T.Vector3(), center: null, edges: null,
    };
  }

  get isWireframe() { return !!this.session && !this.callbacks.getState().isReturning && this.wireframe; }
  get activeIndex() { return this.session?.index ?? null; }

  isAnimating(now: number) {
    const s = this.session;
    if (!s) return false;
    const returning = this.callbacks.getState().isReturning;
    const item = this.items[s.index];
    // 마지막 공정 라벨이 나타날 때까지 진입 애니메이션을 진행합니다.
    return (!returning && now - s.startedAt < 3400) || Math.abs(s.value - (returning ? 0 : s.target)) > 0.001 ||
      Math.abs(s.velocity) > 0.004 || item.tilt !== (returning ? 0 : 1) || (!this.drag.on && Math.abs(s.yawVelocity) > 0.0001) ||
      Math.abs(s.yaw - s.yawTarget) > 0.0005 || Math.abs(s.pitch - s.pitchTarget) > 0.0005 ||
      Math.abs(s.zoom - s.zoomTarget) > 0.0005 || s.pan.distanceToSquared(s.panTarget) > 0.000001;
  }

  /** Demo 1.dc.html _trFlyOut: 현재 분해 위치를 기준으로 화면 밖으로 날립니다. */
  renderFlight(now: number) {
    if (!this.callbacks.getState().isTransition || !this.session) return false;
    const T = this.T, parts = this.items[this.session.index].parts;
    if (!this.flight) {
      this.camera.updateMatrixWorld(true);
      const bounds = new T.Box3(); parts.forEach((part) => bounds.expandByObject(part.object));
      const center = bounds.getCenter(new T.Vector3()), screenCenter = center.clone().project(this.camera);
      const right = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      const distance = this.camera.position.distanceTo(center) * 1.6;
      this.flight = { startedAt: now, parts: parts.map(({ object }, index) => {
        const world = new T.Box3().setFromObject(object).getCenter(new T.Vector3()), screen = world.clone().project(this.camera);
        let dx = screen.x - screenCenter.x, dy = screen.y - screenCenter.y;
        if (Math.hypot(dx, dy) < 0.05) { const angle = index * 2.4; dx = Math.cos(angle); dy = Math.sin(angle); }
        const length = Math.hypot(dx, dy), worldOffset = right.clone().multiplyScalar(dx / length).addScaledVector(up, dy / length * 0.8).multiplyScalar(distance);
        const offset = object.parent!.worldToLocal(world.clone().add(worldOffset)).sub(object.parent!.worldToLocal(world.clone()));
        return { object, position: object.position.clone(), rotation: object.rotation.clone(), offset, delay: Math.min(0.25, index * 0.015), spin: (index % 2 ? 1 : -1) * (1.5 + index % 3) };
      }) };
    }
    const elapsed = (now - this.flight.startedAt) / 1000;
    this.flight.parts.forEach((part) => {
      const k = Math.max(0, Math.min(1, (elapsed - part.delay) / 0.95)), ease = k * k * (3 - 2 * k) * k;
      part.object.position.copy(part.position).addScaledVector(part.offset, ease);
      part.object.rotation.x = part.spin * ease; part.object.rotation.z = part.spin * 0.6 * ease; part.object.visible = k < 1;
    });
    return elapsed >= 1.2 ? 'complete' : 'moving';
  }

  private restoreFlight() {
    this.flight?.parts.forEach((part) => { part.object.position.copy(part.position); part.object.rotation.copy(part.rotation); part.object.visible = true; });
    this.flight = null;
  }

  cameraTargets(dt: number) {
    const s = this.session;
    if (!s) return null;
    const ex = Math.max(0, Math.min(1.1, s.value)), smoothing = Math.min(1, dt * 7);
    if (!this.drag.on) { s.yawTarget += s.yawVelocity; s.yawVelocity *= 0.92; }
    s.yaw += (s.yawTarget - s.yaw) * smoothing; s.pitch += (s.pitchTarget - s.pitch) * smoothing;
    s.zoom += (s.zoomTarget - s.zoom) * smoothing; s.pan.lerp(s.panTarget, smoothing);
    const item = this.items[s.index]; let centerY = 0.8 + ex * 0.75, centerX = this.positions[s.index] + ex * 0.25;
    if (item.kind !== 'pump') {
      const center = new this.T.Box3().setFromObject(item.spin).getCenter(new this.T.Vector3());
      s.center ??= center.clone(); s.center.lerp(center, Math.min(1, dt * 6)); centerX = s.center.x; centerY = s.center.y;
    }
    const look = new this.T.Vector3(centerX + s.pan.x, centerY + s.pan.y, s.pan.z);
    const x = ex * 0.05, y = 0.95 + ex * 0.15, z = (5.4 + ex * 3.2) * 0.68;
    const radius = Math.hypot(x, y, z) * s.zoom, yaw = Math.atan2(x, z) + s.yaw, pitch = Math.asin(y / Math.hypot(x, y, z)) + s.pitch;
    const position = new this.T.Vector3(look.x + Math.sin(yaw) * Math.cos(pitch) * radius, look.y + Math.sin(pitch) * radius, look.z + Math.cos(yaw) * Math.cos(pitch) * radius);
    return { position, look };
  }

  step(item: ProcessItem, index: number, now: number, dt: number) {
    const s = this.session;
    if (!s || s.index !== index) return false;
    const returning = this.callbacks.getState().isReturning;
    const elapsed = (now - s.startedAt) / 1000, target = returning ? 0 : elapsed > 1.25 ? s.target : 0, step = Math.min(dt, 0.033);
    s.velocity += ((target - s.value) * 30 - s.velocity * 6.2) * step; s.value += s.velocity * step;
    item.parts.forEach((part, partIndex) => {
      if (item.kind === 'pump') part.object.position.y = part.basePosition.y + (part.object.userData.gap || 0) * 1.05 * s.value;
      else part.object.position.copy(part.basePosition).addScaledVector(part.offset, s.value);
      part.object.rotation.y = part.baseRotationY + (target - s.value) * 2.6 * (partIndex % 2 ? 1 : -1);
    });
    item.tilt = returning ? Math.max(0, item.tilt - dt / 0.9) : Math.min(1, item.tilt + dt / 1.2);
    const tilt = item.tilt * item.tilt * (3 - 2 * item.tilt);
    item.rotation += dt * 0.3 * (1 - tilt); item.spin.rotation.set(0.27 * tilt, item.rotation, 0.4 * tilt);
    return true;
  }

  afterFrame(now: number) {
    const s = this.session;
    if (!s) return;
    const state = this.callbacks.getState(), elapsed = (now - s.startedAt) / 1000, item = this.items[s.index];
    if (elapsed > 2.4 && !state.isReturning && this.hasPointer && !this.callbacks.isLabelHovered()) {
      this.camera.updateMatrixWorld(); item.holder.updateMatrixWorld(true); this.ray.setFromCamera(this.pointer, this.camera);
      const hit = this.ray.intersectObjects(item.parts.map((part) => part.object), true)[0]; let section: number | null = null;
      if (hit) { let object: Three.Object3D | null = hit.object; while (object && object.userData.gi === undefined) object = object.parent; if (object) section = object.userData.gi; }
      if (section !== state.hoveredSection) this.callbacks.onHoverSection(section);
    }
    const wireframe = this.isWireframe;
    const appearanceKey = `${state.selectedSection}:${state.hoveredSection}:${state.isReturning}:${wireframe}`;
    if (s.appearanceKey !== appearanceKey) {
      s.edges = updateProcessAppearance(this.T, item, state, wireframe, s.edges);
      s.appearanceKey = appearanceKey;
    }
    if (elapsed > 2.4) updateProcessLabels(this.T, item, this.camera, state, elapsed, Math.max(0, Math.min(1.1, s.value)), this.callbacks);
  }

  private ready() { const state = this.callbacks.getState(); return !!this.session && !state.isReturning && !state.isTransition && performance.now() - this.session.startedAt > 2000; }
  private onWheel = (event: WheelEvent) => {
    if (!this.ready() || !this.session) return;
    event.preventDefault(); event.stopImmediatePropagation(); const s = this.session;
    this.invalidate();
    if (event.ctrlKey || event.altKey) { s.zoomTarget = Math.max(0.45, Math.min(1.8, s.zoomTarget * (1 + Math.sign(event.deltaY) * 0.12))); return; }
    s.target = Math.max(0, Math.min(1, s.target - event.deltaY * 0.0012));
    if (s.target < 0.5 && this.callbacks.getState().selectedSection !== null) this.callbacks.onClearSection();
  };
  private onDown = (event: PointerEvent) => {
    if (!this.ready() || !this.session) return;
    event.stopImmediatePropagation(); this.session.yawVelocity = 0;
    this.drag = { on: true, button: event.button, x: event.clientX, y: event.clientY, moved: 0 };
  };
  private onMove = (event: PointerEvent) => {
    if (!this.ready() || !this.session || (!this.drag.on && this.callbacks.isPanelTarget(event.target))) return;
    event.stopImmediatePropagation(); const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); this.hasPointer = true;
    if (this.drag.on) {
      const x = event.clientX - this.drag.x, y = event.clientY - this.drag.y, s = this.session;
      this.drag.moved += Math.abs(x) + Math.abs(y); this.drag.x = event.clientX; this.drag.y = event.clientY;
      if (this.drag.button === 0 && !event.shiftKey) { s.yawVelocity = -x * 0.005; s.yawTarget += s.yawVelocity; s.pitchTarget = Math.max(-0.7, Math.min(0.9, s.pitchTarget + y * 0.004)); }
      else { const scale = 0.0075 * s.zoom; s.panTarget.x -= x * scale * Math.cos(s.yaw); s.panTarget.z += x * scale * Math.sin(s.yaw); s.panTarget.y += y * scale; }
    }
    this.canvas.style.cursor = this.drag.on ? 'grabbing' : this.callbacks.getState().hoveredSection !== null ? 'pointer' : 'grab';
    this.invalidate();
  };
  private onUp = (event: PointerEvent) => {
    if (!this.ready() || this.callbacks.isPanelTarget(event.target)) return;
    event.stopImmediatePropagation(); const section = this.callbacks.getState().hoveredSection;
    if (this.drag.on && this.drag.button === 0 && this.drag.moved < 5 && section !== null) this.callbacks.onSelectSection(section);
    this.drag.on = false;
    this.invalidate();
  };
  private onClick = (event: MouseEvent) => { if (this.ready()) event.stopImmediatePropagation(); };
  private onContext = (event: Event) => { if (this.session) event.preventDefault(); };
  private onKey = (event: KeyboardEvent) => {
    if (!this.session || this.callbacks.getState().isReturning || this.callbacks.getState().isTransition || /INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) return;
    if (event.key === 'r' || event.key === 'R') { this.wireframe = !this.wireframe; this.invalidate(); }
    if (!this.ready()) return;
    if (event.key === 'f' || event.key === 'F') {
      const s = this.session; s.yawTarget = 0; s.pitchTarget = 0; s.zoomTarget = 1; s.yawVelocity = 0; s.panTarget.set(0, 0, 0);
      this.invalidate();
    }
    if (event.key === 'Escape') { if (this.callbacks.getState().selectedSection !== null) this.callbacks.onClearSection(); else this.callbacks.onBack(); }
  };

  private reset() {
    this.restoreFlight();
    if (this.session) {
      const item = this.items[this.session.index]; clearProcessAppearance(item, this.session.edges);
      item.parts.forEach((part) => { part.object.position.copy(part.basePosition); part.object.rotation.y = part.baseRotationY; });
      item.tilt = 0;
    }
    this.session = null; this.wireframe = false; this.drag.on = false; this.hasPointer = false;
  }
  dispose() {
    this.reset(); const canvas = this.canvas;
    canvas.removeEventListener('wheel', this.onWheel, true); canvas.removeEventListener('pointerdown', this.onDown, true); canvas.removeEventListener('click', this.onClick, true);
    canvas.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('pointermove', this.onMove, true); window.removeEventListener('pointerup', this.onUp, true); window.removeEventListener('keydown', this.onKey);
  }
}
