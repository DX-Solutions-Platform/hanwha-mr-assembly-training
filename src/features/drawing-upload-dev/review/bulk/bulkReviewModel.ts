import { createPartReview, getReviewIssues, parseReviewQuantity, revisePart } from '../reviewModel';
import { REVIEW_FIELD_LIST, type ReviewedPart, type ReviewGroup } from '../reviewTypes';
import { normalizePartNumber, type ImportedReviewRow } from './reviewImport';

export interface BulkReviewOptions {
  selectedKeys: string[]; rowList: ImportedReviewRow[]; sourceName: string;
  material: string; quantity: string; shouldOverwrite: boolean; hasReviewedNoDimensions: boolean;
}
export function buildBulkReviewPlan(groupList: ReviewGroup[], partList: ReviewedPart[], options: BulkReviewOptions) {
  const changes: { key: string; patch: Partial<ReviewedPart>; after: ReviewedPart }[] = [], warnings: string[] = [];
  const selected = new Set(options.selectedKeys), rows = new Map(options.rowList.map((row) => [row.partNumber, row]));
  const unknownNumbers = [...rows.keys()].filter((number) => !groupList.some((group) => normalizePartNumber(group.partNumber) === number));
  if (options.quantity.trim() && parseReviewQuantity(options.quantity) === null) return { changes, unknownNumbers, warnings: ['공통 수량은 0보다 큰 숫자로 입력하세요.'] };
  for (const part of partList) {
    if (!selected.has(part.key)) continue;
    const group = groupList.find((item) => item.key === part.key)!;
    const original = createPartReview(group), imported = rows.get(normalizePartNumber(group.partNumber));
    const common = { ...(options.material.trim() ? { material: options.material.trim() } : {}), ...(options.quantity.trim() ? { quantity: options.quantity.trim() } : {}) };
    const desired = { ...original, name: original.hasTemporaryName ? '' : original.name, ...imported?.values, ...common }, patch: Partial<ReviewedPart> = {};
    const externalFields: string[] = [], sourceNames = new Set<string>();
    for (const { key, label } of REVIEW_FIELD_LIST) {
      const value = desired[key].trim();
      const hasSuggestedName = part.hasTemporaryName || (part.status === 'draft' && part.shapeNameSuggestion);
      const hasProtectedValue = part[key].trim() && !(key === 'name' && hasSuggestedName);
      if (!value || value === part[key] || (!options.shouldOverwrite && hasProtectedValue) || (key === 'quantity' && parseReviewQuantity(value) === null)) continue;
      patch[key] = value;
      if (common[key as keyof typeof common] || imported?.values[key]) { externalFields.push(label); sourceNames.add(common[key as keyof typeof common] ? '공통값 입력' : options.sourceName.slice(0, 160)); }
    }
    if (options.hasReviewedNoDimensions && !part.dimensionList.length && !part.hasNoDimensions) patch.hasNoDimensions = true;
    if (externalFields.length) {
      const marker = '[일괄 입력 · ' + [...sourceNames].join(' / ') + '] ' + externalFields.join('·');
      const note = [part.note, marker].filter(Boolean).join('\n');
      if (note.length > 6000) { warnings.push((group.partNumber || part.key) + ': 검토 메모가 길어 적용하지 않았습니다.'); continue; }
      patch.note = note;
    }
    if (Object.keys(patch).length) changes.push({ key: part.key, patch, after: revisePart(part, patch) });
  }
  return { changes, unknownNumbers, warnings };
}
export function confirmReadyParts(partList: ReviewedPart[], selectedKeys: string[], confirmedAt: string) {
  const selected = new Set(selectedKeys);
  return partList.map((part) => selected.has(part.key) && part.status !== 'confirmed' && !getReviewIssues(part).length ? { ...part, status: 'confirmed' as const, confirmedAt } : part);
}
