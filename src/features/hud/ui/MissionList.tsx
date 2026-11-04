'use client';
import styled from 'styled-components';
import type { AssemblyStep } from '@/types/training';

/** 오른쪽 상단: 구간 미션 목록 (완료 · 진행 중 · 대기) */
export function MissionList({ stepList, stepIndex }: { stepList: AssemblyStep[]; stepIndex: number }) {
  return (
    <Root>
      <Title>MISSION</Title>
      {stepList.map((step, index) => {
        const state = index < stepIndex ? 'done' : index === stepIndex ? 'now' : 'idle';
        return <Item key={step.id} $state={state}><Mark $state={state} />{step.guide}</Item>;
      })}
    </Root>
  );
}

const Root = styled.div`position: absolute; right: 48px; top: 40px; width: 380px; display: flex; flex-direction: column; gap: 8px; padding: 16px 18px; background: rgba(10,8,6,.5); border: 1px solid rgba(243,115,33,.35); transform: perspective(1200px) rotateY(-14deg); transform-origin: right center; z-index: 30;`;
const Title = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 12px; letter-spacing: .2em; color: ${({ theme }) => theme.color.primary};`;
const Item = styled.div<{ $state: string }>`display: flex; gap: 10px; align-items: baseline; font-size: 14px; line-height: 1.45; font-weight: ${({ $state }) => ($state === 'now' ? 700 : 400)}; color: ${({ theme, $state }) => ($state === 'done' ? theme.color.success : $state === 'now' ? theme.color.ink : theme.color.inkDisabled)};`;
const Mark = styled.span<{ $state: string }>`width: 8px; height: 8px; flex: none; transform: rotate(45deg); background: ${({ theme, $state }) => ($state === 'done' ? theme.color.success : $state === 'now' ? theme.color.primary : 'transparent')}; border: 1px solid ${({ theme, $state }) => ($state === 'idle' ? theme.color.inkDisabled : 'transparent')};`;
