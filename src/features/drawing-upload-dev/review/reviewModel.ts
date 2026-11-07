import type { DrawingPage, PartRecord } from '../types';
import { REVIEW_FIELD_LIST, type ReviewedPart, type ReviewField, type ReviewGroup } from './reviewTypes';

const clean = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
export function sourceFieldValue(record: PartRecord, field: ReviewField) {
  return field === 'quantity' ? record.quantity !== null ? String(record.quantity) : record.quantityText.trim() : record[field].trim();
}
export function getFieldCandidates(group: ReviewGroup, field: ReviewField) {
  const candidateMap = new Map<string, { value: string; recordList: PartRecord[] }>();
  for (const record of group.recordList) {
    const value = sourceFieldValue(record, field);
    if (!value) continue;
    const key = clean(value);
    const existing = candidateMap.get(key);
    if (existing) existing.recordList.push(record);
    else candidateMap.set(key, { value, recordList: [record] });
  }
  return [...candidateMap.values()];
}
export function groupParts(pageList: DrawingPage[]): ReviewGroup[] {
  const groupMap = new Map<string, ReviewGroup>();
  for (const record of pageList.flatMap((page) => page.partList)) {
    // Preserve case, punctuation and leading zeroes. Missing numbers never merge.
    const partNumber = clean(record.partNumber);
    const key = partNumber ? 'number:' + partNumber : 'record:' + record.id;
    const existing = groupMap.get(key);
    if (existing) existing.recordList.push(record);
    else groupMap.set(key, { key, partNumber, recordList: [record], conflictFieldList: [] });
  }
  const groupList = [...groupMap.values()];
  for (const group of groupList) group.conflictFieldList = REVIEW_FIELD_LIST.filter((field) => getFieldCandidates(group, field.key).length > 1).map((field) => field.key);
  return groupList;
}
export function getTemporaryPartName(group: ReviewGroup) {
  return '미지정 부품 ' + (group.partNumber || group.recordList[0].id);
}
export function createPartReview(group: ReviewGroup): ReviewedPart {
  const value = (field: ReviewField) => {
    const candidates = getFieldCandidates(group, field);
    return candidates.length === 1 ? candidates[0].value : '';
  };
  const hasTemporaryName = !getFieldCandidates(group, 'name').length;
  return {
    key: group.key, name: hasTemporaryName ? getTemporaryPartName(group) : value('name'), ...(hasTemporaryName ? { hasTemporaryName: true } : {}), quantity: value('quantity'), material: value('material'),
    specification: value('specification'), note: '', dimensionList: [], hasNoDimensions: false,
    status: 'draft', confirmedAt: null,
  };
}
export function revisePart(part: ReviewedPart, patch: Partial<ReviewedPart>): ReviewedPart {
  const revised: ReviewedPart = { ...part, ...patch, key: part.key, status: 'draft', confirmedAt: null };
  if (patch.name !== undefined && patch.name !== part.name) {
    delete revised.hasTemporaryName;
    delete revised.shapeNameSuggestion;
  }
  return revised;
}
export function parseReviewQuantity(value: string) {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const quantity = Number(value.trim().replace(',', '.'));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}
export function needsReviewFields(part: ReviewedPart) {
  return !!part.hasTemporaryName || (part.status === 'draft' && !!part.shapeNameSuggestion) || !part.name.trim() || parseReviewQuantity(part.quantity) === null || !part.material.trim();
}
export function getReviewIssues(part: ReviewedPart): string[] {
  const issueList: string[] = [];
  if (!part.name.trim()) issueList.push('품명을 입력해 주세요.');
  if (parseReviewQuantity(part.quantity) === null) issueList.push('수량은 0보다 큰 숫자로 입력해 주세요.');
  if (!part.material.trim()) issueList.push('재질을 입력해 주세요.');
  if (!part.dimensionList.length && !part.hasNoDimensions) issueList.push('치수를 연결하거나, 원문에 치수가 없음을 확인해 주세요.');
  if (part.dimensionList.length && part.hasNoDimensions) issueList.push('치수가 연결된 부품은 치수 없음으로 확정할 수 없습니다.');
  if (part.dimensionList.some((item) => item.sourceId === null) && !part.note.trim()) issueList.push('직접 입력한 치수의 근거를 검토 메모에 남겨 주세요.');
  for (const [index, dimension] of part.dimensionList.entries()) {
    if (!dimension.value.trim()) issueList.push('치수 ' + (index + 1) + '의 값을 입력해 주세요.');
    if (!dimension.unit.trim() || /^(미확인|미상|unknown|\?|-)$/i.test(dimension.unit.trim())) issueList.push('치수 ' + (index + 1) + '의 단위를 확인해 주세요.');
  }
  return issueList;
}
