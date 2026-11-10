import { isScrewOrBolt } from '../../drawing-upload-dev/model/fastenerName';
import type { StepAssemblyPart } from '../../drawing-upload-dev/model/stepAssemblyParts';
import type { StepBounds } from '../../drawing-upload-dev/model/stepTypes';
import type { DrawingTarget } from './renderPartDrawing';

export interface AssemblyInstruction {
  id: string;
  partNumber: number;
  basePartNumber?: number | null;
  section: string;
  description: string;
  tool: string;
  torque: string;
  isHighlighted: boolean;
  isConfirmed: boolean;
}

export function createInstructionDrafts(parts: readonly StepAssemblyPart[]): AssemblyInstruction[] {
  return parts.map((part) => {
    const name = part.name.replace(/_/g, ' ');
    const isTorx = /\btorx\b/i.test(name);
    const isNut = /\bnut\b|너트/i.test(name);
    const isWasher = /\bwasher\b|와셔/i.test(name);
    const isWiring = /\b(wire|cable|harness)\b|배선|전선|케이블/i.test(name);
    const isBoard = /\bpcb\b|기판/i.test(name);

    let description = '부품을 조립도에 표시된 위치와 방향에 맞춰 놓고, 작업지시서에 지정된 방식으로 장착하세요.';
    let tool = '장착 방식에 맞는 공구 확인';
    let torque = '체결 여부 확인';
    if (isScrewOrBolt(name)) {
      const bit = isTorx ? 'Torx 비트' : /\bphillips\b/i.test(name) ? '십자 비트' : '';
      const toolInstruction = bit ? `규격에 맞는 ${bit}` : '작업지시서에 지정된 공구';
      description = `체결 부품을 조립도에 표시된 위치에 넣고, ${toolInstruction}로 체결하세요.`;
      tool = bit ? `${bit} (규격 확인)` : '규격에 맞는 체결 공구';
      torque = '작업지시서 확인 (N·m)';
    } else if (isNut) {
      description = '너트를 지정된 체결부에 끼우고, 작업지시서에 지정된 공구로 체결하세요.';
      tool = '렌치 또는 소켓 (규격 확인)';
      torque = '작업지시서 확인 (N·m)';
    } else if (isWasher) {
      description = '와셔를 조립도에 표시된 위치에 끼우세요.';
      tool = '손으로 배치 (초안)';
      torque = '해당 없음 (와셔 배치)';
    } else if (isWiring) {
      description = '배선을 작업지시서에 표시된 경로로 배치하고, 끝단을 지정된 연결부에 연결하세요.';
      tool = '단자·커넥터 공구 확인';
      torque = '단자 체결 규격 확인';
    } else if (isBoard) {
      description = '기판을 조립도에 표시된 위치와 방향에 맞춰 놓고, 작업지시서에 지정된 방식으로 고정하세요.';
      tool = '기판 고정 공구 확인';
      torque = '기판 체결부 규격 확인';
    }

    return {
      id: `part-${part.number}`, partNumber: part.number, section: '기본 조립', description,
      tool, torque, isHighlighted: false, isConfirmed: false,
    };
  });
}

export function getInstructionDrawingTargets(part: StepAssemblyPart, base: StepAssemblyPart): {
  before: DrawingTarget; after: DrawingTarget;
} {
  const bounds: StepBounds = { min: [...part.bounds.min], max: [...part.bounds.max] };
  for (let axis = 0; axis < 3; axis++) {
    bounds.min[axis] = Math.min(bounds.min[axis], base.bounds.min[axis]);
    bounds.max[axis] = Math.max(bounds.max[axis], base.bounds.max[axis]);
  }
  return {
    before: { bounds, shapeIds: base.shapeIds },
    after: { bounds, shapeIds: [...base.shapeIds, ...part.shapeIds], highlightShapeIds: part.shapeIds },
  };
}

export function nextUnconfirmedInstruction(instructions: readonly AssemblyInstruction[], afterId: string) {
  const index = instructions.findIndex((step) => step.id === afterId);
  if (index < 0) return instructions.find((step) => !step.isConfirmed);
  return instructions.slice(index + 1).find((step) => !step.isConfirmed)
    ?? instructions.slice(0, index).find((step) => !step.isConfirmed);
}

export function groupInstructions(instructions: readonly AssemblyInstruction[]) {
  const groups = new Map<string, AssemblyInstruction[]>();
  for (const instruction of instructions) {
    const group = groups.get(instruction.section);
    if (group) group.push(instruction);
    else groups.set(instruction.section, [instruction]);
  }
  return Array.from(groups, ([name, steps], index) => ({ name, steps, number: index + 1 }));
}

export function moveInstruction(instructions: AssemblyInstruction[], id: string, direction: -1 | 1) {
  const index = instructions.findIndex((instruction) => instruction.id === id);
  if (index < 0) return instructions;
  const section = instructions[index].section;
  const peerIndexes = instructions.flatMap((instruction, position) => instruction.section === section ? [position] : []);
  const target = peerIndexes[peerIndexes.indexOf(index) + direction];
  if (target === undefined) return instructions;
  const next = [...instructions];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const SHEET_COLUMNS = 2;
const ROWS_PER_PAGE = 3;

export function paginateInstructions(instructions: readonly AssemblyInstruction[]) {
  const groups = groupInstructions(instructions);
  type PageSection = (typeof groups)[number] & { offset: number };
  const pages: PageSection[][] = [];
  let current: PageSection[] = [];
  let rowsLeft = ROWS_PER_PAGE;

  for (const group of groups) {
    for (let offset = 0; offset < group.steps.length;) {
      const steps = group.steps.slice(offset, offset + rowsLeft * SHEET_COLUMNS);
      current.push({ ...group, steps, offset });
      offset += steps.length;
      rowsLeft -= Math.ceil(steps.length / SHEET_COLUMNS);
      if (!rowsLeft) {
        pages.push(current);
        current = [];
        rowsLeft = ROWS_PER_PAGE;
      }
    }
  }
  if (current.length) pages.push(current);
  return pages;
}
