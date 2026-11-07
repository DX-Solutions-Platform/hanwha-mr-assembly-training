import { Box3, BoxGeometry, ExtrudeGeometry, Group, Mesh, Path, Shape, Vector3, type BufferGeometry, type Material } from 'three';
import type { DraftSize } from './draftGeometry';
import type { StepStoolProfile } from './recognizeStepStool';

export function buildStepStool(profile: StepStoolProfile, size: DraftSize, material: Material) {
  const frame = new Group();
  const { stepHeight, boardThickness } = profile;
  const railHeight = .063, postWidth = .073, postDepth = .079;
  const side = .448, back = -.361, middle = .075, front = .436;
  const upperRail = 1 - boardThickness - railHeight / 2;
  const lowerRail = stepHeight - boardThickness - railHeight / 2;
  const mesh = (name: string, geometry: BufferGeometry, x: number, y: number, z: number) => {
    const part = new Mesh(geometry, material);
    part.name = name;
    part.position.set(x, y, z);
    frame.add(part);
    return part;
  };
  const box = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number) =>
    mesh(name, new BoxGeometry(width, height, depth), x, y, z);
  const post = (name: string, x: number, y0: number, z0: number, y1: number, z1: number) => {
    const dy = y1 - y0, dz = z1 - z0;
    const leg = box(name, postWidth, Math.hypot(dy, dz), postDepth, x, (y0 + y1) / 2, (z0 + z1) / 2);
    leg.rotation.x = Math.atan2(dz, dy);
  };
  for (const sign of [-1, 1]) {
    const name = sign < 0 ? 'left' : 'right', x = sign * side;
    post(name + '-rear-leg', x, .006, -.463, 1 - boardThickness, back);
    post(name + '-upright', x, lowerRail, middle, 1 - boardThickness, middle);
    post(name + '-front-leg', x, .006, .466, stepHeight - boardThickness, front);
    box(name + '-upper-side-rail', postWidth, railHeight, middle - back, x, upperRail, (middle + back) / 2);
    box(name + '-lower-side-rail', postWidth, railHeight, front + .42, x, lowerRail, (front - .42) / 2);
  }
  box('upper-front-rail', side * 2, railHeight, .053, 0, upperRail, middle);
  box('upper-rear-rail', side * 2, railHeight, .053, 0, upperRail, back);
  box('lower-rear-rail', side * 2, railHeight, .051, 0, lowerRail, -.41);
  box('lower-front-rail', side * 2, railHeight, .056, 0, lowerRail, front);
  box('lower-step', 1, boardThickness, .45, 0, stepHeight - boardThickness / 2, .275);

  const deck = new Shape();
  deck.moveTo(-.5, -.425); deck.lineTo(.5, -.425); deck.lineTo(.5, .13); deck.lineTo(-.5, .13); deck.closePath();
  const handle = new Path(), radius = .034, ends = .102, z = -.16;
  handle.moveTo(ends, z + radius);
  handle.absarc(ends, z, radius, Math.PI / 2, -Math.PI / 2, true);
  handle.lineTo(-ends, z - radius);
  handle.absarc(-ends, z, radius, -Math.PI / 2, Math.PI / 2, true);
  handle.closePath();
  deck.holes.push(handle);
  const top = new ExtrudeGeometry(deck, { depth: boardThickness, bevelEnabled: false, curveSegments: 16 });
  top.rotateX(Math.PI / 2);
  mesh('top-platform', top, 0, 1, 0);

  const bounds = new Box3().setFromObject(frame), span = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  frame.scale.set(size.width / span.x, size.height / span.y, size.depth / span.z);
  frame.position.copy(center.multiply(frame.scale).negate());
  return {
    frame,
    dispose: () => { for (const part of frame.children) if (part instanceof Mesh) part.geometry.dispose(); },
  };
}
