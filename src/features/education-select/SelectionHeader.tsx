'use client';
import Link from 'next/link';
import styled from 'styled-components';

/** Demo 1.dc.html: header와 isProdScr 버튼. */
export function SelectionHeader({ isVisible, isProcess = false }: { isVisible: boolean; isProcess?: boolean }) {
  return <>
    <Header $isVisible={isVisible && !isProcess} $isProcess={isProcess}>
      <Brand>HANWHA · MR ASSEMBLY TRAINING</Brand>
      <Title>교육 선택</Title>
      <Subtitle>조립할 제품을 선택하세요</Subtitle>
    </Header>
    {isVisible && <Upload href="/training/upload" $isProcess={isProcess}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f37321" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" />
      </svg>
      <span>조립품 가져오기</span>
    </Upload>}
  </>;
}

const Header = styled.div<{ $isVisible: boolean; $isProcess: boolean }>`
  position: absolute; left: 64px; top: 52px; display: flex; flex-direction: column; gap: 12px;
  transition: opacity .6s, transform .6s cubic-bezier(.2,0,0,1);
  opacity: ${({ $isVisible }) => $isVisible ? 1 : 0}; transform: translateY(${({ $isVisible, $isProcess }) => $isVisible || $isProcess ? 0 : -20}px);
  pointer-events: ${({ $isProcess }) => $isProcess ? 'none' : 'auto'};
`;
const Brand = styled.span`
  white-space: nowrap; font: 500 13px/1 ${({ theme }) => theme.font.mono}; color: #f37321; letter-spacing: .2em;
`;
const Title = styled.h1`
  margin: 0; white-space: nowrap; font: 700 44px/1.1 'NexonLv2Gothic';
  text-shadow: -2px 0 rgba(255,59,78,.45), 2px 0 rgba(63,224,208,.35);
`;
const Subtitle = styled.span`white-space: nowrap; font: 400 17px/1 'NexonLv2Gothic'; color: #e6eaec;`;
const Upload = styled(Link)<{ $isProcess: boolean }>`
  position: absolute; right: 64px; top: 56px; z-index: 5; display: flex; align-items: center; gap: 10px;
  height: 48px; padding: 0 18px; border: 1px solid rgba(243,115,33,.7); background: rgba(243,115,33,.05);
  color: #f2ede8; text-decoration: none; cursor: pointer;
  opacity: ${({ $isProcess }) => $isProcess ? 0 : 1}; pointer-events: ${({ $isProcess }) => $isProcess ? 'none' : 'auto'}; transition: opacity .45s ease;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  span { white-space: nowrap; font: 400 15px/1 'NexonLv2Gothic'; }
  &:hover { background: rgba(243,115,33,.2); color: #f2ede8; }
`;
