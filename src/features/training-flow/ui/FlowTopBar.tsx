'use client';
import Link from 'next/link';
import styled from 'styled-components';
import { cutCorner } from '@/styles/mixins';

interface FlowTopBarProps { isSelectPhase: boolean; productName: string; onBack: () => void; }

/** 상단: 왼쪽 "교육 선택"(분해 화면에서는 뒤로가기), 오른쪽 도면 업데이트 */
export function FlowTopBar({ isSelectPhase, productName, onBack }: FlowTopBarProps) {
  return (
    <>
      <Left>
        {isSelectPhase
          ? <ScreenTitle>교육 선택</ScreenTitle>
          : <BackButton type="button" onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>교육 선택</BackButton>}
        {!isSelectPhase && <ProductName>{productName}</ProductName>}
      </Left>
      {isSelectPhase && (
        <Right>
          <HeaderLink href="/training/complex">복합 모델</HeaderLink>
          <HeaderLink href="/training/upload">도면 업데이트</HeaderLink>
        </Right>
      )}
    </>
  );
}

const Left = styled.div`position: absolute; left: 64px; top: 52px; display: flex; align-items: center; gap: 20px;`;
const ScreenTitle = styled.h1`margin: 0; font-size: ${({ theme }) => theme.size.display}px; line-height: 1; font-weight: ${({ theme }) => theme.weight.bold};`;
const ProductName = styled.span`font-size: ${({ theme }) => theme.size.xl}px; font-weight: ${({ theme }) => theme.weight.bold};`;
const BackButton = styled.button`
  display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 18px; cursor: pointer; font: inherit; font-size: 16px;
  color: ${({ theme }) => theme.color.ink}; background: rgba(10,8,6,.55); border: 1px solid rgba(243,115,33,.6); ${({ theme }) => cutCorner(theme.cut.sm)};
  svg { color: ${({ theme }) => theme.color.primary}; } &:hover { background: rgba(243,115,33,.2); }
`;
const Right = styled.div`position: absolute; right: 64px; top: 52px; display: flex; gap: 12px;`;
const HeaderLink = styled(Link)`
  display: inline-flex; align-items: center; height: 48px; padding: 0 20px; border: 1px solid rgba(243,115,33,.7); background: rgba(243,115,33,.05);
  color: ${({ theme }) => theme.color.ink}; font-size: ${({ theme }) => theme.size.md}px; ${({ theme }) => cutCorner(theme.cut.sm)};
  &:hover { background: rgba(243,115,33,.2); color: ${({ theme }) => theme.color.ink}; }
`;
