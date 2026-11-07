import { shapeLabel } from './stepModel';
import type { StepBounds, StepModel, StepNode, StepShape } from './stepTypes';

export interface StepAssemblyPart {
  number: number;
  name: string;
  path: string;
  shapeIds: string[];
  bounds: StepBounds;
}

export function getStepAssemblyParts(model: StepModel): StepAssemblyPart[] {
  const { shapeList } = model.manifest;
  const parts: StepAssemblyPart[] = [];
  const assigned = new Set<string>();

  function addPart(name: string, shapes: StepShape[]) {
    const [first, ...rest] = shapes;
    if (!first) return;
    const bounds: StepBounds = { min: [...first.bounds.min], max: [...first.bounds.max] };
    for (const shape of rest) {
      for (let axis = 0; axis < 3; axis++) {
        bounds.min[axis] = Math.min(bounds.min[axis], shape.bounds.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], shape.bounds.max[axis]);
      }
    }
    parts.push({
      number: parts.length + 1,
      name: name.trim() || shapeLabel(first),
      path: first.path,
      shapeIds: shapes.map((shape) => shape.id),
      bounds,
    });
  }

  function visit(node: StepNode) {
    const shapes: StepShape[] = [];
    for (const index of node.meshes) {
      const shape = shapeList[index];
      if (shape && !assigned.has(shape.id)) {
        shapes.push(shape);
        assigned.add(shape.id);
      }
    }
    addPart(node.name, shapes);
    node.children.forEach(visit);
  }

  visit(model.root);
  for (const shape of shapeList) {
    if (!assigned.has(shape.id)) addPart(shape.name, [shape]);
  }
  return parts;
}
