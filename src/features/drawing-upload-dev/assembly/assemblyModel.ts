import { createAssemblyExample, getPartAnchors } from './assemblyTemplate';
import { CONNECTION_LIST, KIND_LABEL, LIBRARY_ASSEMBLY_ID, type AssemblyDocument, type AssemblyDraft, type AssemblyPart, type Triple } from './assemblyTypes';

export function toAssemblyDraft(part: AssemblyPart): AssemblyDraft {
  return { position: part.position.map(String) as AssemblyDraft['position'], rotation: part.rotation.map(String) as AssemblyDraft['rotation'], relation: { ...part.relation } };
}
export function parseAssemblyDraft(part: AssemblyPart, draft: AssemblyDraft): { part: AssemblyPart | null; issues: string[] } {
  const issues: string[] = [];
  const vector = (values: string[], limit: number, label: string): Triple => values.map((text, index) => {
    const value = Number(text);
    if (!text.trim() || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()) || !Number.isFinite(value) || Math.abs(value) > limit) issues.push(label + ' ' + ['X', 'Y', 'Z'][index] + ': -' + limit + '~' + limit + (label === '위치' ? ' mm' : '°') + '의 숫자를 입력하세요.');
    return value;
  }) as Triple;
  const position = vector(draft.position, 5000, '위치'), rotation = vector(draft.rotation, 360, '회전');
  return { part: issues.length ? null : { ...part, position, rotation, relation: { ...draft.relation } }, issues };
}
export function isAssemblyDraftChanged(part: AssemblyPart, draft: AssemblyDraft) {
  const parsed = parseAssemblyDraft(part, draft).part;
  return !parsed || JSON.stringify(parsed) !== JSON.stringify(part);
}
export function sameAssemblyParts(first: AssemblyPart[], second: AssemblyPart[]) {
  const values = (list: AssemblyPart[]) => list.map((part) => [part.id, part.name, part.partNumber, part.kind, part.position, part.rotation, part.model, [part.relation.type, part.relation.parentId, part.relation.targetAnchorId, part.relation.ownAnchorId]]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return JSON.stringify(values(first)) === JSON.stringify(values(second));
}
export function validateAssembly(document: AssemblyDocument): string[] {
  const issues: string[] = [];
  const isLibrary = document.templateId === LIBRARY_ASSEMBLY_ID;
  const byId = new Map(document.partList.map((part) => [part.id, part]));
  if (isLibrary ? !byId.size || byId.size > 120 || byId.size !== document.partList.length : byId.size !== 10 || document.partList.length !== 10) return ['조립품 부품 수와 고유 식별자를 확인하세요.'];
  const expected = isLibrary ? [] : createAssemblyExample().partList;
  if (expected.some((part) => !byId.has(part.id))) return ['예시의 부품 10개와 고유 식별자가 모두 필요합니다.'];
  for (const part of document.partList) {
    const seed = expected.find((item) => item.id === part.id);
    if (!Object.hasOwn(KIND_LABEL, part.kind) || !part.name.trim() || part.name.length > 200 || !part.partNumber ||
      (isLibrary ? !part.model : !seed || part.kind !== seed.kind || part.partNumber !== seed.partNumber || !!part.model)) { issues.push('부품 종류·번호 또는 이름이 올바르지 않습니다.'); continue; }
    if ([...part.position, ...part.rotation].some((value) => !Number.isFinite(value)) || part.position.some((value) => Math.abs(value) > 5000) || part.rotation.some((value) => Math.abs(value) > 360)) issues.push(part.name + ': 위치·회전 범위를 확인하세요.');
    const relation = part.relation;
    if (!CONNECTION_LIST.some((item) => item.value === relation.type)) { issues.push('지원하지 않는 결합 종류입니다.'); continue; }
    if (isLibrary && relation.type !== 'free' && relation.type !== 'fixed') { issues.push('라이브러리 GLB는 자유 배치와 고정 결합을 지원합니다.'); continue; }
    if (relation.type === 'free') {
      if (relation.parentId !== null || relation.targetAnchorId !== null || relation.ownAnchorId !== 'origin') issues.push(part.name + ': 자유 배치는 기준 부품 없이 부품 중심을 사용합니다.');
      continue;
    }
    if (!isLibrary && part.id === 'base') issues.push('베이스판은 기준 부품이므로 자유 배치로 유지해야 합니다.');
    const parent = relation.parentId ? byId.get(relation.parentId) : undefined;
    if (!parent || parent.id === part.id) { issues.push(part.name + ': 자기 자신이 아닌 기준 부품을 선택하세요.'); continue; }
    if (!getPartAnchors(parent).some((anchor) => anchor.id === relation.targetAnchorId) || !getPartAnchors(part).some((anchor) => anchor.id === relation.ownAnchorId)) issues.push(part.name + ': 존재하는 결합점을 선택하세요.');
    if (relation.type === 'insert' && (part.kind !== 'bolt' || !['base', 'flange'].includes(parent.kind) || !relation.targetAnchorId?.startsWith('hole-'))) issues.push('구멍 삽입은 볼트와 베이스판·플랜지의 구멍 사이에 설정하세요.');
    if (relation.type === 'thread' && (part.kind !== 'nut' || parent.kind !== 'bolt' || !['tip', 'nut-seat'].includes(relation.targetAnchorId ?? ''))) issues.push('너트 체결은 너트와 볼트의 체결 기준점 사이에 설정하세요.');
  }
  for (const start of document.partList) {
    const chain = new Set<string>(); let current: AssemblyPart | undefined = start;
    while (current) {
      if (chain.has(current.id)) { issues.push('부품 결합에 순환이 있습니다. 기준 부품을 거슬러 자기 자신으로 돌아오지 않게 설정하세요.'); break; }
      chain.add(current.id);
      current = current.relation.parentId ? byId.get(current.relation.parentId) : undefined;
    }
  }
  return [...new Set(issues)];
}
export function previewAssemblyDraft(document: AssemblyDocument, id: string, draft: AssemblyDraft) {
  const original = document.partList.find((part) => part.id === id)!;
  const parsed = parseAssemblyDraft(original, draft);
  if (!parsed.part) return { document: null, issues: parsed.issues };
  const candidate = { ...document, partList: document.partList.map((part) => part.id === id ? parsed.part! : part) };
  const issues = validateAssembly(candidate);
  return { document: issues.length ? null : candidate, issues };
}
