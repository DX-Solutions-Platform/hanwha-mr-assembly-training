import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';

/** 원본 교육장 완성품·작업 지그 모델. 형상·재질·좌표 그대로. */
export function createPracticeModels(T: ReferenceThree, world: Three.Group, workPosition: Three.Vector3) {
  const std = (color: number, metalness = 0.3, roughness = 0.6, emissive = 0) => new T.MeshStandardMaterial({ color, metalness, roughness, emissive });
  const cm = std, box = (w: number, h: number, d: number) => new T.BoxGeometry(w, h, d), cyl = (r: number, h: number, segments = 40) => new T.CylinderGeometry(r, r, h, segments);
  const mk = (geometry: Three.BufferGeometry, material: Three.MeshStandardMaterial, x: number, y: number, z: number, parent: Three.Group, castShadow = true) => {
    const mesh = new T.Mesh(geometry, material); mesh.position.set(x,y,z); mesh.castShadow = castShadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const Z = { work: workPosition };
    const prod = new T.Group(); world.add(prod);
    const secs = [new T.Group(), new T.Group(), new T.Group()]; secs.forEach(s => prod.add(s));
    mk(box(0.72, 0.04, 0.52), cm(0x2b4a63, 0.6, 0.45), 0, 0.02, 0, secs[2]); mk(cyl(0.17, 0.32), cm(0x2f5f86, 0.65, 0.35), 0, 0.2, 0, secs[2]); mk(cyl(0.2, 0.025), cm(0xc9d1d8, 0.9, 0.22), 0, 0.37, 0, secs[2]);
    mk(cyl(0.12, 0.16), cm(0x8a96a0, 0.85, 0.3), 0, 0.47, 0, secs[1]); mk(cyl(0.03, 0.14), cm(0xd5dbe0, 0.9, 0.2), 0, 0.6, 0, secs[1]); mk(cyl(0.14, 0.02), cm(0xb8913a, 0.85, 0.3), 0, 0.55, 0, secs[1]);
    mk(cyl(0.2, 0.03), cm(0xc9d1d8, 0.9, 0.22), 0, 0.685, 0, secs[0]); mk(cyl(0.16, 0.3), cm(0x3a3f46, 0.6, 0.4), 0, 0.85, 0, secs[0]); mk(cyl(0.18, 0.035), cm(0xaeb9c3, 0.85, 0.28), 0, 1.02, 0, secs[0]);
    secs.forEach((s, si) => (s.children as Three.Mesh[]).forEach((m, i) => { m.userData.base = m.position.clone(); m.userData.part = 'sec:' + si; m.userData.spread = (i - (s.children.length - 1) / 2) * 0.34; }));
    const sectionMaterials = secs.map(s => (s.children as Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>[]).map(m => m.material));
    // section panels
    const panels = secs.map((s, si) => { const g = new T.Group(); prod.add(g); const pm = new T.MeshBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }); const pl = new T.Mesh(new T.PlaneGeometry(1.5, 0.42), pm); g.add(pl); const em = new T.LineBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0 }); g.add(new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(1.5, 0.42)), em)); g.position.z = -0.35; g.userData = { pm, em, y: [0.86, 0.53, 0.2][si] }; return g; });
    // work zone (상부 in progress)
    const work = new T.Group(); work.position.copy(Z.work); world.add(work);
    const motor = new T.Group(); work.add(motor); mk(cyl(0.2, 0.03), cm(0xc9d1d8, 0.9, 0.22), 0, 0.015, 0, motor); mk(cyl(0.16, 0.3), cm(0x3a3f46, 0.6, 0.4), 0, 0.18, 0, motor); for (let i = 0; i < 7; i++) mk(cyl(0.175, 0.012), cm(0x4a5058, 0.6, 0.4), 0, 0.06 + i * 0.038, 0, motor);
    const cover = new T.Group(); work.add(cover); cover.position.set(0, 0.62, 0); mk(cyl(0.18, 0.035, 56), cm(0xaeb9c3, 0.85, 0.28), 0, 0, 0, cover); mk(cyl(0.11, 0.05, 48), cm(0x3c78a6, 0.7, 0.3), 0, 0.012, 0, cover); mk(cyl(0.03, 0.06, 24), cm(0x15181b, 0.3, 0.6), 0, 0.014, 0, cover);
    const coverBolts: Three.Mesh[] = []; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; mk(cyl(0.01, 0.04, 12), cm(0x15181b, 0.3, 0.6), Math.cos(a) * 0.145, 0.001, Math.sin(a) * 0.145, cover, false); const b = mk(cyl(0.02, 0.02, 6), cm(0xb8913a, 0.85, 0.3), Math.cos(a) * 0.145, 0.03, Math.sin(a) * 0.145, cover); b.scale.setScalar(0.001); coverBolts.push(b); }
    const target = mk(new T.TorusGeometry(0.18, 0.005, 8, 80), std(0xf37321, 0, 0.5, 0xf37321), 0, 0.345, 0, work, false); target.rotation.x = Math.PI / 2;
    work.scale.setScalar(0.001);
  const focusGroup = new T.Group(); [...work.children].forEach((child) => focusGroup.add(child)); work.add(focusGroup);
  const holeMark = new T.Mesh(new T.TorusGeometry(0.026, 0.004, 8, 32), new T.MeshBasicMaterial({ color: 0xf37321, toneMapped: false, transparent: true }));
  holeMark.rotation.x = Math.PI / 2; holeMark.visible = false; cover.add(holeMark);
  const toolW = new T.Group(), toolWs = new T.Group(); toolW.visible = false; cover.add(toolW); toolW.add(toolWs);
  mk(cyl(0.022, 0.04, 20), std(0xc9d1d8, 0.9, 0.22), 0, 0.03, 0, toolWs);
  mk(cyl(0.025, 0.016, 20), std(0xc9d1d8, 0.9, 0.22), 0, 0.056, 0, toolWs);
  mk(cyl(0.007, 0.2, 16), std(0xc9d1d8, 0.9, 0.22), 0.1, 0.058, 0, toolWs).rotation.z = Math.PI / 2;
  mk(cyl(0.011, 0.075, 16), std(0xb5352a, 0.1, 0.6), 0.17, 0.058, 0, toolWs).rotation.z = Math.PI / 2;
  const clickRing = new T.Mesh(new T.RingGeometry(0.03, 0.036, 40), new T.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0, side: T.DoubleSide, toneMapped: false, depthWrite: false }));
  clickRing.rotation.x = -Math.PI / 2; cover.add(clickRing);

  return { product: prod, sections: secs, sectionMaterials, panels, work, motor, cover, coverBolts, target, focusGroup, holeMark, toolW, toolWs, clickRing };
}
