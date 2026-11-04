'use client';
import styled from 'styled-components';

/** 상단 중앙: 단계 태그 + 한 줄 안내 (도구 이름만, 클릭 위치 안내 없음) · 박스 없이 글자만 */
export function GuideLine({ stepLabel, guide }: { stepLabel: string; guide: string }) {
  return (
    <Root>
      <Tag>{stepLabel}</Tag>
      {guide && <Text>{guide}</Text>}
    </Root>
  );
}

const Root = styled.div`position: absolute; left: 360px; top: 232px; width: 1200px; display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; z-index: 20;`;
const Tag = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 12px; letter-spacing: .2em; color: ${({ theme }) => theme.color.primary};`;
const Text = styled.span`font-size: 28px; font-weight: 700; text-shadow: 0 2px 12px rgba(0,0,0,.8);`;
