'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { ActionButton, StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { AppearanceEditor } from './AppearanceEditor';
import { LibraryDialog } from './LibraryDialog';
import { DEFAULT_APPEARANCE, type ModelAppearance } from './modelAppearance';
import { LIBRARY_URL, libraryAssetUrl, type LibraryPart, type LibraryRole } from './libraryTypes';

const Preview = dynamic(() => import('./LibraryModelPreview').then((module) => module.LibraryModelPreview), { ssr: false });

export function LibraryAppearanceDialog({ part, role, onClose, onSaved }: { part: LibraryPart; role: LibraryRole; onClose: () => void; onSaved: () => void }) {
  const [appearance, setAppearance] = useState<ModelAppearance | null>(part.appearance ?? null);
  const [material, setMaterial] = useState(part.material);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setIsBusy(true); setError('');
    try {
      const response = await fetch(LIBRARY_URL, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partNumber: part.partNumber, material, appearance, role }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      onSaved(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '외관을 저장하지 못했습니다.'); }
    finally { setIsBusy(false); }
  };
  return <LibraryDialog title="부품 외관 설정" onClose={onClose}>
    {part.model && <Viewport><Preview url={libraryAssetUrl(part.model)} appearance={appearance ?? undefined} /></Viewport>}
    <AppearanceEditor appearance={appearance ?? DEFAULT_APPEARANCE} material={material} onChange={(next, grade) => { setAppearance(next); setMaterial(grade); }} />
    <Actions>{appearance && <ActionButton onClick={() => setAppearance(null)}>원본 GLB 외관 사용</ActionButton>}
      <ActionButton $primary disabled={isBusy || !material.trim()} onClick={() => void save()}>{isBusy ? '저장 중' : '외관 저장'}</ActionButton></Actions>
    {error && <StateText role="alert" $tone="danger">{error}</StateText>}
  </LibraryDialog>;
}
const Viewport = styled.div(({ theme }) => ({ height: 180, position: 'relative', background: theme.color.bgEdge, marginBottom: theme.space[4] }));
const Actions = styled.div(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', gap: theme.space[2], marginTop: theme.space[4] }));
