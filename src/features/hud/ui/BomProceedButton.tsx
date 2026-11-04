'use client';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';

/** 부품 확인(BOM): 홀로그램 부품에 마우스를 올리면 즉시 실물 3D + 설명 (scene에서 처리) → 진행하기 */
export function BomProceedButton({ onProceed }: { onProceed: () => void }) {
  return <Root><Hint>부품에 마우스를 올려 확인하세요</Hint><CutButton onClick={onProceed}>진행하기</CutButton></Root>;
}

const Root = styled.div`position: absolute; left: 50%; bottom: 80px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 14px; z-index: 40;`;
const Hint = styled.span`font-size: 18px; color: ${({ theme }) => theme.color.inkSub};`;
