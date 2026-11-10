'use client';
import styled from 'styled-components';

export function ProcessBackdrop({ isFlat = false }: { isFlat?: boolean }) {
  return <Backdrop><Ground $isFlat={isFlat} /></Backdrop>;
}

const Backdrop = styled.div`
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, #07090b 0%, #14100d 75%, #0b0908 100%);
`;
const Ground = styled.div<{ $isFlat: boolean }>`
  position: absolute; inset: 0;
  transform: translateY(${({ $isFlat }) => $isFlat ? 'var(--preparation-horizon, 760px)' : '880px'});
  border-top: 1px solid rgba(243, 115, 33, .18);
  background: #080808;
  transition: var(--preparation-floor-transition, transform 1.5s ease);
`;
