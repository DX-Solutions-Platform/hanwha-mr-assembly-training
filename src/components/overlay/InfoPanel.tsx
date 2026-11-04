'use client';
import styled from 'styled-components';
import { cutCorner, glassPanel } from '@/styles/mixins';

interface InfoPanelProps { code: string; title: string; caption: string; chipList: string[]; actionLabel: string; onAction: () => void; onClose: () => void; }

/** 구간·공정 정보 패널 (오른쪽) — 선택한 부분의 구성과 교육 시작 */
export function InfoPanel({ code, title, caption, chipList, actionLabel, onAction, onClose }: InfoPanelProps) {
  return (
    <Root>
      <Header><Code>{code}</Code><CloseButton type="button" onClick={onClose} aria-label="닫기">×</CloseButton></Header>
      <Title>{title}</Title>
      <Caption>{caption}</Caption>
      <ChipList>{chipList.map((chip) => <Chip key={chip}>{chip}</Chip>)}</ChipList>
      <ActionButton type="button" onClick={onAction}>{actionLabel}</ActionButton>
    </Root>
  );
}

const Root = styled.section`
  position: absolute; right: 64px; bottom: 120px; width: 420px; padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 14px;
  ${glassPanel}; border-top: 2px solid ${({ theme }) => theme.color.primary};
`;
const Header = styled.div`display: flex; justify-content: space-between; align-items: center;`;
const Code = styled.span`font: ${({ theme }) => theme.weight.bold} 14px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primary}; letter-spacing: .14em;`;
const CloseButton = styled.button`width: 44px; height: 44px; margin: -10px -10px -10px 0; background: none; border: 0; color: ${({ theme }) => theme.color.inkMuted}; font-size: 24px; cursor: pointer; &:hover { color: ${({ theme }) => theme.color.ink}; }`;
const Title = styled.h2`margin: 0; font-size: ${({ theme }) => theme.size.xxl}px; line-height: 1.15; font-weight: ${({ theme }) => theme.weight.bold};`;
const Caption = styled.p`margin: 0; font-size: ${({ theme }) => theme.size.md}px; line-height: 1.5; color: ${({ theme }) => theme.color.inkSub};`;
const ChipList = styled.div`display: flex; flex-wrap: wrap; gap: 8px;`;
const Chip = styled.span`padding: 7px 10px; border: 1px solid ${({ theme }) => theme.color.primaryLine}; color: ${({ theme }) => theme.color.primarySoft}; font-size: 13px; line-height: 1;`;
const ActionButton = styled.button`
  margin-top: 6px; height: 60px; border: 0; cursor: pointer; background: ${({ theme }) => theme.color.primary}; color: ${({ theme }) => theme.color.onPrimary};
  font: inherit; font-size: 19px; font-weight: ${({ theme }) => theme.weight.bold}; ${({ theme }) => cutCorner(theme.cut.md)};
  &:hover { filter: brightness(1.08); }
`;
