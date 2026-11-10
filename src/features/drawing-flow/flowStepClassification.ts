import { isScrewOrBolt } from '@/features/drawing-upload-dev/model/fastenerName';
import { normalizeLibraryNumber, type AssemblyAction, type LibraryMatch } from '@/features/part-library/libraryTypes';
import type { FlowProject, FlowStep } from './flowProject';

export interface CatalogPart { code: string; std?: boolean; type?: string; }
type RememberedActions = Record<string, { action: AssemblyAction; projectKey: string }>;

async function digest(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function flowGeometryKey(project: FlowProject) {
  const meshes = await Promise.all(Object.values(project.parts).map(part => Promise.all(part.geo.map(async mesh => {
    const positions = new Uint8Array(mesh.positions.buffer, mesh.positions.byteOffset, mesh.positions.byteLength);
    const indices = new Uint8Array(mesh.indices.buffer, mesh.indices.byteOffset, mesh.indices.byteLength);
    const bytes = new Uint8Array(positions.length + indices.length);
    bytes.set(positions);
    bytes.set(indices, positions.length);
    return [mesh.p, positions.length, await digest(bytes)];
  }))));
  return digest(new TextEncoder().encode(JSON.stringify([project.pieces.map(piece => [piece.part, piece.p]), meshes])));
}

function storageKey(geometryKey: string) {
  return 'hanwha-drawing-flow.v1.step-actions.' + geometryKey;
}

function readActions(geometryKey: string): RememberedActions {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(geometryKey)) ?? '{}');
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {}
  return {};
}

export function rememberFlowStepActions(project: FlowProject, plan: FlowStep[][]) {
  const { geometryKey, key } = project;
  if (!geometryKey) return;
  const saved = readActions(geometryKey);
  const next = Object.fromEntries(Object.entries(saved).filter(([, row]) => row?.projectKey !== key));
  const rows = plan.flat().filter(step => !step.del && !step.blank);
  const count = new Map<string, number>();
  for (const step of rows) count.set(step.part, (count.get(step.part) ?? 0) + 1);
  for (const step of rows) {
    if (step.actionOverride && count.get(step.part) === 1 && !step.extraAction) {
      next[step.part] = { action: step.actionOverride, projectKey: key };
    }
  }
  try {
    if (Object.keys(next).length) localStorage.setItem(storageKey(geometryKey), JSON.stringify(next));
    else localStorage.removeItem(storageKey(geometryKey));
  } catch {}
}

export function classifyFlowSteps(project: FlowProject, catalog: CatalogPart[], registered: Map<string, LibraryMatch>) {
  const byCode = new Map(catalog.map(part => [normalizeLibraryNumber(part.code), part]));
  const saved = project.geometryKey ? readActions(project.geometryKey) : {};
  const fastenerTypes = new Set(['cap', 'csk', 'grub', 'nut', 'dome']);
  for (const [key, part] of Object.entries(project.parts)) {
    const number = normalizeLibraryNumber(part.pn);
    const entry = byCode.get(number);
    const record = registered.get(number);
    const catalogAction = entry ? entry.std && fastenerTypes.has(entry.type ?? '') ? 'fasten' : 'place' : null;
    const libraryAction = record?.assemblyAction ?? catalogAction ?? (record && isScrewOrBolt(record.name) ? 'fasten' : null);
    const remembered = saved[key]?.action;
    const namedFastener = isScrewOrBolt(part.pn) || isScrewOrBolt(part.ko) || /\b(?:shc|csk)\b/i.test(part.pn);
    part.fastenerPart = catalogAction === 'fasten' || libraryAction === 'fasten' || namedFastener || remembered === 'fasten';
    if (remembered === 'place' || remembered === 'fasten') {
      part.std = remembered === 'fasten';
      part.actionSource = 'geometry';
    } else if (libraryAction) {
      part.std = libraryAction === 'fasten';
      part.actionSource = 'library';
    } else if (namedFastener) {
      part.std = true;
      part.actionSource = 'name';
    } else {
      part.actionSource = 'unmatched';
    }
  }
  for (const section of project.sections) {
    for (const step of section.steps) {
      const part = project.parts[step.part];
      step.t = part.std ? 'fasten' : 'place';
      step.txt = part.ko + (part.std ? '의 체결 위치와 공구를 확인하세요.' : ' 부품을 조립 위치에 놓으세요.');
    }
  }
}
