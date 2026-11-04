'use client';
import Link from 'next/link';
import styled from 'styled-components';
import { cutCorner } from '@/styles/mixins';

const BACK_ICON = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;

/** 왼쪽 상단: 뒤로가기 · 일시정지. onBack이 있으면 같은 화면 안에서 공정 선택으로 돌아감 */
export function CornerButtons({ onPause, onBack }: { onPause: () => void; onBack?: () => void }) {
  return (
    <Root>
      {onBack
        ? <IconButton type="button" onClick={onBack} aria-label="뒤로가기">{BACK_ICON}</IconButton>
        : <IconButton as={Link} href="/training" aria-label="뒤로가기">{BACK_ICON}</IconButton>}
      <IconButton type="button" onClick={onPause} aria-label="일시정지"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg></IconButton>
    </Root>
  );
}

const Root = styled.div`position: absolute; left: 40px; top: 36px; display: flex; gap: 10px; z-index: 40;`;
const IconButton = styled.button`
  width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; color: ${({ theme }) => theme.color.ink}; cursor: pointer;
  background: rgba(10,8,6,.55); border: 1px solid rgba(243,115,33,.6); ${({ theme }) => cutCorner(theme.cut.sm)};
  &:hover { background: rgba(243,115,33,.2); color: ${({ theme }) => theme.color.ink}; }
`;
