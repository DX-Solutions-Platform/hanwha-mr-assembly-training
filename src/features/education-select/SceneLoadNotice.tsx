'use client';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';
import { cutCorner } from '@/styles/mixins';

export type SceneLoadStatus = 'loading' | 'ready' | 'error';

export function SceneLoadNotice({ status, onRetry }: { status: SceneLoadStatus; onRetry: () => void }) {
  if (status === 'ready') return null;
  const hasError = status === 'error';
  return (
    <Overlay>
      <Panel role={hasError ? 'alert' : 'status'} aria-live="polite" aria-busy={!hasError}>
        <Title>{hasError ? '3D 모델을 불러오지 못했습니다' : '3D 모델을 준비하고 있습니다'}</Title>
        <Description>{hasError ? '다시 시도하거나 시작 화면으로 돌아가세요.' : '잠시만 기다려 주세요.'}</Description>
        <Actions>
          {hasError && <CutButton type="button" onClick={onRetry}>다시 시도</CutButton>}
          <HomeLink href="/">시작 화면으로</HomeLink>
        </Actions>
      </Panel>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center;
  background: ${({ theme }) => theme.color.panel};
`;
const Panel = styled.div`
  display: flex; flex-direction: column; align-items: center;
  padding: ${({ theme }) => theme.space[7]}px ${({ theme }) => theme.space[8]}px;
  background: ${({ theme }) => theme.color.panelStrong}; border: 1px solid ${({ theme }) => theme.color.primaryLine};
  ${({ theme }) => cutCorner(theme.cut.md)};
`;
const Title = styled.h2`
  margin: 0; color: ${({ theme }) => theme.color.ink};
  font-size: ${({ theme }) => theme.size.xxl}px; font-weight: ${({ theme }) => theme.weight.bold};
`;
const Description = styled.p`
  margin: ${({ theme }) => theme.space[4]}px 0 ${({ theme }) => theme.space[6]}px;
  font-size: ${({ theme }) => theme.size.base}px; color: ${({ theme }) => theme.color.inkSub};
`;
const Actions = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.space[6]}px;`;
const HomeLink = styled.a`
  font-size: ${({ theme }) => theme.size.base}px;
  &:focus-visible { outline: 1px solid ${({ theme }) => theme.color.primarySoft}; outline-offset: ${({ theme }) => theme.space[2]}px; }
`;
