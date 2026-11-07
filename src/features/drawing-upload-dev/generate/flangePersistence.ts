import { FLANGE_FIELD_LIST, type FlangeDraft, type FlangeRecipe, type FlangeSource, type FlangeState } from './flangeTypes';
import { hasFlangeChanges, parseFlangeDraft } from './flangeModel';
import { readModelAppearance } from '../../part-library/modelAppearance';

export const FLANGE_STORAGE_PREFIX = 'hanwha.pdf-model-example.v1.';
export function createFlangeRecipe(state: FlangeState): FlangeRecipe {
  if (hasFlangeChanges(state.draft, state.applied)) throw new Error('수정한 입력값으로 3D를 다시 생성한 뒤 저장하세요.');
  return { format: 'hanwha-pdf-model', schemaVersion: 1, template: 'flange-v1', unit: 'mm', document: state.source.document, values: state.applied, status: state.status, confirmedAt: state.confirmedAt, savedAt: new Date().toISOString(), ...(state.appearance ? { appearance: state.appearance } : {}), source: { values: state.source.values, evidence: state.source.evidence, partEvidence: state.source.partEvidence, ...(state.source.outline ? { outline: state.source.outline } : {}) } };
}
export function decodeFlangeRecipe(raw: string, source: FlangeSource): Pick<FlangeRecipe, 'values' | 'status' | 'confirmedAt' | 'appearance'> {
  const data = JSON.parse(raw);
  if (!data || data.format !== 'hanwha-pdf-model' || data.schemaVersion !== 1 || data.template !== 'flange-v1' || data.unit !== 'mm') throw new Error('지원하는 PDF 3D 예시 JSON이 아닙니다.');
  if (data.document?.sha256 !== source.document.sha256 || data.document?.size !== source.document.size || data.document?.pageCount !== source.document.pageCount) throw new Error('다른 PDF의 생성 결과입니다. 같은 원본 PDF를 먼저 올려 주세요.');
  if (data.source?.outline?.key !== source.outline?.key) throw new Error('같은 플랜지 원문 영역의 생성 결과를 선택하세요.');
  if (!data.values?.parameters || !data.values?.part) throw new Error('형상 입력 정보가 없습니다.');
  const parameters = Object.fromEntries(FLANGE_FIELD_LIST.map(({ key }) => {
    const value = data.values.parameters[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('치수는 유효한 숫자여야 합니다.');
    return [key, String(value)];
  })) as FlangeDraft['parameters'];
  for (const key of ['partNumber', 'name', 'material', 'quantity']) if (typeof data.values.part[key] !== 'string') throw new Error('부품 정보는 문자열로 입력해야 합니다.');
  const parsed = parseFlangeDraft({ parameters, part: data.values.part });
  if (!parsed.values) throw new Error(parsed.issues.join(' '));
  if (!['draft', 'confirmed'].includes(data.status) || data.status === 'confirmed' && (typeof data.confirmedAt !== 'string' || !Number.isFinite(Date.parse(data.confirmedAt)))) throw new Error('검토 상태가 올바르지 않습니다.');
  const appearance = data.appearance === undefined ? undefined : readModelAppearance(data.appearance);
  if (appearance === null) throw new Error('저장된 모델의 외관 정보가 올바르지 않습니다.');
  return { values: parsed.values, status: data.status, confirmedAt: data.status === 'confirmed' ? data.confirmedAt : null, ...(appearance ? { appearance } : {}) };
}
export function downloadFlangeFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function flangeFilename(partNumber: string) { return partNumber.replace(/[^a-zA-Z0-9가-힣._-]/g, '_').slice(0, 100) || 'flange'; }
