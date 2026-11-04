import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { PracticeCallbacks, PracticeState } from './practiceTypes';

type NavigationState = PracticeState & { phase: string };
type Mode = 'walk' | 'look' | 'updown' | 'pan' | 'dolly' | 'orbit';

/** 원본 Unreal 방식 카메라 입력과 hudLayout.v1 구역 배치 값. */
export class PracticeNavigation {
  readonly cameraPosition: Three.Vector3;
  readonly materialOffset: Three.Vector3;
  workRotation = 0; materialRotation = 0;
  private yaw = 0; private pitch = Math.atan2(1.15 - 2, 3.4); private dolly = 0; private speed = 1;
  private keys: Record<string, boolean> = {};
  private drag: { mode: Mode; x: number; y: number; startX: number; startY: number; part: string | null; moved: number } | null = null;
  private selectedZone: 'work' | 'mat' | null = null;
  private zoneDrag: { point: Three.Vector3; start: Three.Vector3 } | null = null;
  private resetViewId = 0; private resetLayoutId = 0; private height = 0; private rightHeld = false;
  private ray: Three.Raycaster; private pointer: Three.Vector2;
  private workBase: Three.Vector3; private materialBase: Three.Vector3; private materialBaseRotation: number;

  constructor(private T: ReferenceThree, private canvas: HTMLCanvasElement, private camera: Three.PerspectiveCamera, private world: Three.Group,
    private work: Three.Group, private workPad: Three.Group, private materialPad: Three.Group, private pickables: Three.Mesh[],
    private getState: () => NavigationState, private callbacks: PracticeCallbacks) {
    this.cameraPosition = new T.Vector3(0, 2, 3.4); this.materialOffset = new T.Vector3(); this.ray = new T.Raycaster(); this.pointer = new T.Vector2();
    this.workBase = work.position.clone(); this.materialBase = materialPad.position.clone(); this.materialBaseRotation = materialPad.rotation.y;
    try {
      const saved = JSON.parse(localStorage.getItem('hudLayout.v1') || 'null');
      if (saved) { work.position.set(saved.w[0], this.workBase.y, saved.w[1]); this.materialOffset.set(saved.m[0], 0, saved.m[1]); this.height = saved.h || 0; if (saved.r) [this.workRotation, this.materialRotation] = saved.r; }
    } catch { /* 원본과 같이 저장값이 없으면 기본 배치를 사용합니다. */ }
    this.applyLayout();
    if (this.height !== this.getState().benchHeight) this.callbacks.onHeightLoaded(this.height);
    canvas.addEventListener('pointerdown', this.onDown); canvas.addEventListener('pointermove', this.onMove); canvas.addEventListener('pointerup', this.onUp); canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('wheel', this.onWheel, { passive: false }); canvas.addEventListener('contextmenu', this.onContext);
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp); window.addEventListener('blur', this.onBlur);
  }

  private allowed() { const s = this.getState(); return s.phase === 'main' && !s.isPaused && !s.isRadialOpen; }
  get activeZone() { return this.selectedZone; }
  private setRay(event: PointerEvent | WheelEvent) {
    const rect = this.canvas.getBoundingClientRect(); this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
  }
  private pick(event: PointerEvent) {
    this.setRay(event);
    const hit = this.ray.intersectObjects(this.pickables, false).find(({ object }) => {
      let node: Three.Object3D | null = object; while (node) { if (!node.visible) return false; node = node.parent; } return true;
    });
    return hit ? String(hit.object.userData.part) : null;
  }
  private floorPoint(event: PointerEvent) {
    this.setRay(event); const point = this.ray.ray.intersectPlane(new this.T.Plane(new this.T.Vector3(0, 1, 0), -0.906), new this.T.Vector3());
    return point ? this.world.worldToLocal(point) : null;
  }
  private pickZone(event: PointerEvent | WheelEvent) {
    this.setRay(event); const hit = this.ray.intersectObjects([this.workPad.children[1], this.materialPad.children[1]], false)[0];
    return hit ? hit.object === this.workPad.children[1] ? 'work' as const : 'mat' as const : null;
  }
  private applyLayout() {
    this.work.position.y = this.workBase.y + this.height; this.work.rotation.y = this.workRotation;
    this.workPad.position.copy(this.work.position); this.workPad.rotation.y = this.workRotation;
    this.materialPad.position.copy(this.materialBase).add(this.materialOffset); this.materialPad.rotation.y = this.materialBaseRotation + this.materialRotation;
  }
  private save() { try { localStorage.setItem('hudLayout.v1', JSON.stringify({ w: [this.work.position.x, this.work.position.z], m: [this.materialOffset.x, this.materialOffset.z], r: [this.workRotation, this.materialRotation], h: this.height })); } catch { /* 저장이 막혀도 화면 조작은 계속합니다. */ } }
  private rotateZone(degrees: number) { if (!this.selectedZone) return; const angle = degrees * Math.PI / 180; if (this.selectedZone === 'work') this.workRotation += angle; else this.materialRotation += angle; this.applyLayout(); this.save(); }
  private onDown = (event: PointerEvent) => {
    if (!this.allowed()) return;
    if (event.button === 2) this.rightHeld = true;
    if (this.getState().isLayoutEditing) {
      if (event.button !== 0) return;
      this.selectedZone = this.pickZone(event); const point = this.floorPoint(event);
      if (this.selectedZone && point) { this.zoneDrag = { point, start: this.selectedZone === 'work' ? this.work.position.clone() : this.materialOffset.clone() }; this.canvas.setPointerCapture(event.pointerId); this.canvas.style.cursor = 'grabbing'; }
      return;
    }
    event.preventDefault(); const part = event.button === 0 && !event.altKey ? this.pick(event) : null;
    const mode: Mode = event.altKey ? event.button === 0 ? 'orbit' : event.button === 2 ? 'dolly' : 'pan' : event.button === 1 ? 'pan' : event.buttons === 3 ? 'updown' : event.button === 2 ? 'look' : 'walk';
    this.drag = { mode, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, part, moved: 0 };
    this.canvas.setPointerCapture(event.pointerId); this.canvas.style.cursor = mode === 'pan' ? 'move' : 'grabbing';
  };
  private onMove = (event: PointerEvent) => {
    if (!this.allowed()) return;
    if (this.getState().isLayoutEditing) {
      if (!this.zoneDrag) { this.canvas.style.cursor = this.pickZone(event) ? 'grab' : 'default'; return; }
      const point = this.floorPoint(event); if (!point) return;
      const next = this.zoneDrag.start.clone().add(point.sub(this.zoneDrag.point));
      if (this.selectedZone === 'work') this.work.position.set(Math.max(-4.5, Math.min(4.5, next.x)), this.work.position.y, Math.max(-7, Math.min(-1.2, next.z)));
      else this.materialOffset.set(Math.max(-5, Math.min(3, next.x)), 0, Math.max(-4, Math.min(2.5, next.z)));
      this.applyLayout(); return;
    }
    const drag = this.drag; if (!drag) return;
    const scale = this.canvas.getBoundingClientRect().width / 1920, rawX = event.clientX - drag.x, rawY = event.clientY - drag.y, dx = rawX / scale, dy = rawY / scale;
    drag.x = event.clientX; drag.y = event.clientY; drag.moved += Math.abs(rawX) + Math.abs(rawY);
    if (drag.part) return;
    const forward = new this.T.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), right = new this.T.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const direction = new this.T.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    if (drag.mode === 'walk') { this.yaw -= dx * 0.0022; this.cameraPosition.addScaledVector(forward, -dy * 0.006); }
    if (drag.mode === 'look') { this.yaw -= rawX * 0.0016; this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - rawY * 0.0016)); }
    if (drag.mode === 'updown') { this.cameraPosition.y -= dy * 0.004; this.cameraPosition.addScaledVector(right, dx * 0.004); }
    if (drag.mode === 'pan') { this.cameraPosition.addScaledVector(right, -dx * 0.004); this.cameraPosition.y += dy * 0.004; }
    if (drag.mode === 'dolly') this.cameraPosition.addScaledVector(direction, (dx - dy) * 0.005);
    if (drag.mode === 'orbit') {
      const pivot = new this.T.Vector3(0, 1.15, 0), offset = this.cameraPosition.clone().sub(pivot), radius = offset.length(), theta = Math.atan2(offset.x, offset.z) - dx * 0.006;
      const phi = Math.max(-0.1, Math.min(1.3, Math.asin(Math.max(-0.99, Math.min(0.99, offset.y / radius))) + dy * 0.005));
      this.cameraPosition.set(pivot.x + Math.sin(theta) * Math.cos(phi) * radius, pivot.y + Math.sin(phi) * radius, pivot.z + Math.cos(theta) * Math.cos(phi) * radius);
      const directionToPivot = pivot.sub(this.cameraPosition).normalize(); this.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, directionToPivot.y))); this.yaw = Math.atan2(-directionToPivot.x, -directionToPivot.z);
    }
    this.cameraPosition.x = Math.max(-6, Math.min(6, this.cameraPosition.x)); this.cameraPosition.z = Math.max(-6, Math.min(6, this.cameraPosition.z)); this.cameraPosition.y = Math.min(4, this.cameraPosition.y);
  };
  private onUp = (event: PointerEvent) => {
    if (event.button === 2) this.rightHeld = false;
    if (this.zoneDrag) { this.zoneDrag = null; this.save(); }
    const drag = this.drag;
    if (drag && event.button === 0 && drag.moved <= 6 && this.allowed() && !this.getState().isLayoutEditing) this.callbacks.onSelectPart(drag.part);
    this.drag = null; this.canvas.style.cursor = 'default';
  };
  private onCancel = () => { this.drag = null; this.zoneDrag = null; this.rightHeld = false; };
  private onWheel = (event: WheelEvent) => {
    if (!this.allowed()) return;
    event.preventDefault();
    if (this.getState().isLayoutEditing) { this.selectedZone = this.pickZone(event) ?? this.selectedZone; this.rotateZone(event.deltaY > 0 ? 5 : -5); return; }
    if (this.rightHeld) { this.speed = Math.max(0.25, Math.min(4, this.speed * (event.deltaY < 0 ? 1.25 : 0.8))); return; }
    this.dolly -= event.deltaY * 0.0015;
  };
  private onContext = (event: Event) => event.preventDefault();
  private onKeyDown = (event: KeyboardEvent) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) return;
    this.keys[event.code] = true; if (!this.allowed()) return;
    if (event.code === 'KeyF') this.resetCamera();
    if (event.code === 'KeyB') this.callbacks.onSelectPart(null);
    if (event.code === 'ArrowLeft') this.callbacks.onChangeView(Math.max(-1, this.getState().view - 1));
    if (event.code === 'ArrowRight') this.callbacks.onChangeView(Math.min(1, this.getState().view + 1));
    if (event.code === 'KeyR' && this.getState().isLayoutEditing) this.rotateZone(event.shiftKey ? -15 : 15);
  };
  private onKeyUp = (event: KeyboardEvent) => { this.keys[event.code] = false; };
  private onBlur = () => { this.keys = {}; this.onCancel(); };
  private resetCamera(changeView = false) { this.cameraPosition.set(0, 2, 3.4); this.yaw = 0; this.pitch = Math.atan2(1.15 - 2, 3.4); this.dolly = 0; if (changeView) this.callbacks.onChangeView(0); }
  update(dt: number) {
    const state = this.getState();
    if (state.resetViewId !== this.resetViewId) { this.resetViewId = state.resetViewId; this.resetCamera(true); }
    if (state.resetLayoutId !== this.resetLayoutId) { this.resetLayoutId = state.resetLayoutId; this.work.position.copy(this.workBase); this.materialOffset.set(0, 0, 0); this.workRotation = this.materialRotation = 0; this.height = 0; this.applyLayout(); this.save(); }
    if (state.benchHeight !== this.height) { this.height = state.benchHeight; this.applyLayout(); this.save(); }
    const forward = new this.T.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    if (this.allowed() && !state.isLayoutEditing) {
      const right = new this.T.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)), step = (this.keys.ShiftLeft || this.keys.ShiftRight ? 1.4 : 0.55) * this.speed * dt;
      if (this.keys.KeyW || this.keys.ArrowUp) this.cameraPosition.addScaledVector(forward, step);
      if (this.keys.KeyS || this.keys.ArrowDown) this.cameraPosition.addScaledVector(forward, -step);
      if (this.keys.KeyD) this.cameraPosition.addScaledVector(right, step); if (this.keys.KeyA) this.cameraPosition.addScaledVector(right, -step);
      if (this.keys.KeyE) this.cameraPosition.y += step; if (this.keys.KeyQ) this.cameraPosition.y -= step;
      if (Math.abs(this.dolly) > 0.0005) { const distance = this.dolly * Math.min(1, dt * 8); this.cameraPosition.addScaledVector(forward, distance); this.dolly -= distance; }
    }
    this.cameraPosition.y = Math.max(0.95, this.cameraPosition.y); this.camera.position.copy(this.cameraPosition); this.camera.lookAt(this.cameraPosition.clone().add(forward));
    return this.selectedZone;
  }
  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onDown); this.canvas.removeEventListener('pointermove', this.onMove); this.canvas.removeEventListener('pointerup', this.onUp); this.canvas.removeEventListener('pointercancel', this.onCancel); this.canvas.removeEventListener('wheel', this.onWheel); this.canvas.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp); window.removeEventListener('blur', this.onBlur);
  }
}
