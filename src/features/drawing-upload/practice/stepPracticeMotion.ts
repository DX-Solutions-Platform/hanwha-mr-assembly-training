import type { StepBounds, VectorTuple } from '../../drawing-upload-dev/model/stepTypes';
import { tighten } from '../../training-practice/assemblyMath';

export const PREPARATION_CENTER = 2.45;

export function getPreparationOffset(model: StepBounds, part: StepBounds, scale: number): VectorTuple {
  const partCenter = part.min.map((value, axis) => (value + part.max[axis] - model.min[axis] - model.max[axis]) * scale / 2);
  return [PREPARATION_CENTER - partCenter[0], -partCenter[1], (model.min[2] - part.min[2]) * scale - 0.02];
}

function gripFactor(progress: number) {
  const seating = Math.max(0, (progress - 0.74) / 0.26);
  return 1 - 0.5 * seating ** 1.6;
}

export function advancePracticeTurn(progress: number, delta: number) {
  return tighten(progress, delta * gripFactor(progress));
}

export function getPracticeResistance(progress: number) {
  return 1 - (1 - tighten(progress, 0).resistance) * gripFactor(progress);
}
