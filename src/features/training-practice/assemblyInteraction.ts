import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { createBomModels } from '@/features/training-preparation/bomModels';
import type { createPracticeModels } from './practiceModels';
import type { PracticeState, PracticeCallbacks } from './practiceTypes';
import { BOLT_ORDER, angularDelta, tighten, displayedTorque, displayedResistance, overTorque } from './assemblyMath';
import { ASSEMBLY_TOOLS, type AssemblyReport } from './assemblyTypes';
import { AssemblySound } from './assemblySound';
import { createAssemblyReport } from './assemblyReport';

type BomPart = ReturnType<typeof createBomModels>['parts'][number];
type Models = ReturnType<typeof createPracticeModels>;
type State = PracticeState & { phase: string };
const smooth = (value: number) => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };

/** Demo 1 HUD의 실제 드래그·대각선 순서·토크 체결·과체결 판정. */
export class AssemblyInteraction {
  draggedPart: BomPart | null = null;
  private down: { x: number; y: number; moved: number; part: string; orbit?: { x: number; y: number } } | null = null;
  private turning: { bx: number; by: number; last: number } | null = null;
  private dragCover = false; private near = false; private holding = false; private holdStartedAt = 0;
  private ray: Three.Raycaster; private pointer: Three.Vector2; private plane: Three.Plane; private offset: Three.Vector3;
  private progress = 0; private wrenchAngle = 0; private resistance = 0; private over = 0; private overWarned = false;
  private clickAt = 0; private tickAt = 0; private strainAt = 0; private seatAt = 0; private motorPopAt = 0; private restShakeAt = 0;
  private focus = 0; private focusX = 0; private focusY = 0; private zoom = 1; private zoomCamera: Three.PerspectiveCamera | null = null;
  private mag = { on: false, zoom: 3, source: { x: 960, y: 535 }, center: { x: 960, y: 535 }, x: 660, y: 300, width: 600, height: 470 };
  private sound = new AssemblySound(); private timers = new Set<ReturnType<typeof setTimeout>>();
  private stats = { startedAt: performance.now(), mistakes: 0, hints: 0, torque: [] as number[] };

  constructor(private T: ReferenceThree, private canvas: HTMLCanvasElement, private camera: Three.PerspectiveCamera, private world: Three.Group,
    private models: Models, private parts: BomPart[], private pickables: Three.Mesh[], private getState: () => State, private callbacks: PracticeCallbacks) {
    this.ray = new T.Raycaster(); this.pointer = new T.Vector2(); this.plane = new T.Plane(); this.offset = new T.Vector3();
    canvas.addEventListener('pointerdown', this.onDown, true); canvas.addEventListener('pointermove', this.onMove, true);
    canvas.addEventListener('pointerup', this.onUp, true); canvas.addEventListener('pointercancel', this.onCancel, true); canvas.addEventListener('wheel', this.onWheel, { capture: true, passive: false });
  }
  private allowed() { const s = this.getState(); return s.phase === 'main' && !s.isPaused && !s.isRadialOpen && !s.isLayoutEditing; }
  get isFocused() { const s = this.getState(); return s.phase === 'main' && s.section === 0 && s.step === 2; }
  getPartScale(part: BomPart, index: number) {
    const held = part === this.draggedPart && this.getState().step === 2, point = held && this.mag.on ? this.toScreen(part.root.getWorldPosition(new this.T.Vector3())) : null;
    const inZoom = !!point && point.x > this.mag.x && point.x < this.mag.x + this.mag.width && point.y > this.mag.y && point.y < this.mag.y + this.mag.height;
    return held ? inZoom ? index === 0 ? 0.16 : 0.7 : index === 0 ? 0.55 : 0.8 : part.inTray ? index === 0 ? 0.72 : 1.15 : 1;
  }
  private later(callback: () => void, delay: number) { const timer = setTimeout(() => { this.timers.delete(timer); callback(); }, delay); this.timers.add(timer); }
  private patch(patch: Parameters<PracticeCallbacks['onAssemblyChange']>[0]) { this.callbacks.onAssemblyChange(patch); }
  private toast(tag: string, message: string) { this.callbacks.onAssemblyFeedback({ kind: 'toast', tag, message }); }
  private mistake(message: string) { this.stats.mistakes++; this.sound.play('err'); this.callbacks.onAssemblyFeedback({ kind: 'error', tag: 'ERROR', message }); }
  select(key: string | null) { if (key && key !== this.getState().selectedPart) this.stats.hints++; this.callbacks.onSelectPart(key); }
  private setRay(event: PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect(); let x = (event.clientX - bounds.left) / bounds.width * 1920, y = (event.clientY - bounds.top) / bounds.height * 1080;
    const m = this.mag;
    if (m.on && x > m.x && x < m.x + m.width && y > m.y && y < m.y + m.height) { x = m.source.x + (x - m.center.x) / m.zoom; y = m.source.y + (y - m.center.y) / m.zoom; }
    this.pointer.set(x / 1920 * 2 - 1, -(y / 1080) * 2 + 1); this.ray.setFromCamera(this.pointer, this.camera);
  }
  private pick(event: PointerEvent) {
    this.setRay(event);
    const hit = this.ray.intersectObjects(this.pickables, false).find(({ object }) => { let node: Three.Object3D | null = object; while (node) { if (!node.visible) return false; node = node.parent; } return true; });
    return hit ? String(hit.object.userData.part) : null;
  }
  boltLocal(index: number, y: number) { const angle = BOLT_ORDER[Math.min(3, index)] / 4 * Math.PI * 2 + 0.4; return new this.T.Vector3(Math.cos(angle) * 0.145, y, Math.sin(angle) * 0.145); }
  toScreen(point: Three.Vector3) {
    const vector = point.clone().project(this.camera), m = this.mag; let x = (vector.x + 1) / 2 * 1920, y = (1 - vector.y) / 2 * 1080;
    if (m.on && Math.abs(x - m.source.x) < m.width / 2 / m.zoom && Math.abs(y - m.source.y) < m.height / 2 / m.zoom) { x = m.center.x + (x - m.source.x) * m.zoom; y = m.center.y + (y - m.source.y) * m.zoom; }
    return { x, y };
  }
  private boltScreen(y: number) { return this.toScreen(this.models.cover.localToWorld(this.boltLocal(this.getState().boltN, y))); }
  private stop(event: PointerEvent) { event.stopImmediatePropagation(); this.canvas.setPointerCapture(event.pointerId); }
  private startPlane(object: Three.Object3D, event: PointerEvent) {
    this.setRay(event); const point = object.getWorldPosition(new this.T.Vector3()), direction = new this.T.Vector3(); this.camera.getWorldDirection(direction);
    this.plane.setFromNormalAndCoplanarPoint(direction, point); const hit = this.ray.ray.intersectPlane(this.plane, new this.T.Vector3()); this.offset.copy(hit ?? point).sub(point);
  }
  private onDown = (event: PointerEvent) => {
    if (event.button !== 0 || !this.allowed()) return;
    const state = this.getState(), bounds = this.canvas.getBoundingClientRect();
    if (this.isFocused && state.boltStage === 'tool' && state.restTool !== null && state.restTool !== 0) {
      const bolt = this.boltScreen(0.06), x = bounds.left + bolt.x / 1920 * bounds.width, y = bounds.top + bolt.y / 1080 * bounds.height;
      if (Math.hypot(event.clientX - x, event.clientY - y) < 200 * bounds.width / 1920) { this.wrongTool(); this.stop(event); return; }
    }
    const key = this.pick(event), needed = state.section === 0 ? state.step === 0 ? 'bom:9' : state.step === 1 ? 'bom:10' : state.step === 2 && state.boltStage === 'place' ? 'tray' : state.step === 2 && state.boltStage === 'tool' ? 'wrench' : null : null;
    if (this.isFocused && state.boltStage === 'turn') {
      const point = this.boltScreen(0.06), bx = bounds.left + point.x / 1920 * bounds.width, by = bounds.top + point.y / 1080 * bounds.height;
      if (Math.hypot(event.clientX - bx, event.clientY - by) < 320 * bounds.width / 1920) {
        this.turning = { bx, by, last: Math.atan2(event.clientY - by, event.clientX - bx) }; this.down = { x: event.clientX, y: event.clientY, moved: 0, part: '__turn' }; this.stop(event); this.canvas.style.cursor = 'grabbing'; return;
      }
    }
    if (this.isFocused && (!key || key === 'cover' || key === 'motor')) {
      const x = (event.clientX - bounds.left) / bounds.width * 1920, y = (event.clientY - bounds.top) / bounds.height * 1080;
      if (x > 600 && x < 1320 && y > 330 && y < 850) { this.down = { x: event.clientX, y: event.clientY, moved: 0, part: '__orbit', orbit: { x: event.clientX, y: event.clientY } }; this.stop(event); return; }
    }
    if (needed === 'wrench' && key === needed && !state.toolSafe) { this.holding = true; this.holdStartedAt = performance.now(); this.stop(event); return; }
    if (needed && key === needed) {
      this.draggedPart = this.parts.find((part) => part.key === needed)!; this.draggedPart.returning = false; this.startPlane(this.draggedPart.root, event);
      this.down = { x: event.clientX, y: event.clientY, moved: 0, part: needed }; this.select(needed); this.stop(event); return;
    }
    if (key === 'cover' && state.section === 0 && state.step === 1) { this.dragCover = true; this.startPlane(this.models.cover, event); this.down = { x: event.clientX, y: event.clientY, moved: 0, part: key }; this.select(key); this.stop(event); return; }
    if ((key === 'motor' || key === 'cover') && state.section === 0 && state.step === 3) { this.down = { x: event.clientX, y: event.clientY, moved: 0, part: key }; this.stop(event); }
  };
  private onMove = (event: PointerEvent) => {
    if (!this.allowed()) return;
    const down = this.down;
    if (!down) { if (!this.holding) { const key = this.pick(event), s = this.getState(); this.canvas.style.cursor = key ? s.section === 0 && (key === 'bom:9' && s.step === 0 || key === 'bom:10' && s.step === 1) ? 'grab' : 'pointer' : 'default'; } return; }
    event.stopImmediatePropagation(); down.moved = Math.max(down.moved, Math.abs(event.clientX - down.x), Math.abs(event.clientY - down.y));
    if (down.orbit) { const scale = this.canvas.getBoundingClientRect().width / 1920; this.focusY += (event.clientX - down.orbit.x) / scale * 0.008; this.focusX = Math.max(-0.6, Math.min(0.8, this.focusX + (event.clientY - down.orbit.y) / scale * 0.006)); down.orbit.x = event.clientX; down.orbit.y = event.clientY; return; }
    if (this.turning) { this.turn(event); return; }
    if (this.draggedPart) {
      this.setRay(event); const hit = this.ray.ray.intersectPlane(this.plane, new this.T.Vector3());
      if (hit) {
        hit.sub(this.offset); hit.y = Math.max(hit.y, 1); this.draggedPart.root.position.copy(this.world.worldToLocal(hit.clone()));
        const s = this.getState(), target = s.step === 2 ? this.models.cover.localToWorld(this.boltLocal(s.boltN, s.boltStage === 'tool' ? 0.08 : 0.04)) : this.models.work.localToWorld(new this.T.Vector3(0, s.step === 0 ? 0.15 : 0.36 + 0.08, 0));
        target.project(this.camera); const partPosition = this.draggedPart.root.getWorldPosition(new this.T.Vector3()).project(this.camera);
        const distance = Math.min(Math.hypot((target.x - partPosition.x) * 960, (target.y - partPosition.y) * 540), Math.hypot((target.x - this.pointer.x) * 960, (target.y - this.pointer.y) * 540));
        this.near = distance < (s.step === 2 ? 130 / (this.mag.on ? this.mag.zoom : 1) : 110);
        if (this.near && s.step === 2) this.draggedPart.root.position.lerp(this.world.worldToLocal(target.clone().unproject(this.camera)), 0.55);
      }
      this.canvas.style.cursor = 'grabbing'; return;
    }
    if (this.dragCover) {
      this.setRay(event); const hit = this.ray.ray.intersectPlane(this.plane, new this.T.Vector3());
      if (hit) { hit.sub(this.offset); hit.y = Math.max(hit.y, 1); this.models.cover.position.copy(this.models.work.worldToLocal(hit)); const target = this.models.work.localToWorld(new this.T.Vector3(0, 0.36, 0)).project(this.camera), position = this.models.cover.getWorldPosition(new this.T.Vector3()).project(this.camera); this.near = Math.hypot((target.x - position.x) * 960, (target.y - position.y) * 540) < 70; }
      this.canvas.style.cursor = 'grabbing';
    }
  };
  private turn(event: PointerEvent) {
    const turning = this.turning!, angle = Math.atan2(event.clientY - turning.by, event.clientX - turning.bx), delta = angularDelta(angle, turning.last); turning.last = angle;
    if (delta > 0 && this.progress >= 1 && this.clickAt && performance.now() - this.clickAt < 900) {
      this.over += delta; this.wrenchAngle += delta * 0.15;
      const result = overTorque(this.over, this.overWarned);
      if (result.warn) { this.overWarned = true; this.stats.torque[this.stats.torque.length - 1] = result.torque; this.mistake(`토크 초과 경고 · ${result.torque.toFixed(1)} N·m — 나사산 손상 위험. 클릭음이 나면 멈추세요`); }
      return;
    }
    if (delta <= 0) return;
    const previous = this.progress, result = tighten(previous, delta); this.progress = result.progress; this.wrenchAngle += result.rotation; this.resistance = result.resistance; this.strainAt = performance.now();
    if (Math.floor(previous * 24) !== Math.floor(this.progress * 24)) { this.sound.play(this.resistance > 0.4 ? 'heavy' : 'tick'); this.tickAt = performance.now(); }
    if (this.progress >= 1 && previous < 1) this.boltDone();
  }
  private onUp = (event: PointerEvent) => {
    this.holding = false; const down = this.down; if (!down) return;
    event.stopImmediatePropagation(); this.down = null; this.canvas.style.cursor = 'default';
    if (this.turning) { this.turning = null; return; }
    if (this.draggedPart) {
      const part = this.draggedPart, state = this.getState(); this.draggedPart = null;
      if (this.near && state.step === 2) { part.returning = true; this.progress = 0; this.sound.play('seat'); this.select(null); if (state.boltStage === 'place') { this.seatAt = performance.now(); this.patch({ boltStage: 'tool' }); } else { this.wrenchAngle = 0; this.patch({ boltStage: 'turn' }); } this.near = false; return; }
      if (this.near) {
        if (state.step === 0) { this.motorPopAt = performance.now(); this.patch({ step: 1 }); this.toast('STEP 01', '구동 모터 고정 완료'); }
        else { this.models.cover.position.set(0, 0.36, 0); this.patch({ step: 2 }); this.toast('STEP 02', '상단 커버 장착 완료'); }
        this.select(null);
      } else {
        part.returning = true; let message = state.step === 2 ? state.boltStage === 'tool' ? '렌치 소켓을 볼트 머리에 맞추세요' : '볼트 구멍이 아닙니다' : '표시된 위치가 아닙니다';
        if (state.step === 2 && state.boltStage === 'place') { const position = part.root.getWorldPosition(new this.T.Vector3()).project(this.camera); for (let index = state.boltN + 1; index < 4; index++) { const hole = this.models.cover.localToWorld(this.boltLocal(index, 0.04)).project(this.camera); if (Math.hypot(hole.x - position.x, hole.y - position.y) < 0.09) { message = `대각선 순서가 아닙니다 · ${state.boltN + 1}번 구멍부터 체결하세요`; break; } } }
        if (part.root.position.distanceTo(part.destination) > 0.3) this.mistake(message);
      }
      this.near = false; return;
    }
    if (this.dragCover) { this.dragCover = false; if (this.near) { this.models.cover.position.set(0, 0.36, 0); this.patch({ step: 2 }); this.select(null); this.toast('STEP 02', '상단 커버 장착 완료'); } this.near = false; return; }
    if (down.moved <= 6 && down.part !== '__orbit' && this.getState().step === 3) this.completeSection();
  };
  private onCancel = (event: PointerEvent) => { if (this.down) event.stopImmediatePropagation(); if (this.draggedPart) this.draggedPart.returning = true; this.draggedPart = null; this.dragCover = false; this.down = null; this.turning = null; this.holding = false; this.near = false; };
  private onWheel = (event: WheelEvent) => { if (!this.allowed() || !this.isFocused) return; event.preventDefault(); event.stopImmediatePropagation(); this.zoom = Math.max(0.6, Math.min(1.8, this.zoom - event.deltaY * 0.0012)); };

  private boltDone() {
    this.sound.play('click'); this.clickAt = performance.now(); this.over = 0; this.overWarned = false; this.stats.torque.push(12); const index = this.getState().boltN;
    this.toast('12 N·m', `볼트 ${index + 1} / 4 체결 완료`);
    this.later(() => { this.turning = null; if (index >= 3) { this.patch({ step: 3, boltN: 4, boltStage: 'place' }); this.toast('STEP 03', '볼트 4개 체결 완료'); } else this.patch({ boltN: index + 1, boltStage: 'place' }); this.progress = 0; }, 900);
  }
  pickTool(index: number) {
    const state = this.getState(); if (index === 0 && !state.toolSafe) { this.patch({ toolSafetyOpen: true, radialHover: index }); return; }
    this.finishToolPick(index);
  }
  private finishToolPick(index: number) { this.sound.play('seat'); this.patch({ radialOpen: false, toolSafetyOpen: false, radialHover: null, restTool: index }); if (index === 0 && this.getState().boltStage === 'tool') this.startTurning(); }
  confirmToolSafety() { this.patch({ toolSafe: true }); this.finishToolPick(0); }
  useRest() { const state = this.getState(); if (!this.allowed() || state.section !== 0 || state.step !== 2 || state.boltStage !== 'tool' || state.restTool === null) return; if (state.restTool !== 0) this.wrongTool(); else this.startTurning(); }
  private wrongTool() { const tool = ASSEMBLY_TOOLS[this.getState().restTool!]; this.mistake(`도구가 맞지 않습니다 · ${tool.name}(으)로는 볼트를 조일 수 없습니다`); this.restShakeAt = performance.now(); }
  private startTurning() { this.progress = 0; this.wrenchAngle = 0; this.sound.play('seat'); this.patch({ boltStage: 'turn' }); this.select(null); }
  buildReport(): AssemblyReport {
    return createAssemblyReport(this.stats, (performance.now() - this.stats.startedAt) / 1000, this.getState().mode, new Date().toLocaleString('ko-KR'));
  }
  private completeSection() { const report = this.buildReport(); this.callbacks.onAssemblyComplete(report); this.callbacks.onAssemblyFeedback({ kind: 'section', tag: 'SECTION CLEAR', message: `상부 완료 · ${report.time} · 실수 ${report.mistakes}회 · 토크 정확도 ${report.torque}` }); this.patch({ section: 1, step: 0 }); this.select(null); this.callbacks.onChangeView(-1); this.later(() => this.callbacks.onChangeView(0), 2600); }

  private onTop(object: Three.Object3D, on: boolean) {
    if (object.userData.onTop === on) return; object.userData.onTop = on;
    object.traverse((node) => { const mesh = node as Three.Mesh; if (!mesh.isMesh || !mesh.material) return; if (!mesh.userData.ownMaterial) { mesh.material = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : mesh.material.clone(); mesh.userData.ownMaterial = true; } (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => { material.depthTest = !on; material.depthWrite = !on; }); mesh.renderOrder = on ? 999 : 0; });
  }
  update(now: number, dt: number) {
    const state = this.getState(), focused = this.isFocused, { work, motor, cover, coverBolts, focusGroup, holeMark, toolW, toolWs, clickRing, target } = this.models;
    this.focus += ((focused ? 1 : 0) - this.focus) * Math.min(1, dt * 3.5); const focus = smooth(this.focus);
    if (!focused && this.focus < 0.02) { this.focusX = 0; this.focusY = 0; this.zoom = 1; }
    const x = (0.35 + this.focusX) * focus, y = this.focusY * focus, pivot = new this.T.Vector3(0, 0.3, 0);
    focusGroup.position.copy(pivot.clone().applyEuler(new this.T.Euler(0.35 * focus, 0, 0))).sub(pivot.clone().applyEuler(new this.T.Euler(x, y, 0))); focusGroup.rotation.set(x, y, 0); focusGroup.scale.setScalar(1);
    const done = state.section > 0 || state.step >= 3 ? 4 : state.step === 2 ? state.boltN : 0;
    coverBolts.forEach((bolt, index) => { const order = BOLT_ORDER.indexOf(index as 0 | 1 | 2 | 3), position = this.boltLocal(order, 0.03); bolt.position.x = position.x; bolt.position.z = position.z;
      if (order < done) { bolt.scale.setScalar(1); bolt.position.y = 0.03; bolt.rotation.y = 0; }
      else if (focused && order === state.boltN && state.boltStage !== 'place') { const seat = this.seatAt ? Math.min(1, (now - this.seatAt) / 220) : 1; bolt.scale.setScalar(1); bolt.position.y = 0.068 - 0.038 * this.progress + (1 - seat) * 0.05; bolt.rotation.y = -this.wrenchAngle; }
      else bolt.scale.setScalar(0.001);
      this.onTop(bolt, focused && order === state.boltN && state.boltStage !== 'place');
    });
    holeMark.visible = focused && state.boltStage === 'place' && state.mode !== 'eval'; if (holeMark.visible) { holeMark.position.copy(this.boltLocal(state.boltN, 0.02)); holeMark.scale.setScalar(1 + 0.25 * Math.sin(now / 1000 * 6)); }
    for (const index of [0, 5]) { const part = this.parts[index]; this.onTop(part.real, focused && (part === this.draggedPart || part.returning || part.root.position.distanceTo(work.position) < 2.2)); }
    this.onTop(toolWs, true); this.onTop(holeMark, true);
    toolW.visible = focused && state.boltStage === 'turn';
    if (toolW.visible) {
      const position = this.boltLocal(state.boltN, 0), bolt = coverBolts[BOLT_ORDER[Math.min(3, state.boltN)]]; toolW.position.set(position.x, bolt.position.y - 0.03, position.z);
      const jitter = this.tickAt && now - this.tickAt < 60 ? (Math.random() - 0.5) * 0.06 : 0, click = this.clickAt && now - this.clickAt < 200 ? Math.sin((now - this.clickAt) / 12) * 0.12 * (1 - (now - this.clickAt) / 200) : 0, strain = this.turning && this.strainAt && now - this.strainAt < 120 ? this.resistance : 0;
      toolWs.rotation.y = -this.wrenchAngle + jitter + click - Math.atan2(position.z, position.x) - Math.PI / 2; toolWs.rotation.z = jitter * 0.3 + strain * 0.05 * Math.sin(now / 18); toolWs.position.y = -strain * 0.006;
    }
    if (this.clickAt) { const progress = (now - this.clickAt) / 500; if (progress < 1) { clickRing.position.copy(this.boltLocal(state.boltN > 3 ? 3 : state.boltN, 0.045)); clickRing.scale.setScalar(1 + progress * 5); clickRing.material.opacity = (1 - progress) * 0.9; } else clickRing.material.opacity = 0; }
    if (this.motorPopAt) { const progress = Math.min(1, (now - this.motorPopAt) / 450); motor.scale.setScalar(0.9 + 0.1 * (1 - Math.pow(1 - progress, 3))); if (progress >= 1) this.motorPopAt = 0; }
    if (!this.dragCover && cover.visible) cover.position.set(0, 0.36, 0);
    target.material.emissiveIntensity = this.near ? 2.5 : 0.6 + 0.4 * Math.sin(now / 1000 * 3);
    if (this.holding && (now - this.holdStartedAt) / 2000 >= 1) { this.holding = false; this.patch({ toolSafe: true }); this.sound.play('click'); }
    const m = this.mag; m.on = focused && this.focus > 0.5; m.zoom = 3 * this.zoom;
    if (m.on) { const point = work.localToWorld(new this.T.Vector3(0, 0.32, 0)).lerp(cover.localToWorld(this.boltLocal(Math.min(3, state.boltN), 0.03)), 0.45).project(this.camera); m.source.x += ((point.x + 1) / 2 * 1920 - m.source.x) * 0.25; m.source.y += ((1 - point.y) / 2 * 1080 - m.source.y) * 0.25; }
    const center = this.boltScreen(0.06), angle = this.turning ? this.turning.last + Math.PI / 2 : now / 1000 * 2.4, shakeElapsed = this.restShakeAt ? now - this.restShakeAt : 1e9;
    this.callbacks.onAssemblyFrame({ gaugeVisible: focused && state.boltStage === 'turn', torque: displayedTorque(this.progress), resistance: displayedResistance(this.progress), turnVisible: focused && state.boltStage === 'turn' && this.progress < 1 && state.mode !== 'eval', turnX: center.x - 130, turnY: center.y - 130, turnOpacity: this.turning ? 0.45 : 1, turnRotation: (now / 1000 * 70) % 360, dotX: 122 + Math.sin(angle) * 112, dotY: 122 - Math.cos(angle) * 112 * 0.62, holding: this.holding ? Math.min(1, (now - this.holdStartedAt) / 2000) : 0, restShake: shakeElapsed < 400 ? Math.round(Math.sin(shakeElapsed / 25) * 8 * (1 - shakeElapsed / 400)) : 0 });
  }
  render(renderer: Three.WebGLRenderer, scene: Three.Scene) {
    const m = this.mag; let hidden: Three.Object3D | null = null;
    if (m.on && this.draggedPart?.root.visible) { const point = this.draggedPart.root.getWorldPosition(new this.T.Vector3()).project(this.camera), x = (point.x + 1) / 2 * 1920, y = (1 - point.y) / 2 * 1080; if (Math.abs(x - m.source.x) < m.width / m.zoom / 2 && Math.abs(y - m.source.y) < m.height / m.zoom / 2) { hidden = this.draggedPart.root; hidden.visible = false; } }
    if (m.on) this.models.work.visible = false; renderer.render(scene, this.camera); this.models.work.visible = true; if (hidden) hidden.visible = true;
    if (!m.on) return;
    this.zoomCamera ??= this.camera.clone(); const camera = this.zoomCamera; camera.position.copy(this.camera.position); camera.quaternion.copy(this.camera.quaternion); camera.fov = this.camera.fov; camera.aspect = this.camera.aspect; camera.near = this.camera.near; camera.far = this.camera.far;
    const width = m.width / m.zoom, height = m.height / m.zoom; camera.setViewOffset(1920, 1080, m.source.x - width / 2, m.source.y - height / 2, width, height); camera.updateProjectionMatrix();
    const autoClear = renderer.autoClear; renderer.autoClear = false; renderer.setScissorTest(true); renderer.setScissor(m.x, 1080 - m.y - m.height, m.width, m.height); renderer.setViewport(m.x, 1080 - m.y - m.height, m.width, m.height); renderer.setClearColor(0x07090b, 1); renderer.clear(); renderer.render(scene, camera); renderer.setScissorTest(false); renderer.setViewport(0, 0, 1920, 1080); renderer.setClearColor(0, 0); renderer.autoClear = autoClear;
  }
  dispose() { this.timers.forEach(clearTimeout); this.sound.dispose(); this.canvas.removeEventListener('pointerdown', this.onDown, true); this.canvas.removeEventListener('pointermove', this.onMove, true); this.canvas.removeEventListener('pointerup', this.onUp, true); this.canvas.removeEventListener('pointercancel', this.onCancel, true); this.canvas.removeEventListener('wheel', this.onWheel, true); }
}
