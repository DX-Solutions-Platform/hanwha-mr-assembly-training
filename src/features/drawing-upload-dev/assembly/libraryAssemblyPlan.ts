import type { LibraryMatch } from '@/features/part-library/libraryTypes';
import { parseReviewQuantity } from '../review/reviewModel';
import type { ReviewDocument, ReviewedPart, ReviewGroup } from '../review/reviewTypes';
import type { OutlineFlangeLink } from '../generate/outlineFlangeLinks';
import type { ModelAppearance } from '@/features/part-library/modelAppearance';
import { LIBRARY_ASSEMBLY_ID, type AssemblyDocument, type AssemblyKind, type AssemblyPart, type Triple } from './assemblyTypes';

interface LibraryAssemblyRow {
  partNumber: string;
  name: string;
  revision: string;
  key: string;
  quantity: number;
  appearance?: ModelAppearance;
}

export function planLibraryAssembly(groups: ReviewGroup[], parts: ReviewedPart[], matches: Map<string, LibraryMatch>, links: OutlineFlangeLink[] = []) {
  const rows: LibraryAssemblyRow[] = [], issues: string[] = [];
  const byKey = new Map(parts.map((part) => [part.key, part]));
  const unlisted = new Map(links.map((link) => [link.partNumber, link.quantity]));
  for (const group of groups) {
    const part = byKey.get(group.key);
    if (!part) continue;
    const match = matches.get(group.partNumber);
    const code = group.partNumber || part.name;
    const quantity = parseReviewQuantity(part.quantity) ?? unlisted.get(group.partNumber) ?? null;
    unlisted.delete(group.partNumber);
    if (!match?.model) issues.push(code + ' · 승인된 GLB 없음');
    else if (quantity === null || !Number.isSafeInteger(quantity)) issues.push(code + ' · 수량을 양의 정수로 확인해 주세요.');
    else rows.push({ partNumber: match.partNumber, name: match.name, revision: match.revision, key: match.model.key, quantity, appearance: match.appearance });
  }
  for (const [number, quantity] of unlisted) {
    const match = matches.get(number);
    if (match?.model) rows.push({ partNumber: number, name: match.name, revision: match.revision, key: match.model.key, quantity, appearance: match.appearance });
    else issues.push(number + ' · 승인된 GLB 없음');
  }
  const count = rows.reduce((total, row) => total + row.quantity, 0);
  const limitMessage = count > 120 || rows.length > 24 ? '한 번에 최대 24종, 120개까지 배치할 수 있습니다.' : '';
  return { rows, issues, count, limitMessage, key: JSON.stringify(rows.map(({ partNumber, revision, key, quantity, appearance }) => [partNumber, revision, key, quantity, appearance])) };
}
export type LibraryAssemblyPlan = ReturnType<typeof planLibraryAssembly>;

function identifyKind(name: string): AssemblyKind {
  if (/플랜지|\bflange\b/i.test(name)) return 'flange';
  if (/베이스\s*(판|플레이트)|\bbase[-\s]*plate\b/i.test(name)) return 'base';
  if (/볼트|\bbolt\b/i.test(name)) return 'bolt';
  if (/너트|\bnut\b/i.test(name)) return 'nut';
  return 'other';
}

export function createLibraryAssembly(drawing: ReviewDocument, rows: LibraryAssemblyRow[], sizes: ReadonlyMap<string, Triple>): AssemblyDocument {
  const partList: AssemblyPart[] = [];
  const columns = Math.ceil(Math.sqrt(rows.reduce((total, row) => total + row.quantity, 0)));
  const width = Math.max(...[...sizes.values()].map((size) => size[0]));
  const depth = Math.max(...[...sizes.values()].map((size) => size[1]));
  for (const row of rows) {
    const size = sizes.get(row.key);
    if (!size) throw new Error(row.partNumber + '의 GLB 형상을 확인하지 못했습니다.');
    for (let index = 0; index < row.quantity; index++) {
      const position: Triple = [
        (partList.length % columns - (columns - 1) / 2) * (width + Math.max(width * .15, 5)),
        Math.floor(partList.length / columns) * (depth + Math.max(depth * .15, 5)), size[2] / 2,
      ];
      if (position.some((value) => Math.abs(value) > 5000)) throw new Error('GLB의 크기와 배치 범위를 확인해 주세요. 위치 편집 범위는 ±5,000 mm입니다.');
      partList.push({
        id: 'lib:' + row.partNumber + ':' + (index + 1), partNumber: row.partNumber, kind: identifyKind(row.name),
        name: row.name.slice(0, 190) + (row.quantity > 1 ? ' ' + (index + 1) : ''), position, rotation: [0, 0, 0],
        relation: { type: 'free', parentId: null, targetAnchorId: null, ownAnchorId: 'origin' }, model: { key: row.key, revision: row.revision, size },
      });
    }
  }
  return { format: 'hanwha-assembly', schemaVersion: 1, templateId: LIBRARY_ASSEMBLY_ID, drawingSha256: drawing.sha256, name: drawing.name.slice(0, 200), unit: 'mm', angleUnit: 'deg', updatedAt: new Date().toISOString(), partList };
}
