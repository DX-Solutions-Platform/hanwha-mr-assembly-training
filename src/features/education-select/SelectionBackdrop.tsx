'use client';
import styled, { keyframes } from 'styled-components';
import { ProcessBackdrop } from '@/features/process-select/ProcessBackdrop';

/** Demo 1.dc.html: 선택 단계의 배경, floor grid, scanline. */
export function SelectionBackdrop({ isProcess = false, isFlat = false, onElement }: { isProcess?: boolean; isFlat?: boolean; onElement?: (element: HTMLDivElement | null) => void }) {
  return <Background ref={onElement}><Floor style={{ display: isProcess ? 'none' : 'block' }} /><Scanlines /><ScanBand /><ProcessBackdrop isVisible={isProcess} isFlat={isFlat} /></Background>;
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
const Scanlines = styled.div`
  position: absolute; inset: 0; pointer-events: none;
  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 4px);
`;
const scan = keyframes`from { transform: translateY(-120px); } to { transform: translateY(1200px); }`;
const ScanBand = styled.div`
  position: absolute; left: 0; right: 0; top: 0; height: 120px; pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(243,115,33,.07), transparent);
  animation: ${scan} 6s linear infinite;
`;
