import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useAssemblyEditor } from './useAssemblyEditor';
import { AssemblyPartList } from './AssemblyPartList';
import { AssemblyPartEditor } from './AssemblyPartEditor';
import { AssemblyPreview } from './AssemblyPreview';
import { ActionButton, Muted } from '../ui/sharedStyles';
import { TaskFooter } from '../ui/TaskFooter';
import { AssemblyDataDialog } from './AssemblyDataDialog';
import type { AssemblyDocument } from './assemblyTypes';
import type { LibraryAssemblyModel } from './loadLibraryAssemblyModel';

export function AssemblyWorkspace({ isActive, library, saveReview }: { isActive: boolean; library?: { seed: AssemblyDocument; models: Map<string, LibraryAssemblyModel> }; saveReview?: () => boolean }) {
  const editor = useAssemblyEditor(isActive, library?.seed, saveReview);
  const jsonInput = useRef<HTMLInputElement>(null);
  const [isDataOpen, setIsDataOpen] = useState(false);
  if (!isActive) return null;
  const isBlocked = !editor.state || !!editor.pendingIds.length;
  return <>
    <Banner><strong>{library ? '라이브러리 GLB 조립' : '조립품 편집 예시'}</strong><Steps><b>1</b> 부품 선택 <span>→</span> <b>2</b> 수정하며 3D 확인 <span>→</span> <b>3</b> 저장</Steps><Muted>{library ? 'PDF 수량대로 초기 배치 · ' + library.seed.partList.length + '개' : 'PDF 분석과 별도 예시 · 10개 부품'}</Muted></Banner>
    <Workspace aria-label="조립품 편집 작업 화면" data-assembly-status={editor.state ? editor.pendingIds.length ? 'pending' : 'ready' : 'loading'}>
      {editor.state ? <><AssemblyPartList editor={editor} /><AssemblyPreview editor={editor} models={library?.models} /><AssemblyPartEditor editor={editor} /></> : <Empty role="status">조립품을 준비하고 있습니다.</Empty>}
    </Workspace>
    <TaskFooter isError={!!editor.error || !!editor.pendingIds.length} message={<Feedback><State $changed={!!editor.isDirty}>{editor.pendingIds.length ? '입력 확인' : editor.isDirty ? '미저장' : editor.state?.hasSaved ? '저장됨' : library ? '초기 배치' : '예시'}</State><span>{editor.error || (editor.pendingIds.length ? editor.document?.partList.filter((part) => editor.pendingIds.includes(part.id)).map((part) => part.name).join(', ') + '의 입력값을 확인해 주세요.' : editor.message || '변경한 내용을 3D에서 확인한 뒤 저장하세요.')}</span></Feedback>} items={[
      { label: '저장한 상태로 되돌리기', ariaLabel: '저장값 복원', group: '복원', onClick: editor.restore, disabled: !editor.state },
      { label: '파일 불러오기', ariaLabel: '조립품 JSON 불러오기', description: '보관한 JSON 파일에서 이어서 편집', group: '파일', onClick: () => jsonInput.current?.click(), disabled: !editor.state },
      { label: '파일로 내보내기', ariaLabel: '조립품 JSON 내보내기', description: 'JSON 파일 · 다른 PC에서도 사용', group: '파일', onClick: editor.exportJson, disabled: isBlocked },
      { label: '입력 데이터 보기', ariaLabel: '입력 데이터', group: '고급', onClick: () => setIsDataOpen(true), disabled: !editor.state },
      { label: library ? '처음 배치로 되돌리기' : '예시 처음부터 시작', ariaLabel: library ? '배치 초기화' : '예시 초기화', group: '다시 시작', onClick: editor.reset, danger: true, disabled: !editor.state },
    ]}><ActionButton $primary disabled={isBlocked} onClick={editor.save}>조립품 저장</ActionButton></TaskFooter>
    {isDataOpen && editor.state && <AssemblyDataDialog editor={editor} onClose={() => setIsDataOpen(false)} />}
    <input ref={jsonInput} aria-label="조립품 JSON 선택" type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void editor.importJson(file); event.target.value = ''; }} />
  </>;
}
const Banner = styled.div(({ theme }) => ({ position: 'absolute', top: theme.space[8] * 4 + theme.space[4], left: theme.space[8], right: theme.space[8], display: 'flex', alignItems: 'center', gap: theme.space[5], padding: theme.space[3] + 'px ' + theme.space[4] + 'px', minHeight: theme.space[6], border: '1px solid ' + theme.color.primaryLine, background: theme.color.primaryFill, fontSize: theme.size.md, strong: { fontWeight: theme.weight.medium, color: theme.color.primarySoft } }));
const Workspace = styled.div(({ theme }) => ({ position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 5 + theme.space[2], bottom: theme.space[8] + theme.space[5], display: 'grid', gridTemplateColumns: 'minmax(0,.65fr) minmax(0,1.7fr) minmax(0,1.1fr)', gap: theme.space[4] }));
const Empty = styled.div(({ theme }) => ({ gridColumn: '1 / -1', display: 'grid', placeItems: 'center', border: '1px solid ' + theme.color.primaryLineWeak, fontSize: theme.size.xl }));
const Steps = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3], flex: 1, b: { color: theme.color.primarySoft }, span: { color: theme.color.inkMuted } }));
const Feedback = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3] }));
const State = styled.strong<{ $changed: boolean }>(({ theme, $changed }) => ({ flexShrink: 0, fontSize: theme.size.sm, fontWeight: theme.weight.medium, color: $changed ? theme.color.warning : theme.color.success }));
