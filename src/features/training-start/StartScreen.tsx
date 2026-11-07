'use client';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';
import { monoLabel } from '@/styles/mixins';

/** 3D 장면과 분리된 시작 화면. 링크를 누를 때 교육 화면을 처음 불러옵니다. */
export function StartScreen({ onReplay }: { onReplay: () => void }) {
  return (
    <Root>
      <Content>
        <Brand>HANWHA · MR ASSEMBLY TRAINING</Brand>
        <Mark aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m48 10 30 17-30 17-30-17 30-17Z" />
            <path d="m18 39 30 17 30-17M18 51l30 17 30-17M18 63l30 17 30-17M48 44v36" />
          </svg>
        </Mark>
        <Title>MR 조립 교육</Title>
        <Description>제품을 선택하고, 공정별 조립 과정을 실습하세요.</Description>
        <Steps aria-label="교육 진행 순서">제품 선택 <span aria-hidden="true">→</span> 공정 확인 <span aria-hidden="true">→</span> 조립 실습</Steps>
        <StartLink as="a" href="/training">시작하기 <span aria-hidden="true">→</span></StartLink>
        <Replay as="a" href="/part-library">부품 라이브러리 <span aria-hidden="true">→</span></Replay>
        <Replay as="a" href="/" onClick={(event) => { event.preventDefault(); onReplay(); }}>프로젝트 안내 다시 보기</Replay>
        <Device>PC · Meta Quest 3</Device>
      </Content>
    </Root>
  );
}

const Root = styled.main`
  position: fixed; inset: 0; overflow: auto; display: grid; place-items: center;
  padding: ${({ theme }) => theme.space[6]}px;
  background: radial-gradient(ellipse at 50% 40%, ${({ theme }) => theme.color.bgCenter}, ${({ theme }) => theme.color.bgMid} 60%, ${({ theme }) => theme.color.bgEdge});
  color: ${({ theme }) => theme.color.ink};
`;
const Content = styled.div`
  width: 100%; max-width: ${({ theme }) => theme.stage.width / 3}px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding-block: ${({ theme }) => theme.space[7]}px;
`;
const Brand = styled.p`
  ${monoLabel}; margin: 0; font-size: ${({ theme }) => theme.size.sm}px;
  color: ${({ theme }) => theme.color.primary}; white-space: normal; line-height: 1.8;
`;
const Mark = styled.div`
  margin: ${({ theme }) => theme.space[7]}px 0 ${({ theme }) => theme.space[5]}px;
  color: ${({ theme }) => theme.color.primary};
`;
const Title = styled.h1`
  margin: 0; font-size: ${({ theme }) => theme.size.display}px; line-height: 1.3;
  font-weight: ${({ theme }) => theme.weight.bold};
`;
const Description = styled.p`
  margin: ${({ theme }) => theme.space[5]}px 0 0;
  font-size: ${({ theme }) => theme.size.base}px; line-height: 1.8; text-wrap: pretty;
  color: ${({ theme }) => theme.color.inkSub};
`;
const Steps = styled.p`
  display: flex; flex-wrap: wrap; justify-content: center; gap: ${({ theme }) => theme.space[3]}px;
  margin: ${({ theme }) => theme.space[4]}px 0 ${({ theme }) => theme.space[7]}px;
  font-size: ${({ theme }) => theme.size.md}px; color: ${({ theme }) => theme.color.inkMuted};
  span { color: ${({ theme }) => theme.color.primaryLine}; }
`;
const StartLink = styled(CutButton)`
  width: ${({ theme }) => theme.space[8] * 4}px; max-width: 100%;
  height: ${({ theme }) => theme.space[8]}px; gap: ${({ theme }) => theme.space[5]}px;
  text-decoration: none;
  &:hover { color: ${({ theme }) => theme.color.onPrimary}; }
  &:focus-visible { box-shadow: inset 0 0 0 ${({ theme }) => theme.space[1]}px ${({ theme }) => theme.color.ink}; }
`;
const Replay = styled.button`
  margin-top: ${({ theme }) => theme.space[5]}px; padding: ${({ theme }) => theme.space[2]}px;
  color: ${({ theme }) => theme.color.inkMuted}; font-size: ${({ theme }) => theme.size.md}px;
  &:hover { color: ${({ theme }) => theme.color.primarySoft}; }
  &:focus-visible { outline: 1px solid ${({ theme }) => theme.color.primarySoft}; }
`;
const Device = styled.p`
  ${monoLabel}; margin: ${({ theme }) => theme.space[6]}px 0 0;
  font-size: ${({ theme }) => theme.size.sm}px; color: ${({ theme }) => theme.color.inkDisabled};
`;
