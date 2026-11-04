'use client';
import Link from 'next/link';
import styled from 'styled-components';
import { cutCorner } from '@/styles/mixins';

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Root href={href}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
      <span>{label}</span>
    </Root>
  );
}

const Root = styled(Link)`
  display: inline-flex; align-items: center; gap: 10px; height: 48px; padding: 0 18px;
  border: 1px solid rgba(243,115,33,.7); background: rgba(243,115,33,.05); color: ${({ theme }) => theme.color.ink};
  font-size: ${({ theme }) => theme.size.md}px; ${({ theme }) => cutCorner(theme.cut.sm)};
  svg { color: ${({ theme }) => theme.color.primary}; }
  &:hover { background: rgba(243,115,33,.2); color: ${({ theme }) => theme.color.ink}; }
`;
