export interface AssemblyInstruction {
  id: string;
  partNumber: number;
  section: string;
  description: string;
  tool: string;
  torque: string;
  isHighlighted: boolean;
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

export const SHEET_COLUMNS = 4;
const ROWS_PER_PAGE = 4;

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
