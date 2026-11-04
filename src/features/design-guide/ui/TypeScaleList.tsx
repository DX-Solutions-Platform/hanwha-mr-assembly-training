'use client';
import styled from 'styled-components';
import { TYPE_SCALE_LIST } from '../designGuideContent';

/** 폰트: NEXON Lv2 Gothic(400·700) + JetBrains Mono(400·500·700) · 최대 굵기 700 */
export function TypeScaleList() {
  return (
    <List>
      {[...TYPE_SCALE_LIST].reverse().map((item) => (
        <Row key={item.token}>
          <Meta>{item.token} · {item.size}px</Meta>
          <Sample style={{ fontSize: item.size }}>토크 렌치를 가져오세요.</Sample>
        </Row>
      ))}
      <Row><Meta>mono · 13px</Meta><Mono>STEP 03 / 08 · 12 N·m</Mono></Row>
    </List>
  );
}

const List = styled.div`display: flex; flex-direction: column; gap: 14px;`;
const Row = styled.div`display: grid; grid-template-columns: 160px minmax(0, 1fr); align-items: baseline; gap: 20px;`;
const Meta = styled.span`font: 12px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.inkMuted};`;
const Sample = styled.span`line-height: 1.25; font-weight: ${({ theme }) => theme.weight.bold};`;
const Mono = styled.span`font: ${({ theme }) => theme.weight.medium} 13px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primary}; letter-spacing: .14em;`;
