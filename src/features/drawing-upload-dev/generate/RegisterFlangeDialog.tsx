import { useRef, useState } from 'react';
import { LibraryDialog } from '@/features/part-library/LibraryDialog';
import { LibraryPinForm } from '@/features/part-library/LibraryPinForm';
import { LIBRARY_URL, type LibraryMatch } from '@/features/part-library/libraryTypes';
import { ActionButton, Muted, StateText } from '../ui/sharedStyles';
import { createFlangeRecipe } from './flangePersistence';
import type { FlangeState } from './flangeTypes';

export function RegisterFlangeDialog({ state, onClose, onRegistered }: { state: FlangeState; onClose: () => void; onRegistered: (match: LibraryMatch) => void }) {
  const createGlb = async () => {
    const recipe = createFlangeRecipe(state);
    if (recipe.status !== 'confirmed') throw new Error('3D 모델을 먼저 검토 확정해 주세요.');
    const { exportFlangeGlb } = await import('./exportFlangeGlb');
    return exportFlangeGlb(recipe);
  };
  return <RegisterModelDialog endpoint="flange" name={state.applied.part.partNumber + ' · ' + state.applied.part.name}
    createGlb={createGlb} onClose={onClose} onRegistered={onRegistered} />;
}

export function RegisterModelDialog({ endpoint, name, createGlb, onClose, onRegistered }: {
  endpoint: 'flange' | 'drawing'; name: string; createGlb: () => Promise<Blob>; onClose: () => void; onRegistered: (match: LibraryMatch) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState('');
  const glb = useRef<Blob | null>(null);
  const register = async () => {
    setIsBusy(true); setError('');
    try {
      if (!glb.current) glb.current = await createGlb();
      const response = await fetch(LIBRARY_URL + '/asset/' + endpoint, { method: 'POST', body: glb.current });
      if (response.status === 401) { setNeedsCode(true); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onRegistered(data.match as LibraryMatch);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'GLB를 등록하지 못했습니다.'); }
    finally { setIsBusy(false); }
  };
  return <LibraryDialog title={endpoint === 'flange' ? '플랜지 GLB 라이브러리 등록' : '도면 GLB 라이브러리 등록'} onClose={onClose}>
    <p>{name}</p>
    <Muted>확정한 치수와 GLB를 저장합니다. 등록 후 이 도면의 조립품에 연결됩니다.</Muted>
    {needsCode ? <LibraryPinForm onUnlocked={() => { setNeedsCode(false); void register(); }} />
      : <ActionButton $primary disabled={isBusy} onClick={() => void register()}>{isBusy ? '등록 중' : '등록하고 조립에 반영'}</ActionButton>}
    {error && <StateText $tone="danger" role="alert">{error}</StateText>}
  </LibraryDialog>;
}
