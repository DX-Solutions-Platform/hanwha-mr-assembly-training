import type { StepAssemblyPart } from '../../drawing-upload-dev/model/stepAssemblyParts';
import { modelScale } from '../../drawing-upload-dev/model/stepModel';
import type { StepModel, StepPick, VectorTuple } from '../../drawing-upload-dev/model/stepTypes';
import { isBoltPart, type AssemblyInstruction } from '../instructions/assemblyInstructions';
import { getFastenerEnds, matchFastenerHead } from './fastenerHead';
import { planProductAssembly } from './productAssemblyOrder';
import { getPracticeTorque, type PracticeConfig, type PracticeTarget } from './stepPracticeConfig';
import { suggestMountPoints } from './suggestPracticePoints';

export type PracticeStage = {
  target: Required<PracticeTarget>;
  workArea?: { id: number; name: string };
  orderRank?: number;
} & ({ kind: 'mount'; support?: Required<PracticeTarget>; purpose?: string; closesEnclosure?: boolean }
  | { kind: 'join'; members: number[]; name: string }
  | { kind: 'fasten'; tool: string; torque: number; exampleTorque: boolean });

export interface PracticeSequence {
  initialPart?: number;
  stages: PracticeStage[];
}

export function getProductPlacementCaption(stage: PracticeStage, name: string, retrieved = false) {
  const pickup = `${retrieved ? '화면 위쪽의' : '오른쪽'} ${stage.kind === 'join' ? '조립품' : '부품'}(${name})을 집어`;
  if (stage.kind === 'fasten') return `${pickup} 화살표가 가리키는 체결 위치에 끼우세요.`;
  if (stage.kind === 'mount' && stage.closesEnclosure) return `${pickup} 본체의 주황색 덮개 윤곽에 맞춰 놓으세요.`;
  if (stage.kind === 'mount' && stage.support) return `${pickup} A 표시를 화살표가 가리키는 결합 위치에 맞추세요.`;
  return `${pickup} 중앙의 주황색 윤곽에 맞춰 놓으세요.`;
}

export function getPracticeInstalledParts(sequence: PracticeSequence, completedCount: number, workArea?: number | null) {
  const installed = new Map<number, number | null>();
  if (sequence.initialPart !== undefined) installed.set(sequence.initialPart, null);
  for (const stage of sequence.stages.slice(0, completedCount)) {
    const area = stage.workArea?.id ?? null;
    if (stage.kind === 'join') {
      for (const number of stage.members) {
        installed.delete(number);
        installed.set(number, area);
      }
    } else installed.set(stage.target.partNumber, area);
  }
  return [...installed].filter(([, area]) => workArea === undefined || area === workArea).map(([number]) => number);
}

export function moveProductPracticeStage(sequence: PracticeSequence, from: number, to: number, firstEditable: number) {
  const source = sequence.stages[from];
  if (!source || !sequence.stages[to] || sequence.initialPart !== undefined || from < firstEditable || to < firstEditable) return null;
  if (from === to) return sequence;
  const start = Math.min(from, to), end = Math.max(from, to);
  const area = source.workArea?.id;
  // Keep the work area and the planner's housing, interior, cover and cover-fastener boundaries.
  if (sequence.stages.slice(start, end + 1).some((step) => step.workArea?.id !== area || step.orderRank !== source.orderRank)) return null;
  const stages = [...sequence.stages];
  stages.splice(from, 1);
  stages.splice(to, 0, source);
  const installed = new Set(getPracticeInstalledParts(sequence, start, area ?? null));
  for (const step of stages.slice(start, end + 1)) {
    if (step.kind === 'mount' && step.support && !installed.has(step.support.partNumber)) return null;
    if (step.kind === 'fasten' && !installed.size) return null;
    for (const number of step.kind === 'join' ? step.members : [step.target.partNumber]) installed.add(number);
  }
  return { ...sequence, stages };
}

export function getPracticeGroupBounds(parts: readonly StepAssemblyPart[]) {
  const min = [...parts[0].bounds.min] as VectorTuple, max = [...parts[0].bounds.max] as VectorTuple;
  for (const { bounds } of parts.slice(1)) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], bounds.min[axis]);
      max[axis] = Math.max(max[axis], bounds.max[axis]);
    }
  }
  return { min, max };
}

export function createManualPracticeSequence(config: PracticeConfig, head: StepPick): PracticeSequence {
  return {
    initialPart: config.mounts[0].support.partNumber,
    stages: [
      ...config.mounts.map(({ placement, support, purpose }) => ({ kind: 'mount' as const, target: placement, support, purpose })),
      { kind: 'fasten', target: { partNumber: config.fastening.partNumber, pick: head }, tool: config.tool,
        torque: Number(config.torque), exampleTorque: config.exampleTorque },
    ],
  };
}

export function createProductPracticeSequence(model: StepModel, parts: readonly StepAssemblyPart[], instructions: readonly AssemblyInstruction[],
  manual?: PracticeConfig): PracticeSequence {
  const plan = planProductAssembly(model, parts, instructions);
  const installed = new Map<number, number | null>();
  const instructionByPart = new Map(instructions.filter((step) => step.isConfirmed).map((step) => [step.partNumber, step]));
  const manualMounts = new Map(manual?.mounts.map((mount) => [mount.placement.partNumber, mount]));
  const scale = modelScale(model.bounds);
  const stages: PracticeStage[] = [];

  for (const { parts: numbers, scope: workArea, join, closesEnclosure, orderRank } of plan) {
    const number = numbers[0];
    const part = parts[number - 1];
    const area = workArea?.id ?? null;
    const bounds = join ? getPracticeGroupBounds(numbers.map((member) => parts[member - 1])) : part.bounds;
    const point = bounds.min.map((value, axis) => (value + bounds.max[axis] - model.bounds.min[axis] - model.bounds.max[axis]) * scale / 2) as VectorTuple;
    const target = { partNumber: number, pick: { point, normal: [0, 0, 1] as VectorTuple } };
    if (join) {
      stages.push({ kind: 'join', members: numbers, name: join, target, workArea, orderRank });
      for (const member of numbers) installed.set(member, area);
      continue;
    }
    const instruction = instructionByPart.get(number);
    const manualMount = manualMounts.get(number);
    const savedBolt = manual?.fastening.partNumber === number ? manual : undefined;
    const torqueMatch = instruction?.torque.trim().match(/^(\d+(?:\.\d+)?)\s*N\s*[·⋅. ]?\s*m$/i);
    const torque = savedBolt ? Number(savedBolt.torque) : getPracticeTorque(torqueMatch?.[1]);
    const tool = savedBolt?.tool || instruction?.tool.trim();
    if (torque && tool && (savedBolt || isBoltPart(part.name)) && [...installed.values()].includes(area)) {
      const ends = getFastenerEnds(model, part);
      const head = savedBolt ? matchFastenerHead(ends, savedBolt.fastening.pick) : ends.length === 1 ? ends[0] : undefined;
      if (head) {
        stages.push({ kind: 'fasten', target: { partNumber: number, pick: head }, tool, torque, exampleTorque: savedBolt?.exampleTorque ?? false, workArea, orderRank });
        installed.set(number, area);
        continue;
      }
    }

    const stage: PracticeStage = { kind: 'mount', target, workArea, closesEnclosure, orderRank };
    if (manualMount && installed.get(manualMount.support.partNumber) === area) {
      stage.target = manualMount.placement;
      stage.support = manualMount.support;
      stage.purpose = manualMount.purpose;
    } else if (instruction?.basePartNumber && installed.get(instruction.basePartNumber) === area) {
      const base = parts[instruction.basePartNumber - 1];
      const points = suggestMountPoints(model, part, base);
      if (points) {
        stage.target.pick = points.placement;
        stage.support = { partNumber: base.number, pick: points.support };
      }
    }
    stages.push(stage);
    installed.set(number, area);
  }
  return { stages };
}
