'use client';
import styled from 'styled-components';
import type { PracticeState } from './practiceTypes';

interface ControlsProps { state: PracticeState; voice: boolean; onResetView: () => void; onVoice: () => void; onMode: (mode: 'practice' | 'eval') => void; onEdit: () => void; onHeight: (height: number) => void; onResetLayout: () => void; }
export function PracticeControls({ state, voice, onResetView, onVoice, onMode, onEdit, onHeight, onResetLayout }: ControlsProps) {
  return <Controls>
    {state.isLayoutEditing && <Height><Arrow onClick={() => onHeight(Math.max(-0.3, Math.min(0.4, state.benchHeight - 0.05)))}>▼</Arrow><span>작업 지그 높이 <b>{state.benchHeight >= 0 ? '+' : ''}{Math.round(state.benchHeight * 100)}cm</b></span><Arrow onClick={() => onHeight(Math.max(-0.3, Math.min(0.4, state.benchHeight + 0.05)))}>▲</Arrow></Height>}
    <Chip type="button" onClick={onResetView}><Icon kind="reset" /><span>시점 초기화</span><Key>F</Key></Chip>
    <Chip type="button" onClick={onVoice} $on={voice}><Icon kind="voice" /><span>음성 안내</span></Chip>
    <Modes>{(['practice', 'eval'] as const).map((mode) => <Mode key={mode} type="button" $on={state.mode === mode} onClick={() => onMode(mode)}>{mode === 'practice' ? '연습 모드' : '평가 모드'}</Mode>)}</Modes>
    {state.isLayoutEditing && <ResetLayout type="button" onClick={onResetLayout}>위치 초기화</ResetLayout>}
    <Edit type="button" onClick={onEdit} $on={state.isLayoutEditing}><Icon kind="edit" /><span>배치 편집</span><Key>L</Key></Edit>
  </Controls>;
}
function Icon({ kind }: { kind: 'reset' | 'voice' | 'edit' }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'reset' ? <><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></> : kind === 'voice' ? <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M19 6a8 8 0 0 1 0 12" /></> : <path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />}
  </svg>;
}
const Controls = styled.div`position: absolute; right: 40px; bottom: 30px; display: flex; gap: 8px; pointer-events: auto;`;
const Chip = styled.button<{ $on?: boolean }>`height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 14px; cursor: pointer; border: 1px solid rgba(243,115,33,.6); background: ${({ $on }) => $on ? '#f37321' : 'rgba(10,8,6,.6)'}; color: ${({ $on }) => $on ? '#140a04' : '#f37321'}; span { white-space: nowrap; font: 700 14px/1 'NexonLv2Gothic'; } &:hover { box-shadow: 0 0 16px rgba(243,115,33,.5); }`;
const Key = styled.span`&& { font: 500 11px/1 ${({ theme }) => theme.font.mono}; opacity: .8; }`;
const Modes = styled.div`height: 44px; display: flex; border: 1px solid rgba(243,115,33,.6); background: rgba(10,8,6,.6);`;
const Mode = styled.button<{ $on: boolean }>`height: 42px; display: flex; align-items: center; padding: 0 14px; cursor: pointer; background: ${({ $on }) => $on ? '#f37321' : 'transparent'}; color: ${({ $on }) => $on ? '#140a04' : '#eef1f2'}; font: 700 14px/1 'NexonLv2Gothic'; white-space: nowrap;`;
const Edit = styled(Chip)`gap: 10px; padding: 0 16px; border: 1px solid #f37321; clip-path: polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));`;
const Height = styled.div`height: 44px; display: flex; align-items: center; gap: 2px; border: 1px solid rgba(243,115,33,.5); background: rgba(10,8,6,.6); span { white-space: nowrap; padding: 0 8px; font: 400 13px/1 'NexonLv2Gothic'; color: #eef1f2; } b { font-family: ${({ theme }) => theme.font.mono}; font-weight: 400; color: #ffb07a; }`;
const Arrow = styled.button`height: 42px; width: 40px; display: flex; align-items: center; justify-content: center; font: 700 14px/1 ${({ theme }) => theme.font.mono}; color: #f37321; &:hover { background: rgba(243,115,33,.2); }`;
const ResetLayout = styled.button`height: 44px; display: flex; align-items: center; padding: 0 16px; cursor: pointer; border: 1px solid rgba(243,115,33,.5); font: 400 14px/1 'NexonLv2Gothic'; color: #eef1f2; &:hover { background: rgba(243,115,33,.16); }`;
