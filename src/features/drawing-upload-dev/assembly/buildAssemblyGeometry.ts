import { CylinderGeometry, ExtrudeGeometry, Path, Shape } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildFlangeGeometry } from '../generate/buildFlangeGeometry';
import { FLANGE_EXAMPLE_VALUES, HOLE_CENTER_LIST } from './assemblyTemplate';
import type { AssemblyKind } from './assemblyTypes';

function hexagon(radius: number) {
  const shape = new Shape();
  for (let index = 0; index < 6; index++) {
    const angle = Math.PI / 6 + index * Math.PI / 3;
    if (!index) shape.moveTo(radius * Math.cos(angle), radius * Math.sin(angle)); else shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  shape.closePath(); return shape;
}
export function buildAssemblyGeometry(kind: AssemblyKind) {
  if (kind === 'flange') return buildFlangeGeometry(FLANGE_EXAMPLE_VALUES);
  if (kind === 'base') {
    const outline = new Shape(); outline.moveTo(-60, -60); outline.lineTo(60, -60); outline.lineTo(60, 60); outline.lineTo(-60, 60); outline.closePath();
    for (const [x, y, radius] of [[0, 0, 17], ...HOLE_CENTER_LIST.map(([x, y]) => [x, y, 4.5])]) {
      const hole = new Path(); hole.absarc(x, y, radius, 0, Math.PI * 2, true); outline.holes.push(hole);
    }
    const geometry = new ExtrudeGeometry(outline, { depth: 8, bevelEnabled: false, curveSegments: 48, steps: 1 }); geometry.translate(0, 0, -4); return geometry;
  }
  if (kind === 'nut') {
    const shape = hexagon(7.5), bore = new Path(); bore.absarc(0, 0, 4.2, 0, Math.PI * 2, true); shape.holes.push(bore);
    const geometry = new ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false, curveSegments: 32, steps: 1 }); geometry.translate(0, 0, -3); return geometry;
  }
  const shank = new CylinderGeometry(4, 4, 30, 32); shank.rotateX(Math.PI / 2); shank.translate(0, 0, -15);
  const unindexed = shank.toNonIndexed(), head = new ExtrudeGeometry(hexagon(6.5), { depth: 5, bevelEnabled: false, steps: 1 });
  const geometry = mergeGeometries([unindexed, head]); shank.dispose(); unindexed.dispose(); head.dispose();
  if (!geometry) throw new Error('볼트 형상 생성에 실패했습니다.');
  return geometry;
}
