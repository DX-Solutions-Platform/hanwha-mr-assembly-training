'use client';
import styled from 'styled-components';

export function ThinProgress({ percent, tone = 'primary' }: { percent: number; tone?: 'primary' | 'success' }) {
  return <Track><Fill style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} $tone={tone} /></Track>;
}

const Track = styled.div`height: 3px; background: rgba(243,115,33,.18);`;
const Fill = styled.div<{ $tone: 'primary' | 'success' }>`height: 3px; background: ${({ theme, $tone }) => theme.color[$tone]}; transition: width ${({ theme }) => theme.motion.base};`;
