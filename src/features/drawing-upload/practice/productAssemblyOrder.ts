import type { StepAssemblyPart } from '../../drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel, StepNode } from '../../drawing-upload-dev/model/stepTypes';
import { groupInstructions, isBoltPart, type AssemblyInstruction } from '../instructions/assemblyInstructions';

interface Subassembly {
  id: number;
  name: string;
  units: AssemblyUnit[];
}
type AssemblyUnit = number | Subassembly;

interface PlannedStage {
  parts: number[];
  scope?: { id: number; name: string };
  join?: string;
  closesEnclosure?: boolean;
  orderRank: number;
}

const axes = [0, 1, 2] as const;
const span = (part: StepAssemblyPart, axis: number) => part.bounds.max[axis] - part.bounds.min[axis];
const isCover = (name: string) => !isBoltPart(name) && /\b(cover|lid)\b|덮개|뚜껑|커버/i.test(name.replace(/_/g, ' '))
  && !/\b(bottom|lower)\b|하단|하부/i.test(name.replace(/_/g, ' '));

function getEnclosures(parts: readonly StepAssemblyPart[]) {
  return parts.flatMap((cover) => {
    if (isBoltPart(cover.name)) return [];
    const named = isCover(cover.name);
    const axis = axes.reduce((smallest, next) => span(cover, next) < span(cover, smallest) ? next : smallest);
    const lateral = axes.filter((value) => value !== axis);
    const breadth = Math.min(...lateral.map((value) => span(cover, value)));
    if (breadth <= 0 || (!named && span(cover, axis) > breadth * 0.3)) return [];
    for (const base of parts) {
      if (base === cover || isCover(base.name) || (!named && span(base, axis) < span(cover, axis) * 1.12)) continue;
      const sameFootprint = lateral.every((value) => {
        const overlap = Math.min(base.bounds.max[value], cover.bounds.max[value]) - Math.max(base.bounds.min[value], cover.bounds.min[value]);
        return overlap >= Math.max(span(base, value), span(cover, value)) * (named ? 0.72 : 0.96);
      });
      if (!sameFootprint) continue;
      const tolerance = breadth * 0.02;
      const above = cover.bounds.max[axis] >= base.bounds.max[axis] + tolerance
        && cover.bounds.min[axis] > base.bounds.min[axis] + tolerance && cover.bounds.min[axis] <= base.bounds.max[axis] + tolerance;
      const below = cover.bounds.min[axis] <= base.bounds.min[axis] - tolerance
        && cover.bounds.max[axis] < base.bounds.max[axis] - tolerance && cover.bounds.max[axis] >= base.bounds.min[axis] - tolerance;
      if (above || below) return [{ cover, base, axis, lateral, above, tolerance }];
    }
    return [];
  });
}

function members(unit: AssemblyUnit): number[] {
  return typeof unit === 'number' ? [unit] : unit.units.flatMap(members);
}

export function planProductAssembly(model: StepModel, parts: readonly StepAssemblyPart[], instructions: readonly AssemblyInstruction[]) {
  const groups = groupInstructions(instructions);
  const order = new Map([...new Set([...groups.flatMap(({ steps }) => steps.map(({ partNumber }) => partNumber)), ...parts.map(({ number }) => number)])]
    .map((number, index) => [number, index]));
  const basesByPart = new Map(instructions.filter(({ isConfirmed }) => isConfirmed).map(({ partNumber, basePartNumber }) => [partNumber, basePartNumber]));
  const partByShape = new Map(parts.flatMap((part) => part.shapeIds.map((id) => [id, part.number] as const)));
  const assigned = new Set<number>();
  let nextScopeId = 1;

  function readNode(node: StepNode): AssemblyUnit[] {
    const units: AssemblyUnit[] = [];
    for (const index of node.meshes) {
      const shape = model.manifest.shapeList[index];
      const number = shape && partByShape.get(shape.id);
      if (number === undefined || assigned.has(number)) continue;
      assigned.add(number);
      units.push(number);
    }
    for (const child of node.children) {
      const nested = readNode(child);
      if (nested.length > 1) units.push({ id: nextScopeId++, name: child.name.trim() || '하위 조립품', units: nested });
      else units.push(...nested);
    }
    return units;
  }

  let root = [...readNode(model.root), ...parts.filter(({ number }) => !assigned.has(number)).map(({ number }) => number)];
  if (root.length === 1 && typeof root[0] !== 'number') root = root[0].units;
  if (groups.length > 1 && root.every((unit) => typeof unit === 'number')) {
    const enclosureParts = new Set(getEnclosures(parts).flatMap(({ base, cover }) => [base.number, cover.number]));
    const grouped = new Set<number>();
    const subassemblies = groups.flatMap(({ name, steps }) => {
      const numbers = new Set(steps.map(({ partNumber }) => partNumber));
      if (!/소조립|\bsubassembly\b/i.test(name) || numbers.size < 2 || steps.some(({ partNumber, isConfirmed, basePartNumber }) =>
        !isConfirmed || enclosureParts.has(partNumber) || isCover(parts[partNumber - 1].name) || (basePartNumber && !numbers.has(basePartNumber)))) return [];
      for (const number of numbers) grouped.add(number);
      return [{ id: nextScopeId++, name, units: [...numbers] }];
    });
    root = [...root.filter((unit) => !grouped.has(unit)), ...subassemblies];
  }

  const stages: PlannedStage[] = [];
  function plan(units: AssemblyUnit[], scope?: Subassembly) {
    const workArea = scope && { id: scope.id, name: scope.name };
    const direct = new Set(units.filter((unit) => typeof unit === 'number'));
    const enclosures = getEnclosures(units.flatMap(members).map((number) => parts[number - 1]))
      .filter(({ cover }) => direct.has(cover.number));
    const bases = new Set(enclosures.map(({ base }) => base.number));
    const covers = new Set([...enclosures.map(({ cover }) => cover.number), ...[...direct].filter((number) => isCover(parts[number - 1].name))]);
    function rank(unit: AssemblyUnit, unitParts: number[]) {
      if (typeof unit !== 'number') return unitParts.some((number) => bases.has(number)) ? 0 : 1;
      const part = parts[unit - 1];
      if (bases.has(unit)) return 0;
      if (covers.has(unit)) return 2;
      const reference = basesByPart.get(unit);
      if (reference && covers.has(reference)) return 3;
      if (isBoltPart(part.name) && enclosures.some(({ cover, axis, lateral, above, tolerance }) => {
        const surface = above ? cover.bounds.max[axis] : cover.bounds.min[axis];
        return part.bounds.min[axis] < surface + tolerance && part.bounds.max[axis] > surface - tolerance
          && lateral.every((value) => part.bounds.min[value] >= cover.bounds.min[value] - tolerance && part.bounds.max[value] <= cover.bounds.max[value] + tolerance);
      })) return 3;
      return 1;
    }
    const sorted = units.map((unit) => {
      const numbers = members(unit);
      return { unit, parts: numbers, rank: rank(unit, numbers) };
    })
      .sort((a, b) => a.rank - b.rank || Math.min(...a.parts.map((number) => order.get(number)!)) - Math.min(...b.parts.map((number) => order.get(number)!)));
    for (const { unit } of sorted) if (typeof unit !== 'number') plan(unit.units, unit);
    for (const { unit, parts: numbers, rank: priority } of sorted) {
      stages.push({ parts: numbers, scope: workArea, join: typeof unit !== 'number' ? unit.name : undefined,
        closesEnclosure: priority === 2, orderRank: priority });
    }
  }
  plan(root);
  return stages;
}
