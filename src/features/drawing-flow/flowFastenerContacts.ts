import type * as Three from 'three';
import type { VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';

type ThreeRuntime = typeof Three;
type Axis = 'x' | 'y' | 'z';
type Contact = { index: number; point: Three.Vector3; distance: number };
interface Piece { obj: Three.Object3D; home: Three.Vector3; q: Three.Quaternion; hardware: boolean }
interface Evidence { targets: Contact[]; candidates: number[] }

export function captureFastenerGeometry(T: ThreeRuntime, pieces: Piece[]) {
  const boxes: Three.Box3[] = [], surfaces: Three.Mesh[][] = [];
  pieces.forEach(({ obj, home, q, hardware }, i) => {
    const position = obj.position.clone(), rotation = obj.quaternion.clone();
    try {
      obj.position.copy(home);
      obj.quaternion.copy(q);
      obj.updateWorldMatrix(true, true);
      boxes[i] = new T.Box3().setFromObject(obj);
      surfaces[i] = [];
      if (!hardware) obj.traverse(child => {
        const mesh = child as Three.Mesh;
        if (!mesh.isMesh || mesh.userData.secLn || mesh.userData.secFill) return;
        const proxy = new T.Mesh(mesh.geometry, mesh.material);
        proxy.matrixWorld.copy(mesh.matrixWorld);
        surfaces[i].push(proxy);
      });
    } finally {
      obj.position.copy(position);
      obj.quaternion.copy(rotation);
      obj.updateWorldMatrix(true, true);
    }
  });

  const atHome = new Map<number, Evidence>();
  let changedKey = '', changed = new Map<number, Evidence>();
  const emptyOffsets = new Map<number, VectorTuple>();
  function evidence(index: number, offsets: ReadonlyMap<number, VectorTuple> = emptyOffsets): Evidence {
    if (!offsets.size) return read(atHome, index, offsets);
    const key = JSON.stringify([...offsets].sort(([a], [b]) => a - b));
    if (key !== changedKey) { changedKey = key; changed = new Map(); }
    return read(changed, index, offsets);
  }

  function read(cache: Map<number, Evidence>, index: number, offsets: ReadonlyMap<number, VectorTuple>) {
    const cached = cache.get(index);
    if (cached) return cached;
    const result = probe(index, offsets);
    cache.set(index, result);
    return result;
  }

  function probe(index: number, offsets: ReadonlyMap<number, VectorTuple>): Evidence {
    const shift = (i: number) => new T.Vector3(...(offsets.get(i) ?? [0, 0, 0]));
    const box = boxes[index]?.clone().translate(shift(index));
    if (!box || box.isEmpty()) return { targets: [], candidates: [] };
    const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
    const [axis, across, depth] = (['x', 'y', 'z'] as Axis[]).sort((a, b) => size[b] - size[a]);
    const margin = Math.max(.15, size[depth] * .14);
    const reach = box.clone().expandByScalar(margin);
    const candidates = boxes.flatMap((target, i) => {
      if (i === index || !surfaces[i].length) return [];
      const moved = offsets.has(i) ? target.clone().translate(shift(i)) : target;
      return moved.intersectsBox(reach) ? [i] : [];
    });
    const ray = new T.Raycaster(), origin = new T.Vector3(), direction = new T.Vector3();
    const contacts = new Map<number, Contact>();
    const shifts = new Map(candidates.map(i => [i, shift(i)]));
    const cast = (i: number, far: number) => {
      const offset = shifts.get(i)!;
      ray.set(origin.clone().sub(offset), direction);
      ray.far = far;
      const hit = ray.intersectObjects(surfaces[i], false)[0];
      if (!hit) return;
      const distance = hit.point.clone().add(offset).distanceToSquared(center);
      if (distance < (contacts.get(i)?.distance ?? Infinity)) contacts.set(i, { index: i, point: hit.point, distance });
      return hit.distance;
    };

    for (const [u, v] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      origin.copy(center);
      origin[across] += u * (size[across] * .5 + margin * .25);
      origin[depth] += v * (size[depth] * .5 + margin * .25);
      for (const sign of [1, -1]) {
        direction.set(0, 0, 0)[axis] = sign;
        origin[axis] = sign === 1 ? box.min[axis] - margin : box.max[axis] + margin;
        for (const i of candidates) cast(i, size[axis] + margin * 2);
      }
    }
    const axial = [...contacts.values()].sort((a, b) => a.distance - b.distance);
    if (axial.length >= 2) return { targets: axial.slice(0, 2), candidates };

    // A single threaded receiver can be a complete joint. Require a bore around the
    // fastener centerline at more than one depth, rather than an overlapping box.
    const boreTargets = candidates.filter(i => {
      let slices = 0;
      for (const along of [-.38, -.19, 0, .19, .38]) {
        origin.copy(center);
        origin[axis] += along * size[axis];
        const distances: number[] = [];
        for (const radial of [across, depth]) {
          for (const sign of [1, -1]) {
            direction.set(0, 0, 0)[radial] = sign;
            const distance = cast(i, size[radial] * .65 + margin);
            if (distance != null && distance > size[radial] * .1) distances.push(distance);
          }
        }
        if (distances.length === 4 && Math.min(...distances) >= Math.max(...distances) * .65) slices++;
      }
      return slices >= 2;
    });
    if (!boreTargets.length) return { targets: [], candidates };
    const verified = new Set([...boreTargets, ...axial.map(contact => contact.index)]);
    const targets = [...verified].map(i => contacts.get(i)!).sort((a, b) => a.distance - b.distance).slice(0, 2);
    return { targets, candidates };
  }
  return { boxes, evidence };
}
