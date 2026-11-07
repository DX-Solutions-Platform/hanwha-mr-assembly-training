import { ASSEMBLY_TEMPLATE_ID } from './assemblyTemplate';
import { validateAssembly } from './assemblyModel';
import { assemblyBounds, resolveAssembly } from './assemblyTransforms';
import type { AssemblyDocument, AssemblyPart, AssemblyRelation, Triple } from './assemblyTypes';
import { LIBRARY_ASSEMBLY_ID } from './assemblyTypes';

export const ASSEMBLY_STORAGE_KEY = 'hanwha.assembly-editor.v1.' + ASSEMBLY_TEMPLATE_ID;
export const assemblyStorageKey = (seed?: AssemblyDocument) => seed?.drawingSha256 ? 'hanwha.assembly-drawing.v1.' + seed.drawingSha256 : ASSEMBLY_STORAGE_KEY;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('조립품 데이터 형식이 올바르지 않습니다.');
  return value as Record<string, unknown>;
}
function text(value: unknown, limit = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error('부품 식별자·이름이 올바르지 않습니다.');
  return value;
}
function vector(value: unknown): Triple {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((item) => typeof item === 'number' && Number.isFinite(item))) throw new Error('위치·회전은 유효한 숫자 3개가 필요합니다.');
  return value as Triple;
}
export function decodeAssembly(raw: string, seed?: AssemblyDocument, includeNewModels = false): AssemblyDocument {
  const data = record(JSON.parse(raw));
  const templateId = seed?.templateId ?? ASSEMBLY_TEMPLATE_ID;
  if (data.format !== 'hanwha-assembly' || data.schemaVersion !== 1 || data.templateId !== templateId || data.unit !== 'mm' || data.angleUnit !== 'deg') throw new Error('지원하는 조립품 JSON이 아닙니다.');
  const isLibrary = templateId === LIBRARY_ASSEMBLY_ID;
  if (isLibrary && data.drawingSha256 !== seed?.drawingSha256) throw new Error('현재 PDF와 다른 조립품입니다.');
  const expectedCount = seed?.partList.length ?? 10;
  const allowSubset = isLibrary && includeNewModels;
  if (!Array.isArray(data.partList) || !data.partList.length || data.partList.length > expectedCount ||
    (!allowSubset && data.partList.length !== expectedCount)) throw new Error(isLibrary ? '저장한 조립품과 현재 PDF의 배치 수량이 다릅니다.' : '조립품 예시에는 부품 10개가 필요합니다.');
  const byId = new Map(seed?.partList.map((part) => [part.id, part]));
  const partList = data.partList.map((value): AssemblyPart => {
    const part = record(value), relation = record(part.relation);
    const id = text(part.id, 220);
    const expected = byId.get(id);
    if (isLibrary) {
      const model = record(part.model);
      if (!expected?.model || model.key !== expected.model.key || model.revision !== expected.model.revision ||
        part.partNumber !== expected.partNumber || part.kind !== expected.kind) throw new Error('현재 부품번호·수량·GLB 개정이 저장값과 다릅니다.');
    }
    const parentId = relation.parentId === null ? null : text(relation.parentId, 220);
    const targetAnchorId = relation.targetAnchorId === null ? null : text(relation.targetAnchorId);
    return { id, name: text(part.name), partNumber: text(part.partNumber), kind: text(part.kind) as AssemblyPart['kind'], position: vector(part.position), rotation: vector(part.rotation), relation: { type: text(relation.type) as AssemblyRelation['type'], parentId, targetAnchorId, ownAnchorId: text(relation.ownAnchorId) }, ...(expected?.model ? { model: expected.model } : {}) };
  });
  const updatedAt = text(data.updatedAt, 64);
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error('조립품 저장 날짜가 올바르지 않습니다.');
  const document: AssemblyDocument = { format: 'hanwha-assembly', schemaVersion: 1, templateId, ...(isLibrary ? { drawingSha256: seed?.drawingSha256 } : {}), name: text(data.name), unit: 'mm', angleUnit: 'deg', updatedAt, partList };
  const issues = validateAssembly(document);
  if (issues.length) throw new Error(issues.join(' '));
  if (seed && allowSubset && partList.length < expectedCount) {
    const ids = new Set(partList.map(({ id }) => id)), numbers = new Set(partList.map(({ partNumber }) => partNumber));
    const added = seed.partList.filter((part) => !ids.has(part.id));
    if (added.some((part) => numbers.has(part.partNumber))) throw new Error('저장한 조립품과 현재 PDF의 배치 수량이 다릅니다.');
    const existing = assemblyBounds(document, resolveAssembly(document), false);
    const addedMinY = Math.min(...added.map((part) => part.position[1] - (part.model?.size[1] ?? 0) / 2));
    const shift = existing.max.y + 10 - addedMinY;
    const addedAtEnd = added.map((part): AssemblyPart => ({ ...part, position: [part.position[0], part.position[1] + shift, part.position[2]] }));
    const combined = { ...document, partList: [...partList, ...addedAtEnd] };
    const issues = validateAssembly(combined);
    if (issues.length) throw new Error(issues.join(' '));
    return combined;
  }
  return document;
}
