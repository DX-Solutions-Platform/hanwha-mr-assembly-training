'use client';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { monoLabel } from '@/styles/mixins';

/** 디자인 가이드 섹션 틀 */
export function GuideSection({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <Root>
      <Header><Code>{code}</Code><Title>{title}</Title></Header>
      {children}
    </Root>
  );
}

const Root = styled.section`display: flex; flex-direction: column; gap: 20px; padding: 40px 0; border-top: 1px solid ${({ theme }) => theme.color.primaryLineWeak};`;
const Header = styled.div`display: flex; align-items: baseline; gap: 14px;`;
const Code = styled.span`${monoLabel}; font-size: 13px; color: ${({ theme }) => theme.color.primary};`;
const Title = styled.h2`margin: 0; font-size: ${({ theme }) => theme.size.xxl}px; font-weight: ${({ theme }) => theme.weight.bold};`;
