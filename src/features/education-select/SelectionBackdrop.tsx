'use client';
import styled from 'styled-components';
import { ProcessBackdrop } from '@/features/process-select/ProcessBackdrop';

export function SelectionBackdrop({ isProcess = false, isFlat = false, onElement }: { isProcess?: boolean; isFlat?: boolean; onElement?: (element: HTMLDivElement | null) => void }) {
  return <Background ref={onElement}>{isProcess ? <ProcessBackdrop isFlat={isFlat} /> : <Floor />}</Background>;
}

const Background = styled.div`
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 40%, #151c20 0%, #090c0e 60%, #040506 100%);
`;
const Floor = styled.div`
  position: absolute; left: -1200px; top: 640px; width: 4320px; height: 1400px;
  background-image: linear-gradient(rgba(243,115,33,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(243,115,33,.16) 1px, transparent 1px);
  background-size: 80px 80px; transform: perspective(700px) rotateX(70deg); transform-origin: 50% 0;
  mask-image: linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent); pointer-events: none;
`;
