'use client';
import styled from 'styled-components';

/**
 * 중앙 확대창 (모서리 브래킷).
 * 세밀 작업은 이 안에서 회전·확대, 창 밖으로 튀어나오지 않음 (overflow hidden + 별도 카메라 scissor 렌더).
 * 구현: drei <View> 또는 renderer.setScissor로 이 영역에 확대 카메라를 렌더하세요.
 */
export function ZoomWindow({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return (
    <Root>
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => <Bracket key={corner} $corner={corner} />)}
      <Label>ZOOM</Label>
    </Root>
  );
}

const Root = styled.div`position: absolute; left: 660px; top: 300px; width: 600px; height: 470px; overflow: hidden; pointer-events: none; z-index: 10;`;
const Bracket = styled.span<{ $corner: 'tl' | 'tr' | 'bl' | 'br' }>`
  position: absolute; width: 34px; height: 34px; border-color: #f37321; border-style: solid; border-width: 0;
  ${({ $corner }) => ({ tl: 'left:0;top:0;border-left-width:2px;border-top-width:2px;', tr: 'right:0;top:0;border-right-width:2px;border-top-width:2px;', bl: 'left:0;bottom:0;border-left-width:2px;border-bottom-width:2px;', br: 'right:0;bottom:0;border-right-width:2px;border-bottom-width:2px;' })[$corner]}
`;
const Label = styled.span`position: absolute; left: 14px; top: 12px; font-family: ${({ theme }) => theme.font.mono}; font-size: 10px; letter-spacing: .2em; color: ${({ theme }) => theme.color.primary};`;
