'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { cutCorner } from '@/styles/mixins';

export const trainingTools = {
  step: { href: '/training/upload', label: '3D 파일 분석' },
  pdf: { href: '/training/upload-dev', label: 'PDF 도면 분석' },
  edit: { href: '/training/edit', label: '기존 교육 수정' },
} as const;

export function TrainingToolNavigation({ active, children }: { active?: keyof typeof trainingTools; children?: ReactNode }) {
  return <Navigation aria-label="교육 제작 도구">
    {Object.entries(trainingTools).map(([id, { href, label }]) => <ToolLink key={id} href={href}
      aria-current={active === id ? 'page' : undefined}>{label}</ToolLink>)}
    {children}
  </Navigation>;
}

const Navigation = styled.nav(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: theme.space[2],
}));

const ToolLink = styled(Link)(({ theme }) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minHeight: theme.space[7], paddingInline: theme.space[3], whiteSpace: 'nowrap',
  fontSize: theme.size.md, textDecoration: 'none', color: theme.color.ink,
  background: theme.color.panel, border: '1px solid ' + theme.color.primaryLine,
  '&:hover, &[aria-current="page"]': { background: theme.color.primaryFill, color: theme.color.primarySoft },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}), ({ theme }) => cutCorner(theme.cut.sm));
