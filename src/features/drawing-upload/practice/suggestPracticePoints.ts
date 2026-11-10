import { Vector3 } from 'three';
import type { StepAssemblyPart } from '../../drawing-upload-dev/model/stepAssemblyParts';
import { modelScale } from '../../drawing-upload-dev/model/stepModel';
import type { StepModel, StepPick } from '../../drawing-upload-dev/model/stepTypes';
import { ATTACHMENT_POINT_TOLERANCE } from './stepPracticeConfig';

function samplePart(model: StepModel, part: StepAssemblyPart) {
  const ids = new Set(part.shapeIds);
  const meshes = model.manifest.shapeList.filter((shape) => ids.has(shape.id)).map((shape) => model.meshList[shape.meshIndex]);
  const budget = Math.max(1, Math.floor(640 / meshes.length));
  const scale = modelScale(model.bounds);
  const center = new Vector3(...model.bounds.min).lerp(new Vector3(...model.bounds.max), 0.5);
  return meshes.flatMap((mesh) => {
    const samples: Vector3[] = [];
    const origin = new Vector3(...mesh.origin).sub(center).multiplyScalar(scale);
    const stride = Math.max(1, Math.ceil(mesh.position.length / 3 / budget));
    for (let index = 0; index < mesh.position.length; index += stride * 3) {
      samples.push(new Vector3().fromArray(mesh.position, index).multiplyScalar(scale).add(origin));
    }
    return samples;
  });
}

export function suggestMountPoints(model: StepModel, placement: StepAssemblyPart, support: StepAssemblyPart): {
  placement: StepPick; support: StepPick;
} | null {
  const from = samplePart(model, placement), to = samplePart(model, support);
  let bestDistance = ATTACHMENT_POINT_TOLERANCE ** 2;
  let best: { first: Vector3; second: Vector3 } | null = null;
  for (const first of from) {
    for (const second of to) {
      const distance = first.distanceToSquared(second);
      if (distance > bestDistance) continue;
      bestDistance = distance;
      best = { first, second };
    }
  }
  return best && {
    placement: { point: best.first.toArray(), normal: [0, 0, 1] },
    support: { point: best.second.toArray(), normal: [0, 0, 1] },
  };
}
