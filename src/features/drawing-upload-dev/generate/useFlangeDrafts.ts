import { useEffect, useState } from 'react';
import { toFlangeDraft } from './flangeModel';
import { createFlangeRecipe } from './flangePersistence';
import type { FlangeSource } from './flangeTypes';

export type GeneratedFlangeDraft = { source: FlangeSource; glb?: Blob };
type Results = Map<string, GeneratedFlangeDraft | string>;

export function useFlangeDrafts(sources: FlangeSource[]) {
  const [completed, setCompleted] = useState<{ sources: FlangeSource[]; results: Results } | null>(null);
  useEffect(() => {
    if (!sources.length) return;
    let active = true;
    void (async () => {
      const results: Results = new Map();
      for (const source of sources) {
        if (!active) return;
        const number = source.outline?.key ?? source.values.part.partNumber;
        try {
          if (source.outline) { results.set(number, { source }); continue; }
          const { exportFlangeGlb } = await import('./exportFlangeGlb');
          const recipe = createFlangeRecipe({ source, applied: source.values, draft: toFlangeDraft(source.values), status: 'draft', confirmedAt: null, isDirty: false });
          results.set(number, { source, glb: await exportFlangeGlb(recipe) });
        } catch (reason) { results.set(number, reason instanceof Error ? reason.message : '3D 초안을 생성하지 못했습니다.'); }
      }
      if (active) setCompleted({ sources, results });
    })();
    return () => { active = false; };
  }, [sources]);
  return completed?.sources === sources ? completed.results : null;
}
