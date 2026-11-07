import { useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';
import { Muted } from '../ui/sharedStyles';
import { StepPreviewBoundary } from '../model/StepPreviewBoundary';
import { SmallAssemblyButton } from './assemblyStyles';
import { ActionMenu } from '../ui/ActionMenu';
import type { useAssemblyEditor } from './useAssemblyEditor';
import type { LibraryAssemblyModel } from './loadLibraryAssemblyModel';

const AssemblyScene = dynamic(() => import('./AssemblyScene'), { ssr: false, loading: () => <p>조립품 3D를 준비하고 있습니다.</p> });
export function AssemblyPreview({ editor, models }: { editor: ReturnType<typeof useAssemblyEditor>; models?: Map<string, LibraryAssemblyModel> }) {
  const [isExploded, setIsExploded] = useState(false), [isIsolated, setIsIsolated] = useState(false), [showConnections, setShowConnections] = useState(true);
  const [command, setCommand] = useState(0), [previewKey, setPreviewKey] = useState(0);
  return <ReviewPanel aria-label="조립품 3D 미리보기" data-assembly-selected={editor.state!.selectedId} data-assembly-exploded={isExploded}>
    <ReviewHeader><ReviewTitle>3D 미리보기</ReviewTitle><ViewControls><Modes aria-label="조립품 보기 방식"><Mode type="button" aria-label="조립 상태 보기" aria-pressed={!isExploded} $active={!isExploded} onClick={() => setIsExploded(false)}>조립</Mode><Mode type="button" aria-label="분해 미리보기" aria-pressed={isExploded} $active={isExploded} onClick={() => setIsExploded(true)}>분해</Mode></Modes><ActionMenu label="보기" compact direction="down" items={[
      { label: '전체가 보이게 맞추기', ariaLabel: '전체 맞춤', onClick: () => setCommand((value) => value + 1) },
      { label: '선택 부품만 보기', ariaLabel: isIsolated ? '모든 부품 표시' : '선택 부품만 표시', checked: isIsolated, onClick: () => setIsIsolated((value) => !value) },
      { label: '결합점 표시', ariaLabel: showConnections ? '결합점 숨기기' : '결합점 표시', checked: showConnections, onClick: () => setShowConnections((value) => !value) },
    ]} /></ViewControls></ReviewHeader>
    <Info><strong>{editor.selected!.name}</strong><Muted>드래그 회전 · 휠 확대 · 형상 클릭 선택</Muted></Info>
    <Viewport aria-label="조립품 3D 표시 영역"><StepPreviewBoundary key={previewKey} onRetry={() => setPreviewKey((value) => value + 1)}>
      <AssemblyScene document={editor.document!} matrices={editor.matrices} selectedId={editor.state!.selectedId} isExploded={isExploded} isIsolated={isIsolated} showConnections={showConnections} command={command} onSelect={editor.select} models={models} />
    </StepPreviewBoundary></Viewport>
    <Note>{isExploded ? '분해 미리보기 · 저장 위치는 바뀌지 않습니다.' : '선택한 부품이 주황색으로 표시됩니다.'}<span>{models ? '라이브러리 GLB · 모델 기준면으로 결합' : '교육용 예시 · 간섭·체결토크 검증 미포함'}</span></Note>
  </ReviewPanel>;
}
const Info = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], fontSize: theme.size.md, flexShrink: 0 }));
const Viewport = styled.div(({ theme }) => ({ position: 'relative', flex: 1, minHeight: theme.space[8] * 3, background: theme.color.bgMid, overflow: 'hidden' }));
const ViewControls = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3] }));
const Modes = styled.div(({ theme }) => ({ display: 'flex', border: '1px solid ' + theme.color.primaryLineWeak }));
const Mode = styled(SmallAssemblyButton)<{ $active: boolean }>(({ theme, $active }) => ({ border: 0, clipPath: 'none', minWidth: theme.space[8], background: $active ? theme.color.primaryFill : 'transparent', color: $active ? theme.color.primarySoft : theme.color.inkMuted, boxShadow: $active ? 'inset 0 0 0 1px ' + theme.color.primary : 'none' }));
const Note = styled.div(({ theme }) => ({ display: 'flex', justifyContent: 'space-between', gap: theme.space[3], padding: theme.space[3], color: theme.color.inkMuted, fontSize: theme.size.xs, lineHeight: 1.6, borderTop: '1px solid ' + theme.color.primaryLineWeak, flexShrink: 0 }));
