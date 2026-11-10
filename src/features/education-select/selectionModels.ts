import type * as Three from 'three';
import type { ReferenceThree } from './referenceThree';
import type { SelectionKind } from './selectionProducts';

/** Demo 1.dc.html 330~357행. 도형·재질·좌표 원문, TypeScript 타입만 추가. */
export function createSelectionModels(T: ReferenceThree) {
    const M = (color: Three.ColorRepresentation, metal = 0.2, rough = 0.6) => new T.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
    const add = (g: Three.Group, geo: Three.BufferGeometry, m: Three.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const box = (w: number, h: number, d: number) => new T.BoxGeometry(w, h, d), cyl = (a: number, h: number, n = 32) => new T.CylinderGeometry(a, a, h, n);
    const build: Record<SelectionKind, (group: Three.Group) => void> = {
      pump: G => { const Mx = (color: Three.ColorRepresentation, metal: number, rough: number) => new T.MeshStandardMaterial({ color, metalness: metal, roughness: rough, envMapIntensity: 0.6 }); const paint = Mx(0x2e5d86, 0.45, 0.38), steel = Mx(0xc9d1d8, 1, 0.22), dark = Mx(0x1d2024, 0.55, 0.5), copper = Mx(0xc8743a, 1, 0.3), brass = Mx(0xd4a84a, 1, 0.28), acc = Mx(0xf37321, 0.3, 0.45), black = Mx(0x0f1113, 0.4, 0.6); const cyl = (a: number, b: number, h: number, n = 48) => new T.CylinderGeometry(a, b, h, n), box = (w: number, h: number, d: number) => new T.BoxGeometry(w, h, d); const add = (g: Three.Group, geo: Three.BufferGeometry, mm: Three.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(geo, mm); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; }; const L = (g: Three.Group, y: number, gap: number, gi: number) => { g.position.y = y; g.userData.gap = gap; g.userData.gi = gi; G.add(g); }; let g: Three.Group;
        g = new T.Group(); add(g, box(0.9, 0.05, 0.62), dark); [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(g, cyl(0.025, 0.025, 0.02, 6), steel, sx * 0.38, 0.035, sz * 0.24))); L(g, 0, 0, 0);
    g = new T.Group(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; add(g, box(0.02, 0.36, 0.06), paint, Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24, 0, -a, 0); } add(g, new T.TorusGeometry(0.235, 0.012, 8, 64), paint, 0, 0.18, 0, Math.PI / 2); add(g, new T.TorusGeometry(0.235, 0.012, 8, 64), paint, 0, -0.18, 0, Math.PI / 2); L(g, 0.22, 0.05, 0);
    g = new T.Group(); add(g, cyl(0.19, 0.19, 0.3), black); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(g, new T.TorusGeometry(0.03, 0.012, 8, 16), copper, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15, 0, -a, 0).scale.set(0.9, 4.2, 0.9); } L(g, 0.22, 0.38, 1);
    g = new T.Group(); add(g, cyl(0.025, 0.025, 0.62), steel); add(g, cyl(0.12, 0.12, 0.24), dark); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; add(g, box(0.012, 0.24, 0.02), copper, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, 0, -a, 0); } L(g, 0.24, 0.62, 1);
    g = new T.Group(); add(g, new T.TorusGeometry(0.05, 0.02, 12, 32), steel, 0, 0, 0, Math.PI / 2); add(g, cyl(0.03, 0.03, 0.03), brass); L(g, 0.56, 0.86, 1);
    g = new T.Group(); add(g, cyl(0.07, 0.07, 0.05, 6), acc); add(g, cyl(0.06, 0.06, 0.06), steel, 0, 0.05, 0); L(g, 0.62, 1.04, 2);
    g = new T.Group(); [-0.075, 0.075].forEach((x, j) => { add(g, cyl(0.07, 0.07, 0.07, 18), j ? brass : steel, x, 0, 0); add(g, cyl(0.016, 0.016, 0.12), steel, x, 0, 0); }); L(g, 0.7, 1.24, 2);
    g = new T.Group(); add(g, box(0.36, 0.14, 0.26), paint); add(g, cyl(0.04, 0.04, 0.1), steel, 0.2, 0, 0, 0, 0, Math.PI / 2); [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(g, cyl(0.012, 0.012, 0.15, 8), steel, sx * 0.15, 0, sz * 0.1))); L(g, 0.72, 1.44, 2);
    g = new T.Group(); add(g, box(0.3, 0.1, 0.22), dark); add(g, cyl(0.03, 0.03, 0.12), brass, 0.12, 0.07, 0.06); add(g, cyl(0.022, 0.022, 0.08), brass, -0.1, 0.06, -0.05); L(g, 0.84, 1.7, 3);
    g = new T.Group(); add(g, cyl(0.15, 0.17, 0.05), paint); add(g, cyl(0.05, 0.05, 0.06), acc, 0, 0.05, 0); add(g, new T.TorusGeometry(0.16, 0.008, 8, 64), acc, 0, 0.026, 0, Math.PI / 2); L(g, 0.92, 1.95, 3);
        G.rotation.y = -0.5; },
      car: g => { const body = M(0xb8bec6, 0.75, 0.3), glass = M(0x1c2530, 0.2, 0.1), tire = M(0x16181a, 0, 0.9), rim = M(0xc9d1d8, 0.9, 0.25), lamp = M(0xf37321, 0.2, 0.4);
        add(g, box(1.0, 0.16, 0.44), body, 0, 0.17, 0); add(g, box(0.52, 0.14, 0.4), glass, -0.04, 0.32, 0); add(g, box(0.5, 0.02, 0.41), body, -0.04, 0.4, 0);
        [-0.32, 0.32].forEach(x => [-0.23, 0.23].forEach(z => { add(g, cyl(0.1, 0.07, 24), tire, x, 0.1, z, Math.PI / 2); add(g, cyl(0.055, 0.075, 16), rim, x, 0.1, z, Math.PI / 2); }));
        [-0.15, 0.15].forEach(z => add(g, box(0.02, 0.04, 0.08), lamp, 0.505, 0.2, z)); },
      drone: g => { const shell = M(0x2a2d31, 0.4, 0.4), arm = M(0x5d6670, 0.6, 0.35), motor = M(0xc9d1d8, 0.9, 0.25), prop = new T.MeshStandardMaterial({ color: 0xe6eaec, transparent: true, opacity: 0.35, roughness: 0.3 }), acc = M(0xf37321, 0.3, 0.5);
        add(g, box(0.26, 0.08, 0.26), shell, 0, 0.18, 0); add(g, box(0.1, 0.06, 0.08), shell, 0.16, 0.13, 0); add(g, new T.SphereGeometry(0.035, 16, 12), M(0x0d1013, 0.2, 0.1), 0.2, 0.12, 0);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 0.36, z = Math.sin(a) * 0.36; add(g, box(0.36, 0.025, 0.04), arm, x / 2, 0.19, z / 2, 0, -a, 0); add(g, cyl(0.035, 0.06, 16), motor, x, 0.22, z); add(g, cyl(0.03, 0.01, 16), acc, x, 0.255, z); add(g, cyl(0.15, 0.004, 32), prop, x, 0.265, z); }
        [-1, 1].forEach(s => { add(g, box(0.02, 0.12, 0.02), arm, -0.06, 0.08, s * 0.1); add(g, box(0.02, 0.02, 0.3), arm, -0.06, 0.02, 0, 0, Math.PI / 2, 0); }); },
      stool: g => { const wood = M(0xdcc39a, 0, 0.75), woodD = M(0xc9ad80, 0, 0.8), steel = M(0xc9d1d8, 0.9, 0.25);
        [-0.2, 0.2].forEach(x => { add(g, box(0.035, 0.5, 0.045), wood, x, 0.25, -0.16, 0.06); add(g, box(0.035, 0.5, 0.045), wood, x, 0.25, 0.16, -0.06); add(g, box(0.03, 0.06, 0.34), woodD, x, 0.45, 0); add(g, box(0.03, 0.05, 0.38), woodD, x, 0.2, 0); });
        add(g, box(0.4, 0.04, 0.02), steel, 0, 0.45, -0.15); add(g, box(0.4, 0.022, 0.2), wood, 0, 0.23, 0.2); add(g, box(0.43, 0.024, 0.36), wood, 0, 0.51, 0); add(g, box(0.12, 0.026, 0.03), M(0x3a2e22, 0, 1), 0, 0.511, 0); }
    };
  return build;
}
