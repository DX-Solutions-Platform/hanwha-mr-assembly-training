'use client';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { monoLabel } from '@/styles/mixins';

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Root>
      <TextGroup>
        <Eyebrow>HANWHA · MR ASSEMBLY TRAINING</Eyebrow>
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </TextGroup>
      {action}
    </Root>
  );
}

const Root = styled.header`position: absolute; left: 64px; top: 48px; right: 64px; display: flex; justify-content: space-between; align-items: flex-start; z-index: 10;`;
const TextGroup = styled.div`display: flex; flex-direction: column; gap: 12px;`;
const Eyebrow = styled.span`${monoLabel}; font-size: 13px; color: ${({ theme }) => theme.color.primary}; letter-spacing: .2em;`;
const Title = styled.h1`margin: 0; font-size: ${({ theme }) => theme.size.display}px; line-height: 1.1;`;
const Subtitle = styled.p`margin: 0; font-size: ${({ theme }) => theme.size.base}px; color: ${({ theme }) => theme.color.inkSub};`;
