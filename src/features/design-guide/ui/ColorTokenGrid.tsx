'use client';
import styled from 'styled-components';
import { COLOR_TOKEN_LIST } from '../designGuideContent';

export function ColorTokenGrid() {
  return (
    <Grid>
      {COLOR_TOKEN_LIST.map((color) => (
        <Item key={color.token}>
          <Swatch style={{ background: color.value }} />
          <Name>{color.name}</Name>
          <Value>{color.token} · {color.value}</Value>
        </Item>
      ))}
    </Grid>
  );
}

const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;`;
const Item = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const Swatch = styled.div`height: 72px; border: 1px solid ${({ theme }) => theme.color.primaryLineWeak};`;
const Name = styled.span`font-size: 16px; font-weight: ${({ theme }) => theme.weight.bold};`;
const Value = styled.span`font: 12px/1.4 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.inkMuted};`;
