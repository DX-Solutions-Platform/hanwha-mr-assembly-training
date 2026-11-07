'use client';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useModalDialog } from '@/features/drawing-upload-dev/ui/useModalDialog';
import { LibraryToggle } from './libraryStyles';

export function LibraryDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const modal = useModalDialog(onClose);
  return <Dialog {...modal} aria-label={title}>
    <header><h2>{title}</h2><LibraryToggle onClick={onClose} aria-label="닫기">닫기</LibraryToggle></header>
    {children}
  </Dialog>;
}
const Dialog = styled.dialog(({ theme }) => ({
  width: 'min(560px, calc(100% - 32px))', maxHeight: '90dvh', padding: theme.space[4], boxSizing: 'border-box',
  color: theme.color.ink, background: theme.color.bgMid, border: '1px solid ' + theme.color.primary,
  '&::backdrop': { background: 'rgba(0,0,0,.75)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.space[4] },
  h2: { margin: 0, fontSize: theme.size.lg },
}));
