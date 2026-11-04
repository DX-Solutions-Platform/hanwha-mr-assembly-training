'use client';
import styled from 'styled-components';
import type { TrainingMode } from '../state/hudReducer';

/** 하단 오른쪽: 시점 초기화(F) · 음성 안내 · 연습/평가 모드 */
export function ViewControls({ isVoiceOn, onToggleVoice, mode, onChangeMode }: { isVoiceOn: boolean; onToggleVoice: () => void; mode: TrainingMode; onChangeMode: (mode: TrainingMode) => void }) {
  return (
    <Root>
      <Chip onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }))}><Key>F</Key>시점 초기화</Chip>
      <Chip onClick={onToggleVoice} $isOn={isVoiceOn}>음성 안내 {isVoiceOn ? 'ON' : 'OFF'}</Chip>
      <Segment>
        <SegmentItem $isOn={mode === 'practice'} onClick={() => onChangeMode('practice')}>연습 모드</SegmentItem>
        <SegmentItem $isOn={mode === 'eval'} onClick={() => onChangeMode('eval')}>평가 모드</SegmentItem>
      </Segment>
    </Root>
  );
}

const Root = styled.div`position: absolute; right: 48px; bottom: 40px; display: flex; gap: 10px; z-index: 30;`;
const Chip = styled.button<{ $isOn?: boolean }>`display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 16px; font-size: 14px; border: 1px solid ${({ $isOn }) => ($isOn ? '#f37321' : 'rgba(243,115,33,.45)')}; background: rgba(10,8,6,.55); &:hover { background: rgba(243,115,33,.16); }`;
const Key = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 11px; padding: 3px 6px; border: 1px solid rgba(243,115,33,.6);`;
const Segment = styled.div`display: flex; border: 1px solid rgba(243,115,33,.45);`;
const SegmentItem = styled.button<{ $isOn: boolean }>`height: 42px; padding: 0 16px; font-size: 14px; background: ${({ $isOn }) => ($isOn ? '#f37321' : 'rgba(10,8,6,.55)')}; color: ${({ theme, $isOn }) => ($isOn ? theme.color.onPrimary : theme.color.ink)}; font-weight: ${({ $isOn }) => ($isOn ? 700 : 400)};`;
