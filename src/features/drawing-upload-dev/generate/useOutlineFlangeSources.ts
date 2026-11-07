import { useEffect, useState } from 'react';
import type { ReviewDocument, ReviewedPart, ReviewGroup } from '../review/reviewTypes';
import type { DrawingPage } from '../types';
import type { FlangeSource } from './flangeTypes';
import type { OutlineFlangeLink } from './outlineFlangeLinks';
import { createOutlineFlangeSource, readPageFlangeOutlines } from './readFlangeOutlines';

interface OutlineInput {
  document: ReviewDocument; pages: DrawingPage[]; sourceUrl: string;
  groups: ReviewGroup[]; parts: ReviewedPart[]; occupied: ReadonlySet<string>;
  labelled: ReadonlySet<string>; links: OutlineFlangeLink[];
}

export function useOutlineFlangeSources(input: OutlineInput | null) {
  const [result, setResult] = useState<{ input: OutlineInput; candidates: FlangeSource[]; reused: string[] } | null>(null);
  useEffect(() => {
    if (!input) return;
    const abort = new AbortController();
    void (async () => {
      const candidates: FlangeSource[] = [], reused = new Set<string>();
      const { document, pages, sourceUrl, groups, parts, occupied, labelled, links } = input;
      const identified = groups.filter((group) => group.partNumber && group.recordList.some((record) =>
        record.kind === 'table' || /-label-\d+$/.test(record.id) || (record.source.confidence ?? 100) >= 80));
      const partByKey = new Map(parts.map((part) => [part.key, part]));
      const linkByKey = new Map(links.map((link) => [link.key, link]));
      const foundNumbers = new Set<string>();
      for (const page of pages) {
        if (abort.signal.aborted) return;
        const onPage = identified.filter((group) => group.recordList.some((record) => record.source.pageNumber === page.pageNumber));
        const scope = onPage.length ? onPage : identified;
        const group = scope.length === 1 ? scope[0] : undefined;
        const number = group?.partNumber ?? '';
        const part = group ? partByKey.get(group.key) : undefined;
        if (number && occupied.has(number)) {
          if (/flange|플랜지/i.test(part?.name ?? '')) reused.add(number);
          continue;
        }
        if (number && labelled.has(number)) continue;
        try {
          const outlines = await readPageFlangeOutlines(page, abort.signal);
          for (const outline of outlines) {
            const isSingle = outlines.length === 1;
            const source = createOutlineFlangeSource({
              ...outline, page, document, pages, sourceUrl, partNumber: isSingle ? number : '',
              part: isSingle ? part : undefined, group: isSingle ? group : undefined,
              allowReferences: isSingle && scope.length <= 1,
            });
            if (!source?.outline) continue;
            const link = linkByKey.get(source.outline.key);
            if (link && occupied.has(link.partNumber)) { reused.add(link.partNumber); continue; }
            const id = source.values.part.partNumber;
            if (id && foundNumbers.has(id)) continue;
            if (id) foundNumbers.add(id);
            candidates.push(source);
          }
        } catch {
          // Other pages can still provide a usable outline.
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      if (!abort.signal.aborted) setResult({ input, candidates, reused: [...reused] });
    })();
    return () => abort.abort();
  }, [input]);
  return result?.input === input ? result : null;
}
