'use client';
import styled from 'styled-components';

export function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <Root>
      <Label>{label}</Label>
      {count !== undefined && <Count>{String(count).padStart(2, '0')}</Count>}
    </Root>
  );
}

const Root = styled.div`display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 12px; border-bottom: 1px solid ${({ theme }) => theme.color.primary};`;
const Label = styled.span`font-size: ${({ theme }) => theme.size.lg}px; font-weight: ${({ theme }) => theme.weight.bold}; color: ${({ theme }) => theme.color.primary};`;
const Count = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 14px; color: ${({ theme }) => theme.color.primary};`;
