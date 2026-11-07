import { ExtrudeGeometry, Path, Shape } from 'three';
import { flangeHoleCenters, parseFlangeParameters, toFlangeDraft } from './flangeModel';
import type { FlangeValues } from './flangeTypes';

export function buildFlangeGeometry(values: FlangeValues) {
  const { issues } = parseFlangeParameters(toFlangeDraft(values).parameters);
  if (issues.length) throw new Error(issues.join(' '));
  const p = values.parameters;
  const outline = new Shape(); outline.absarc(0, 0, p.outerDiameter / 2, 0, Math.PI * 2, false);
  const bore = new Path(); bore.absarc(0, 0, p.innerDiameter / 2, 0, Math.PI * 2, true); outline.holes.push(bore);
  for (const center of flangeHoleCenters(p)) {
    const hole = new Path(); hole.absarc(center.x, center.y, p.holeDiameter / 2, 0, Math.PI * 2, true); outline.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(outline, { depth: p.thickness, steps: 1, bevelEnabled: false, curveSegments: 64 });
  geometry.translate(0, 0, -p.thickness / 2); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
