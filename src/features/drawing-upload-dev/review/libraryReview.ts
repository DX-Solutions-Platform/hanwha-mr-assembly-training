import { LIBRARY_URL, type LibraryMatch, type LibraryPartInput } from '@/features/part-library/libraryTypes';
import { getFieldCandidates, revisePart } from './reviewModel';
import type { ReviewDocument, ReviewedPart, ReviewGroup } from './reviewTypes';

export async function lookupLibrary(groups: ReviewGroup[], signal: AbortSignal, additionalNumbers: string[] = []) {
  return lookupLibraryNumbers([...groups.map((group) => group.partNumber), ...additionalNumbers], signal);
}

export async function lookupLibraryNumbers(partNumbers: string[], signal: AbortSignal) {
  const numbers = [...new Set(partNumbers)].filter((number) => number && number.length <= 200);
  const matches = new Map<string, LibraryMatch>();
  const existingModelNumbers = new Set<string>();
  for (let index = 0; index < numbers.length; index += 500) {
    const response = await fetch(LIBRARY_URL + '/lookup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numbers: numbers.slice(index, index + 500) }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error('라이브러리 조회에 실패했습니다.');
    const data: { matches: LibraryMatch[]; existingModelNumbers: string[] } = await response.json();
    for (const match of data.matches) matches.set(match.partNumber, match);
    for (const number of data.existingModelNumbers) existingModelNumbers.add(number);
  }
  return { matches, existingModelNumbers };
}

export function applyLibraryMatch(part: ReviewedPart, group: ReviewGroup, match?: LibraryMatch): ReviewedPart {
  if (!match || part.status === 'confirmed') return part;
  const patch: Partial<ReviewedPart> = {};
  const filled: string[] = [];
  for (const [field, label] of [['name', '품명'], ['material', '재질'], ['specification', '규격·비고']] as const) {
    if (!match[field] || getFieldCandidates(group, field).length || (part[field].trim() && !(field === 'name' && part.hasTemporaryName))) continue;
    patch[field] = match[field];
    filled.push(label);
  }
  if (!part.dimensionList.length && !part.hasNoDimensions && match.dimensionList.length) {
    patch.dimensionList = match.dimensionList.map((dimension, index) => ({ ...dimension, id: 'library-dimension-' + index, sourceId: null }));
    filled.push('치수');
  }
  if (!filled.length) return part;
  const source = '부품 라이브러리 · ' + match.partNumber + ' · 개정 ' + match.revision;
  patch.librarySource = source + ' · ' + filled.join(', ');
  if (patch.dimensionList) patch.note = source + ' 치수 참고. 현재 도면과 대조해 주세요.';
  return revisePart(part, patch);
}

export function confirmedLibraryParts(document: ReviewDocument, groups: ReviewGroup[], parts: ReviewedPart[]): LibraryPartInput[] {
  const byKey = new Map(groups.map((group) => [group.key, group]));
  return parts.flatMap((part) => {
    const group = byKey.get(part.key);
    if (!group?.partNumber || group.partNumber.length > 200 || part.status !== 'confirmed' || part.hasTemporaryName) return [];
    const pages = [...new Set(group.recordList.map((record) => record.source.pageNumber))].join('·');
    const title = document.name.slice(0, 2000);
    return [{
      partNumber: group.partNumber, name: part.name, material: part.material, specification: part.specification,
      category: 'custom', revision: 'A', status: 'approved', usage: title, source: (title + ' · ' + pages + '쪽').slice(0, 2000),
      dimensionList: part.dimensionList.map(({ value, unit }) => ({ value, unit })),
    }];
  });
}
