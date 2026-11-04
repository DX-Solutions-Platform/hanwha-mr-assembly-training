'use client';
import Link from 'next/link';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';

export function PauseMenu({ onResume }: { onResume: () => void }) {
  return (
    <Dim>
      <Title>일시정지</Title>
      <CutButton onClick={onResume}>계속하기</CutButton>
      <CutButton $variant="outline" as={Link} href="/training">교육 나가기</CutButton>
    </Dim>
  );
}

const Dim = styled.div`position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: rgba(0,0,0,.7);`;
const Title = styled.span`font-size: 36px; font-weight: 700; margin-bottom: 12px;`;
