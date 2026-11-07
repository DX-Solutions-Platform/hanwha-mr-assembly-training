'use client';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ActionButton, StateText } from '../ui/sharedStyles';
import type { ReviewDocument } from '../review/reviewTypes';
import { AssemblyWorkspace } from './AssemblyWorkspace';
import { createLibraryAssembly, type LibraryAssemblyPlan } from './libraryAssemblyPlan';
import { disposeLibraryAssemblyModel, loadLibraryAssemblyModel, type LibraryAssemblyModel } from './loadLibraryAssemblyModel';
import type { AssemblyDocument } from './assemblyTypes';

export function LibraryAssemblyWorkspace({ isActive, drawing, plan, saveReview }: { isActive: boolean; drawing: ReviewDocument; plan: LibraryAssemblyPlan; saveReview?: () => boolean }) {
  const [source] = useState({ drawing, rows: plan.rows });
  const [loaded, setLoaded] = useState<{ seed: AssemblyDocument; models: Map<string, LibraryAssemblyModel> } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const models = new Map<string, LibraryAssemblyModel>();
    const dispose = () => { for (const model of models.values()) disposeLibraryAssemblyModel(model.scene); models.clear(); };
    void (async () => {
      try {
        for (const row of source.rows) {
          if (models.has(row.key)) continue;
          try { models.set(row.key, await loadLibraryAssemblyModel(row.key, controller.signal, row.appearance)); }
          catch (reason) { throw new Error(row.partNumber + ' · ' + (reason instanceof Error ? reason.message : 'GLB를 열지 못했습니다.')); }
        }
        if (!controller.signal.aborted) {
          const seed = createLibraryAssembly(source.drawing, source.rows, new Map([...models].map(([key, value]) => [key, value.size])));
          setLoaded({ seed, models });
        }
      } catch (reason) {
        if (!controller.signal.aborted) { dispose(); setError(reason instanceof Error ? reason.message : 'GLB를 준비하지 못했습니다.'); }
      }
    })();
    return () => { controller.abort(); dispose(); };
  }, [source, attempt]);
  if (loaded) return <AssemblyWorkspace isActive={isActive} library={loaded} saveReview={saveReview} />;
  return isActive ? <Loading role={error ? 'alert' : 'status'}>
    {error ? <><StateText $tone="danger">{error}</StateText><ActionButton onClick={() => { setError(''); setAttempt((value) => value + 1); }}>GLB 다시 불러오기</ActionButton></> : '라이브러리에서 GLB를 불러오는 중입니다.'}
  </Loading> : null;
}
const Loading = styled.div(({ theme }) => ({
  position: 'absolute', inset: '350px 64px 88px', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: theme.space[4],
  border: '1px solid ' + theme.color.primaryLineWeak, fontSize: theme.size.lg,
}));
