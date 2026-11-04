import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { createBomModels } from '@/features/training-preparation/bomModels';
import { createPracticeModels } from './practiceModels';
import { PracticeNavigation } from './practiceNavigation';
import type { PracticeCallbacks, PracticeState } from './practiceTypes';
import { AssemblyInteraction } from './assemblyInteraction';

type BomPart = ReturnType<typeof createBomModels>['parts'][number];
type SceneState = PracticeState & { phase: string; flyStartedAt: number };
const smooth = (value: number) => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };

/** BOM와 같은 world/camera에서 partsFly → main을 이어 그립니다. */
export class PracticeScene {
  readonly assembly: AssemblyInteraction;
  private models: ReturnType<typeof createPracticeModels>;
  private navigation: PracticeNavigation;
  private separation = 0;
  private outlines: { key: string; mesh: Three.Mesh }[] = [];

  constructor(private T: ReferenceThree, canvas: HTMLCanvasElement, private camera: Three.PerspectiveCamera, private world: Three.Group,
    private parts: BomPart[], private pads: Three.Group[], private getState: () => SceneState, private callbacks: PracticeCallbacks) {
    const workPosition = new T.Vector3(0, 0.906, -3.4); this.models = createPracticeModels(T, world, workPosition);
    const pickables: Three.Mesh[] = [];
    const outlineMaterial = new T.MeshBasicMaterial({ color: 0xf37321, side: T.BackSide });
    for (const [key, group] of Object.entries({ motor: this.models.motor, cover: this.models.cover })) {
      const meshes: Three.Mesh[] = []; group.traverse((object) => { if ((object as Three.Mesh).isMesh) meshes.push(object as Three.Mesh); });
      meshes.forEach((mesh) => {
        mesh.userData.part = key; pickables.push(mesh);
        const outline = new T.Mesh(mesh.geometry, outlineMaterial); outline.scale.setScalar(1.07); outline.visible = false; outline.raycast = () => {}; mesh.add(outline); this.outlines.push({ key, mesh: outline });
      });
    }
    this.models.sections.forEach((group) => group.children.forEach((mesh) => pickables.push(mesh as Three.Mesh)));
    parts.forEach((part) => part.real.traverse((object) => { if ((object as Three.Mesh).isMesh) pickables.push(object as Three.Mesh); }));
    this.assembly = new AssemblyInteraction(T, canvas, camera, world, this.models, parts, pickables, getState, callbacks);
    this.navigation = new PracticeNavigation(T, canvas, camera, world, this.models.work, pads[0], pads[2], pickables, getState, { ...callbacks, onSelectPart: (key) => this.assembly.select(key) });
  }

  destination(part: BomPart) {
    const base = this.pads[2].position.clone().sub(this.navigation.materialOffset);
    return part.destination.clone().sub(base).applyAxisAngle(new this.T.Vector3(0, 1, 0), this.navigation.materialRotation).add(base).add(this.navigation.materialOffset);
  }

  step(now: number, dt: number) {
    const state = this.getState(), main = state.phase === 'main', flying = state.phase === 'placing', active = main || flying;
    const { product, sections, sectionMaterials, panels, work, motor, cover, target } = this.models;
    product.visible = active; work.visible = active;
    if (!active) return;
    const elapsed = (now - state.flyStartedAt) / 1000;
    const opacity = main ? 1 : smooth(elapsed / 1); product.visible = opacity > 0.005;
    this.separation += ((main && state.view === -1 ? 1 : 0) - this.separation) * Math.min(1, dt * 6);
    product.position.set(Math.sin(-0.55) * 5, 0.906, -Math.cos(-0.55) * 5); product.scale.setScalar(0.62 + 0.12 * this.separation); product.rotation.y = 0.55;
    sections.forEach((section, index) => { section.position.y = [0.4, 0.2, 0][index] * this.separation; });
    const blink = 0.5 + 0.5 * Math.sin(now / 1000 * 4.5);
    sectionMaterials.forEach((materials, index) => materials.forEach((material) => {
      if (material.opacity !== opacity || material.transparent !== (opacity < 1)) { material.transparent = opacity < 1; material.opacity = opacity; material.depthWrite = opacity >= 1; material.needsUpdate = true; }
      material.emissive.setHex(index < state.section && main ? 0x0d3a34 : 0xf37321);
      material.emissiveIntensity = main && index === Math.min(state.section, 2) && state.section < 3 ? 0.35 * blink : index < state.section && main ? 0.6 : 0;
    }));
    panels.forEach((panel, index) => { panel.position.y = panel.userData.y + [0.4, 0.2, 0][index] * this.separation; panel.userData.pm.opacity = 0.06 * this.separation * 0.9; panel.userData.em.opacity = 0.7 * this.separation * 0.9; });
    work.scale.setScalar(main ? 1 : Math.max(0.001, smooth((elapsed - 0.9) / 0.6)));
    const upper = state.section === 0;
    motor.visible = !(upper && state.step === 0); cover.visible = !upper || state.step >= 2;
    target.visible = upper && state.step < 2 && main; target.position.y = state.step === 0 ? 0.02 : 0.345; target.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(now / 1000 * 3);
    this.outlines.forEach((outline) => { outline.mesh.visible = outline.key === state.selectedPart; });
    if (main) {
      this.navigation.update(dt);
      const targetRotation = [-0.55, 0, 0.5][state.view + 1]; this.world.rotation.y += (targetRotation - this.world.rotation.y) * Math.min(1, dt * 7);
      const used = [state.step >= 3 || state.section > 0, false, false, false, false, false, false, false, false, state.step >= 1 || state.section > 0, state.step >= 2 || state.section > 0, false];
      if (state.section === 0 && state.step === 2 && state.boltStage === 'turn') used[5] = true;
      const needed = state.section === 0 ? state.step === 0 ? 9 : state.step === 1 ? 10 : state.step === 2 ? state.boltStage === 'place' ? 0 : state.boltStage === 'tool' ? 5 : -1 : -1 : -1;
      this.parts.forEach((part, index) => {
        part.root.visible = !used[index] && index !== 5;
        const home = this.destination(part);
        part.inTray = state.section === 0 && state.step === 2 && (index === 0 || index === 5) && !(index === 5 && state.boltStage === 'turn');
        if (part.inTray) {
          const screenX = index === 0 ? 730 : 1110, screenY = 915, direction = new this.T.Vector3(screenX / 960 - 1, -(screenY / 540 - 1), 0.5).unproject(this.camera).sub(this.camera.position).normalize();
          home.copy(this.world.worldToLocal(this.camera.position.clone().addScaledVector(direction, 2.4)));
        } else if (state.mode !== 'eval' && index === needed && part !== this.assembly.draggedPart && !part.returning) home.y += 0.03 + Math.sin(now / 1000 * 3) * 0.02;
        part.ring.visible = !part.inTray;
        if (part !== this.assembly.draggedPart) {
          if (part.returning) { part.root.position.lerp(home, Math.min(1, dt * 8)); if (part.root.position.distanceTo(home) < 0.004) part.returning = false; }
          else part.root.position.copy(home);
        }
        part.root.rotation.y = this.navigation.materialRotation;
        const targetScale = this.assembly.getPartScale(part, index); part.scaleFactor = part.scaleFactor === null ? targetScale : part.scaleFactor + (targetScale - part.scaleFactor) * Math.min(1, dt * 10);
        part.root.scale.setScalar((part.row ? 0.85 : 1.25) * part.scaleFactor);
        part.real.visible = true; part.hologram.visible = state.mode !== 'eval' && index === needed && (0.5 + 0.5 * Math.sin(now / 1000 * 5)) > 0.35;
        part.spin.rotation.y = 0.4;
      });
      this.assembly.update(now, dt);
    } else { this.world.rotation.y = 0; this.assembly.update(now, dt); }
  }

  afterFrame() {
    const state = this.getState(), main = state.phase === 'main';
    const place = (point: Three.Vector3 | null, opacity: number, dx = 0, dy = 0, alignRight = true) => {
      if (!point || !main) return { x: 0, y: 0, opacity: 0, alignRight };
      point.project(this.camera); return { x: (point.x + 1) / 2 * 1920 + dx, y: (1 - point.y) / 2 * 1080 + dy, opacity: point.z > 1 ? 0 : opacity, alignRight };
    };
    this.world.updateMatrixWorld(true); this.camera.updateMatrixWorld(true);
    const key = state.selectedPart, part = this.parts.find((item) => item.key === key); let point: Three.Vector3 | null = null;
    if (part) { point = part.root.getWorldPosition(new this.T.Vector3()); if (!(state.section === 0 && state.step === 2)) { point.x -= 0.12; point.y += 0.08; } }
    else if (key === 'motor' || key === 'cover') { point = this.models[key].getWorldPosition(new this.T.Vector3()); point.x -= 0.25; point.y += 0.12; }
    else if (key?.startsWith('sec:')) { const index = Number(key.slice(4)); point = this.models.sections[index].localToWorld(new this.T.Vector3(-0.26, [0.86, 0.53, 0.2][index], 0)); }
    const focused = state.section === 0 && state.step === 2, wrench = !!part && state.step === 2 && part.key === 'wrench';
    this.callbacks.onInfoPosition(place(focused && !part ? null : point, 1, part && state.step === 2 ? wrench ? 60 : -60 : -10, part && state.step === 2 ? -20 : 0, wrench));
    this.models.sections.forEach((section, index) => { const anchor = section.localToWorld(new this.T.Vector3(0.24, [0.86, 0.53, 0.2][index], 0)); this.callbacks.onSectionPosition(index, place(anchor, this.separation > 0.05 ? this.separation : 0, 10)); });
    const zone = this.navigation.activeZone;
    if (main && state.isLayoutEditing && zone) {
      const position = zone === 'work' ? this.models.work.position : this.pads[2].position, angle = zone === 'work' ? this.navigation.workRotation : this.navigation.materialRotation;
      const anchor = this.world.localToWorld(position.clone().add(new this.T.Vector3(0, 0.05, 0)));
      this.callbacks.onCoordinates(zone === 'work' ? '작업 지그' : '자재 구역', `X ${position.x.toFixed(2)} · Z ${position.z.toFixed(2)} m · ${Math.round(((angle * 180 / Math.PI) % 360 + 360) % 360)}°`, place(anchor, 1, 30, -70));
    } else this.callbacks.onCoordinates('', '', place(null, 0));
  }
  render(renderer: Three.WebGLRenderer, scene: Three.Scene) { if (this.getState().phase === 'main') this.assembly.render(renderer, scene); else renderer.render(scene, this.camera); }
  dispose() { this.navigation.dispose(); this.assembly.dispose(); }
}
