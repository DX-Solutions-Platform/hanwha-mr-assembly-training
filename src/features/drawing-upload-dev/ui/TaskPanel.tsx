import { useState } from 'react';
import styled from 'styled-components';
import { getAnalysisTasks, summarizePages } from '../analysisSummary';
import type { AnalysisProgress, AnalysisStatus, DrawingPage } from '../types';
import { Muted, PanelTitle, StateText } from './sharedStyles';

const STATUS_LABEL: Record<string, string> = { idle: '대기', done: '완료', running: '처리 중', error: '오류', cancelled: '중지' };
export function TaskPanel({ progress, status, pageList, file, elapsedMs }: {
  progress: AnalysisProgress; status: AnalysisStatus; pageList: DrawingPage[]; file: File | null; elapsedMs: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const taskList = getAnalysisTasks(progress, status, pageList, file);
  const summary = summarizePages(pageList);
  const percent = Math.round(taskList.reduce((sum, task) => sum + (task.total ? task.completed / task.total : 0), 0) / taskList.length * 100);
  return <Root aria-label="실제 PDF 처리 현황" data-analysis-status={status} data-analysis-elapsed-ms={elapsedMs} data-ocr-active={progress.task === 'ocr' && status === 'running'}>
    <PanelTitle>{status === 'complete' ? summary.ocrFailedCount || summary.ocrEmptyCount ? '분석 완료 · 원문 확인 필요' : '분석 완료' : status === 'cancelled' ? '분석 중지' : '실시간 분석'}<Timer>{(elapsedMs / 1000).toFixed(1)}초 · {percent}%</Timer></PanelTitle>
    <Progress aria-label="PDF 분석 진행률" value={percent} max={100} />
    {status === 'complete' && <DetailToggle onClick={() => setIsExpanded((value) => !value)} aria-expanded={isExpanded}>{isExpanded ? '처리 내역 접기 −' : '처리 내역 ' + taskList.length + '단계 펼치기 +'}</DetailToggle>}
    {(status !== 'complete' || isExpanded) && <TaskList>{taskList.map((task) => <Task key={task.id} $active={task.state === 'running'}>
      <strong>{task.name}</strong><Muted>{task.detail}</Muted>
      <StateText $tone={task.state === 'done' ? 'success' : task.state === 'error' ? 'danger' : task.state === 'running' ? 'warning' : undefined}>{STATUS_LABEL[task.state]}</StateText>
    </Task>)}</TaskList>}
    <Stats>
      <div><b>{summary.tableRowCount}</b><span>부품표 행</span></div>
      <div><b>{summary.dimensionCount}</b><span>치수 표기</span></div>
      <div><b>{summary.codeCount}</b><span>고유 번호</span></div>
    </Stats>
    {summary.ocrPageCount > 0 && <Notice role="status" data-ocr-page-count={summary.ocrPageCount}>스캔 OCR {summary.ocrPageCount}쪽 · 한국어·영문 · 원문 대조 후 확정{summary.ocrLowConfidenceCount > 0 && ' · 낮은 신뢰도 단어 ' + summary.ocrLowConfidenceCount + '개'}{summary.ocrFailedCount > 0 && ' · 인식 실패 ' + summary.ocrFailedCount + '쪽: 더보기에서 다시 분석해 주세요.'}{summary.ocrEmptyCount > 0 && ' · 글자 미검출 ' + summary.ocrEmptyCount + '쪽'}</Notice>}
    {!summary.ocrPageCount && summary.imageOnlyCount > 0 && <Notice role="status">읽을 수 있는 글자가 적은 페이지 {summary.imageOnlyCount}개 · 원문을 확인해 주세요.</Notice>}
  </Root>;
}
const Root = styled.section(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3], flexShrink: 0 }));
const Timer = styled.span(({ theme }) => ({ fontFamily: theme.font.mono, fontSize: theme.size.sm, fontWeight: theme.weight.medium }));
const Progress = styled.progress(({ theme }) => ({
  width: '100%', height: theme.space[1], appearance: 'none', border: 0, background: theme.color.primaryLineWeak,
  '&::-webkit-progress-bar': { background: theme.color.primaryLineWeak },
  '&::-webkit-progress-value': { background: theme.color.primary },
  '&::-moz-progress-bar': { background: theme.color.primary },
}));
const TaskList = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2] }));
const Task = styled.div<{ $active: boolean }>(({ theme, $active }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0,.8fr) minmax(0,1.25fr) auto', alignItems: 'center', gap: theme.space[3],
  padding: theme.space[2] + 'px ' + theme.space[3] + 'px', minHeight: theme.space[5] + theme.space[4], fontSize: theme.size.sm,
  border: '1px solid ' + ($active ? theme.color.primaryLine : theme.color.primaryLineWeak),
  background: $active ? theme.color.primaryFill : theme.color.panel,
  strong: { fontWeight: theme.weight.medium }, '& > span': { overflowWrap: 'anywhere' },
}));
const Stats = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid ' + theme.color.primaryLineWeak,
  '& > div': { display: 'flex', alignItems: 'baseline', gap: theme.space[2], padding: theme.space[3] },
  b: { fontFamily: theme.font.mono, fontSize: theme.size.xl, color: theme.color.primarySoft, fontWeight: theme.weight.medium },
  span: { color: theme.color.inkMuted, fontSize: theme.size.sm },
}));
const Notice = styled.p(({ theme }) => ({ margin: 0, color: theme.color.warning, fontSize: theme.size.sm, lineHeight: 1.6 }));
const DetailToggle = styled.button(({ theme }) => ({ alignSelf: 'flex-end', fontSize: theme.size.sm, color: theme.color.inkMuted, padding: theme.space[1], '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
