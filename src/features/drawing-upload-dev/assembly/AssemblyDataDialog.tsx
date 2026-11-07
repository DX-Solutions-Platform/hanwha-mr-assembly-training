import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { AssemblyDataView } from './AssemblyDataView';
import { SmallAssemblyButton } from './assemblyStyles';
import type { useAssemblyEditor } from './useAssemblyEditor';

export function AssemblyDataDialog({ editor, onClose }: { editor: ReturnType<typeof useAssemblyEditor>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <Dialog ref={ref} aria-labelledby="assembly-data-title" onCancel={onClose} onClose={(event) => { if (!event.currentTarget.open) onClose(); }} onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled)'));
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onClick={(event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onClose();
  }}><Header><h2 id="assembly-data-title">조립품 입력 데이터</h2><SmallAssemblyButton autoFocus onClick={onClose}>닫기</SmallAssemblyButton></Header><AssemblyDataView editor={editor} /></Dialog>;
}
const Dialog = styled.dialog(({ theme }) => ({ width: 'min(90vw,' + theme.space[8] * 14 + 'px)', height: '80vh', maxHeight: 'none', padding: theme.space[5], background: theme.color.bgMid, color: theme.color.ink, border: '1px solid ' + theme.color.primaryLine, fontFamily: theme.font.main, '&::backdrop': { background: theme.color.panelStrong }, '&[open]': { display: 'flex', flexDirection: 'column', gap: theme.space[4] } }));
const Header = styled.div(({ theme }) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.space[4], flexShrink: 0, h2: { margin: 0, fontSize: theme.size.xl } }));
