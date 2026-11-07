'use client';
import Link from 'next/link';
import { useState } from 'react';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';

/** 최종 리포트 (전체 구간 완료 후 1회) */
export function ReportModal({ startedAt, mistakeCount, overTorqueCount, hintCount }: { startedAt: number; mistakeCount: number; overTorqueCount: number; hintCount: number }) {
  const [elapsedSeconds] = useState(() => Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
  const metricList = [
    ['소요 시간', `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`],
    ['실수', String(mistakeCount)], ['과체결', String(overTorqueCount)], ['힌트 사용', String(hintCount)],
  ];
  return (
    <Dim>
      <Panel>
        <Title>교육 완료</Title>
        <Grid>{metricList.map(([label, value]) => <Metric key={label}><Value>{value}</Value><Label>{label}</Label></Metric>)}</Grid>
        <CutButton as={Link} href="/training">교육 선택으로</CutButton>
      </Panel>
    </Dim>
  );
}

const Dim = styled.div`position: absolute; inset: 0; z-index: 95; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.55);`;
const Panel = styled.div`width: 720px; padding: 32px; display: flex; flex-direction: column; gap: 24px; background: rgba(10,8,6,.9); border: 1px solid rgba(243,115,33,.6); border-top: 2px solid ${({ theme }) => theme.color.success};`;
const Title = styled.span`font-size: 32px; font-weight: 700; color: ${({ theme }) => theme.color.success};`;
const Grid = styled.div`display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;`;
const Metric = styled.div`display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid rgba(243,115,33,.3);`;
const Value = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 30px; font-weight: 700;`;
const Label = styled.span`font-size: 14px; color: ${({ theme }) => theme.color.inkMuted};`;
