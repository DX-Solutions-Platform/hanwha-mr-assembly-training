import { getStepAssemblyParts } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel, VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';
import type { AssemblyAction } from '@/features/part-library/libraryTypes';

interface FlowMesh {
  t: 'mesh';
  p: VectorTuple;
  r: VectorTuple;
  s: VectorTuple;
  c: string;
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array | null;
}

export interface FlowProject {
  key: string;
  ko: string;
  code: string;
  size: VectorTuple;
  triangles?: number;
  geometryKey?: string;
  pieces: { part: string; p: VectorTuple; r: VectorTuple; sec: number }[];
  parts: Record<string, { ko: string; en?: string; pn: string; dim: string; src: string; col: string; metal: number; geo: FlowMesh[]; std?: boolean; fastenerPart?: boolean; tool?: string; actionSource?: 'library' | 'geometry' | 'name' | 'unmatched' }>;
  sections: { no: number; ko: string; idx: number[]; steps: FlowStep[]; sub?: string[]; subIdx?: number[]; final?: boolean }[];
}

export interface FlowStep {
  part: string;
  t: AssemblyAction;
  actionOverride?: AssemblyAction;
  extraAction?: boolean;
  isNew?: boolean;
  sub?: number;
  g?: string;
  txt?: string;
  tool?: string;
  toolK?: string;
  toolKo?: string;
  nm?: number | null;
  nmSrc?: string;
  nmEd?: boolean;
  toolOk?: boolean;
  contactReview?: string;
  pcs?: number[];
  off?: VectorTuple;
  del?: boolean;
  blank?: boolean;
  sw?: { ko: string; tool?: string };
}

const tuple = (value: (axis: number) => number): VectorTuple => [value(0), value(1), value(2)];
const round = (value: number) => Math.round(value * 10) / 10;
const clean = (value: string) => value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 120);
const color = (value: VectorTuple | null) => value
  ? '#' + value.map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255).toString(16).padStart(2, '0')).join('')
  : '#a4b1bb';

export function fromStepModel(model: StepModel): FlowProject {
  const { manifest, bounds } = model;
  const size = tuple((axis) => Math.max(1, bounds.max[axis] - bounds.min[axis]));
  const base = tuple((axis) => axis === 1 ? bounds.min[axis] : (bounds.min[axis] + bounds.max[axis]) / 2);
  const parts: FlowProject['parts'] = {};
  const pieces: FlowProject['pieces'] = [];
  const sections: FlowProject['sections'] = [];
  const byPath = new Map<string, number>();
  const byId = new Map(manifest.shapeList.map((shape) => [shape.id, shape]));
  const rootName = clean(model.root.name);
  for (const part of getStepAssemblyParts(model)) {
    const path = part.path.split(' / ').map(clean).filter((name) => name && name !== rootName);
    const assembly = path.length > 1 ? path[0] : '기본 조립';
    let sec = byPath.get(assembly);
    if (sec === undefined) {
      sec = sections.length;
      byPath.set(assembly, sec);
      sections.push({ no: sec + 1, ko: assembly, idx: [], steps: [] });
    }
    const name = clean(part.name) || '부품 ' + part.number;
    const key = 'part-' + part.number;
    const center = tuple((axis) => (part.bounds.min[axis] + part.bounds.max[axis]) / 2);
    const dimensions = tuple((axis) => Math.max(0.001, part.bounds.max[axis] - part.bounds.min[axis]));
    const geo = part.shapeIds.map((id): FlowMesh => {
      const mesh = model.meshList[byId.get(id)!.meshIndex];
      return {
        t: 'mesh', s: dimensions, p: tuple((axis) => mesh.origin[axis] - center[axis]), r: [0, 0, 0],
        c: color(mesh.color), positions: mesh.position, indices: mesh.index, normals: mesh.normal,
      };
    });
    parts[key] = {
      ko: name, en: '', pn: name, dim: dimensions.map(round).join(' × '), src: 'STEP',
      col: geo[0].c, metal: 1, geo,
    };
    sections[sec].idx.push(pieces.length);
    pieces.push({ part: key, p: tuple((axis) => center[axis] - base[axis]), r: [0, 0, 0], sec });
  }
  for (const section of sections) {
    const order = [...section.idx].sort((a, b) => pieces[a].p[1] - pieces[b].p[1]);
    section.steps = order.map(index => ({ part: pieces[index].part, t: 'place' }));
  }
  if (sections.length > 1) sections.push({
    no: sections.length + 1, ko: '최종 결합', idx: pieces.map((_, index) => index), steps: [], final: true,
  });
  const name = clean(manifest.name.replace(/\.(stp|step)$/i, '')) || 'STEP 조립품';
  return {
    key: manifest.sha256, ko: name, code: 'DX-ASM-' + manifest.sha256.slice(0, 8).toUpperCase(),
    size, triangles: manifest.shapeList.reduce((sum, shape) => sum + shape.triangleCount, 0), pieces, parts, sections,
  };
}

export function cloneFlowProject(project: FlowProject): FlowProject {
  const { key, ko, code, size, triangles, geometryKey } = project;
  return {
    key, ko, code, size, triangles, geometryKey,
    parts: { ...project.parts },
    pieces: project.pieces.map((piece) => ({ part: piece.part, p: piece.p, r: piece.r, sec: piece.sec })),
    sections: project.sections.map(({ no, ko, idx, steps, sub, subIdx, final }) => ({
      no, ko, final, idx: [...idx], steps: steps.map((step) => ({ ...step })),
      sub: sub?.slice(), subIdx: subIdx?.slice(),
    })),
  };
}

export function prepareFlowProject(source: FlowProject): FlowProject {
  const project = cloneFlowProject(source);
  const first = project.sections[0];
  if (project.key === 'shaper-reference' && first?.sub?.length === 4) {
    first.sub = first.sub.slice(0, 2).concat('1-3 프레임 결합 (베이스 · 상부 가이드)');
    first.subIdx = first.subIdx?.slice(0, 2);
    first.steps.forEach((step) => { if (step.sub === 3) step.sub = 2; });
  }
  project.sections.forEach((section) => {
    if (section.final) return;
    const sub = section.sub?.length ? section.sub : [section.no + '-1 ' + section.ko + ' 조립'];
    if (/합치기|결합/.test(sub.at(-1) ?? '')) return;
    const indices = section.subIdx ?? sub.slice(1).map((_, index) => Math.round(section.idx.length * (index + 1) / sub.length));
    section.subIdx = indices.slice(0, sub.length - 1).concat(section.idx.length);
    section.sub = sub.concat(section.no + '-' + (sub.length + 1) + ' ' + section.ko + ' 결합');
  });
  return project;
}
