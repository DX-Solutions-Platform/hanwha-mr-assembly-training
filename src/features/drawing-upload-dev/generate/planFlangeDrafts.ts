import { normalizeLibraryNumber } from '@/features/part-library/libraryTypes';
import type { ReviewDocument, ReviewedPart, ReviewGroup } from '../review/reviewTypes';
import type { DrawingPage } from '../types';
import { parseFlangeDraft } from './flangeModel';
import type { FlangeSource } from './flangeTypes';
import { hasFlangeMarker, readFlangeParameters } from './readFlangeSource';

const scopeRecords = (pages: DrawingPage[]) => pages.flatMap((page) => page.partList.filter((part) => part.kind === 'table' || /-label-\d+$/.test(part.id)));
const scopeNumbers = (records: ReturnType<typeof scopeRecords>) => [...new Set(records.map((part) => normalizeLibraryNumber(part.partNumber)))];

export function planFlangeDrafts({ document, pages, sourceUrl, groups, parts, occupied }: {
  document: ReviewDocument; pages: DrawingPage[]; sourceUrl: string; groups: ReviewGroup[]; parts: ReviewedPart[]; occupied: ReadonlySet<string> | null;
}) {
  const candidates = new Map<string, FlangeSource>(), reused = new Set<string>(), issues = new Set<string>(), conflicts = new Set<string>();
  const marked = pages.filter(hasFlangeMarker);
  if (marked.length && !occupied) issues.add('라이브러리의 GLB 등록 여부를 확인하지 못했습니다. 도면을 다시 분석해 주세요.');
  if (!marked.length || !occupied) return { candidates: [], reused: [], issues: [...issues] };
  const allRecords = scopeRecords(pages);
  const scopes = scopeNumbers(allRecords).length === 1 ? [pages] : marked.map((page) => [page]);
  for (const scope of scopes) {
    const records = scopeRecords(scope);
    const numbers = scopeNumbers(records);
    if (numbers.length !== 1 || !numbers[0]) { issues.add(scope[0].pageNumber + '쪽 · 플랜지 부품번호를 한 종류로 확인해 주세요.'); continue; }
    const number = numbers[0];
    if (occupied.has(number)) { reused.add(number); continue; }
    const group = groups.find((item) => item.partNumber === number);
    const part = group && parts.find((item) => item.key === group.key);
    if (!part) continue;
    try {
      const { parameters, evidence } = readFlangeParameters(scope);
      const parsed = parseFlangeDraft({ parameters, part: {
        partNumber: number, name: part.hasTemporaryName ? '원형 플랜지' : part.name, material: part.material, quantity: part.quantity,
      } });
      if (!parsed.values) throw new Error(parsed.issues.join(' '));
      const previous = candidates.get(number);
      if (previous && JSON.stringify(previous.values.parameters) !== JSON.stringify(parsed.values.parameters)) conflicts.add(number);
      candidates.set(number, { document, values: parsed.values, evidence, partEvidence: records[0].source, pageList: pages, sourceUrl });
    } catch (reason) {
      issues.add(number + ' · ' + (reason instanceof Error ? reason.message : '치수를 확인해 주세요.'));
      conflicts.add(number);
    }
  }
  for (const number of conflicts) {
    if (candidates.delete(number)) issues.add(number + ' · 여러 도면의 치수를 대조해 주세요.');
  }
  return { candidates: [...candidates.values()], reused: [...reused], issues: [...issues] };
}
