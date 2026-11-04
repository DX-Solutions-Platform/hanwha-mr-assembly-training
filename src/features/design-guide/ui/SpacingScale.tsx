'use client';
import styled from 'styled-components';
import { SPACE_SCALE_LIST } from '../designGuideContent';

export function SpacingScale() {
  return (
    <List>
      {SPACE_SCALE_LIST.map((item) => (
        <Row key={item.token}><Meta>space.{item.token} · {item.size}px</Meta><Bar style={{ width: item.size * 4 }} /></Row>
      ))}
    </List>
  );
}

const List = styled.div`display: flex; flex-direction: column; gap: 10px;`;
const Row = styled.div`display: grid; grid-template-columns: 160px minmax(0, 1fr); align-items: center; gap: 20px;`;
const Meta = styled.span`font: 12px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.inkMuted};`;
const Bar = styled.div`height: 10px; background: ${({ theme }) => theme.color.primary};`;
