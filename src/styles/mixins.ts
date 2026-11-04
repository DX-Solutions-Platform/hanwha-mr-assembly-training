import { css } from 'styled-components';

export const cutCorner = (size: number) => css`
  clip-path: polygon(0 0, calc(100% - ${size}px) 0, 100% ${size}px, 100% 100%, ${size}px 100%, 0 calc(100% - ${size}px));
`;

export const monoLabel = css`
  font-family: ${({ theme }) => theme.font.mono};
  font-weight: ${({ theme }) => theme.weight.medium};
  letter-spacing: .16em;
  white-space: nowrap;
`;

export const glassPanel = css`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.primaryLine};
  backdrop-filter: blur(6px);
`;
