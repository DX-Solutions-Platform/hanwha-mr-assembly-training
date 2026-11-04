'use client';
import styled from 'styled-components';

/** 상단: 제품명 + 구간 진행 바 (구간명 · 단계 n/N · TOTAL %) */
export function TopProgressBar({ productName, sectionName, stepIndex, totalStepCount }: { productName: string; sectionName: string; stepIndex: number; totalStepCount: number }) {
  const totalPercent = totalStepCount ? Math.round((stepIndex / totalStepCount) * 100) : 0;
  return (
    <Root>
      <Product>{productName}</Product>
      <Row><span>{sectionName}</span><Mono>단계 {stepIndex + 1}/{totalStepCount || 1}</Mono><Mono $isAccent>TOTAL {totalPercent}%</Mono></Row>
      <Track><Fill style={{ width: `${totalPercent}%` }} /></Track>
    </Root>
  );
}

const Root = styled.div`position: absolute; left: 200px; top: 40px; width: 560px; display: flex; flex-direction: column; gap: 8px; z-index: 30;`;
const Product = styled.span`font-size: 22px; font-weight: 700;`;
const Row = styled.div`display: flex; gap: 16px; align-items: baseline; font-size: 14px; color: ${({ theme }) => theme.color.inkSub};`;
const Mono = styled.span<{ $isAccent?: boolean }>`font-family: ${({ theme }) => theme.font.mono}; font-size: 12px; color: ${({ theme, $isAccent }) => ($isAccent ? theme.color.primary : theme.color.inkMuted)}; &:last-child { margin-left: auto; }`;
const Track = styled.div`height: 2px; background: rgba(243,115,33,.2);`;
const Fill = styled.div`height: 2px; background: #f37321; box-shadow: 0 0 8px rgba(243,115,33,.8); transition: width .3s;`;
