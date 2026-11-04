import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';

/** Demo 1 HUD.dc.html: BOM 12개 모델·재질·슬롯·홀로그램 원문. */
export function createBomModels(T: ReferenceThree, world: Three.Group) {
  const S = (color: number, metalness: number, roughness: number) => new T.MeshStandardMaterial({ color, metalness, roughness });
  const mk = (geometry: Three.BufferGeometry, material: Three.Material, x: number, y: number, z: number, parent: Three.Group) => {
    const mesh = new T.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const box = (w: number, h: number, d: number) => new T.BoxGeometry(w, h, d), cyl = (radius: number, height: number, segments = 40) => new T.CylinderGeometry(radius, radius, height, segments);
  const P = { steel: S(0xc9d1d8, 0.9, 0.22), dark: S(0x3a3f46, 0.6, 0.4), fin: S(0x4a5058, 0.6, 0.4), blue: S(0x2f5f86, 0.65, 0.35), blue2: S(0x3c78a6, 0.65, 0.3), brass: S(0xb8913a, 0.85, 0.3), rub: S(0x1c1d1f, 0.1, 0.8), base: S(0x2b4a63, 0.6, 0.45), cover: S(0xaeb9c3, 0.85, 0.28), house: S(0x8a96a0, 0.85, 0.3), red: S(0xb5352a, 0.1, 0.6) };
      const tor = (r: number, t: number) => new T.TorusGeometry(r, t, 12, 48);
      const defs: ((group: Three.Group) => void)[] = [
        g => { mk(cyl(0.012, 0.12, 16), P.steel, 0, 0, 0, g); mk(cyl(0.024, 0.022, 6), P.dark, 0, 0.07, 0, g); g.rotation.z = 0.5; },
        g => { const m = mk(tor(0.07, 0.009), P.rub, 0, 0, 0, g); m.rotation.x = 1.15; },
        g => { const m = mk(tor(0.075, 0.007), P.brass, 0, 0, 0, g); m.rotation.x = 1.15; },
        g => { mk(cyl(0.05, 0.08, 32), P.steel, 0, 0, 0, g); mk(cyl(0.02, 0.082, 16), P.dark, 0, 0, 0, g); },
        g => { mk(box(0.11, 0.022, 0.022), P.steel, 0, 0, 0, g); g.rotation.y = 0.6; },
        g => { const h = mk(cyl(0.011, 0.32, 16), P.steel, 0, 0, 0, g); h.rotation.z = Math.PI / 2; const gr = mk(cyl(0.016, 0.1, 16), P.red, 0.13, 0, 0, g); gr.rotation.z = Math.PI / 2; mk(cyl(0.024, 0.024, 20), P.steel, -0.17, 0, 0, g); g.rotation.set(0.5, 0.4, 0.2); },
        g => { mk(cyl(0.12, 0.22), P.blue, 0, 0, 0, g); for (let i = 0; i < 4; i++) mk(cyl(0.135, 0.012), P.blue2, 0, -0.08 + i * 0.05, 0, g); mk(cyl(0.14, 0.018), P.steel, 0, 0.115, 0, g); },
        g => { mk(cyl(0.1, 0.13), P.house, 0, 0, 0, g); mk(cyl(0.115, 0.016), P.brass, 0, 0.07, 0, g); },
        g => { mk(cyl(0.02, 0.32, 20), P.steel, 0, 0, 0, g); mk(cyl(0.04, 0.05, 24), P.steel, 0, 0.16, 0, g); g.rotation.z = 0.35; },
        g => { mk(cyl(0.12, 0.22), P.dark, 0, 0, 0, g); for (let i = 0; i < 6; i++) mk(cyl(0.13, 0.01), P.fin, 0, -0.09 + i * 0.036, 0, g); mk(cyl(0.14, 0.02), P.steel, 0, -0.115, 0, g); },
        g => { mk(cyl(0.15, 0.028, 48), P.cover, 0, 0, 0, g); mk(cyl(0.09, 0.04, 40), P.blue2, 0, 0.01, 0, g); g.rotation.x = 0.5; },
        g => { mk(box(0.3, 0.03, 0.22), P.base, 0, 0, 0, g); mk(cyl(0.06, 0.02), P.steel, 0, 0.025, 0, g); g.rotation.x = 0.25; }
      ];
  const holoMaterial = new T.MeshBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.14, depthWrite: false });
  const edgeMaterial = new T.LineBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0.9, toneMapped: false });
  const ringMaterial = new T.MeshBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false, toneMapped: false });
  const parts = defs.map((build, index) => {
    const row = index < 6 ? 0 : 1, column = index % 6;
    const slot = new T.Vector3(-1.05 + column * 0.42, row ? 1.13 : 1.6, -2.75 + (row ? 0 : -0.15));
    const root = new T.Group(); root.position.copy(slot); world.add(root);
    const spin = new T.Group(); root.add(spin);
    const real = new T.Group(); build(real); spin.add(real);
    const bounds = new T.Box3().setFromObject(real), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
    const fit = (row ? 0.3 : 0.2) / Math.max(size.x, size.y, size.z); real.scale.setScalar(fit); real.position.copy(center).multiplyScalar(-fit);
    const hologram = new T.Group(); hologram.scale.copy(real.scale); hologram.position.copy(real.position); hologram.rotation.copy(real.rotation); spin.add(hologram);
    real.traverse((object) => {
      const mesh = object as Three.Mesh; if (!mesh.isMesh) return;
      const copy = new T.Mesh(mesh.geometry, holoMaterial); copy.position.copy(mesh.position); copy.rotation.copy(mesh.rotation); copy.scale.copy(mesh.scale); hologram.add(copy);
      copy.add(new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 25), edgeMaterial));
    });
    real.visible = false;
    const ring = new T.Mesh(new T.RingGeometry(0.12, 0.126, 48), ringMaterial); ring.rotation.x = -Math.PI / 2; ring.position.y = -(row ? 0.19 : 0.14); root.add(ring);
    const hit = new T.Mesh(new T.BoxGeometry(0.34, 0.34, 0.34), new T.MeshBasicMaterial({ visible: false })); hit.userData.bom = index; root.add(hit);
    root.visible = false;
    const gi = index < 6 ? 6 + index : index - 6, gx = (gi % 6 - 2.5) * 0.36, gz = (Math.floor(gi / 6) - 0.5) * 0.46, angle = -0.5;
    const destination = new T.Vector3(Math.sin(0.5) * 4.3, 0.906, -Math.cos(0.5) * 4.3).add(new T.Vector3(-0.15 + gx * Math.cos(angle) + gz * Math.sin(angle), row ? 0.14 : 0.12, 0.25 - gx * Math.sin(angle) + gz * Math.cos(angle)));
    const key = index === 0 ? 'tray' : index === 3 ? 'coup' : index === 5 ? 'wrench' : `bom:${index}`;
    real.traverse((object) => { if ((object as Three.Mesh).isMesh) object.userData.part = key; });
    return { root, spin, real, hologram, ring, hit, slot, row, destination, key, returning: false, inTray: false, scaleFactor: null as number | null };
  });
  return { parts, holoMaterial, ringMaterial };
}
