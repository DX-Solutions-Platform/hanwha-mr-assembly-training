'use client';
import styled from 'styled-components';
import { cutCorner, glassPanel, monoLabel } from '@/styles/mixins';

const BADGE_LIST = [{ label: 'DONE', tone: 'success' }, { label: 'NOW', tone: 'primary' }, { label: 'FINAL', tone: 'primarySoft' }] as const;

/** 공통 컴포넌트 견본 — 실제 화면도 같은 모양을 씁니다 */
export function ComponentSampleBoard() {
  return (
    <Grid>
      <Cell><Caption>주 버튼</Caption><PrimaryButton type="button">교육 시작</PrimaryButton></Cell>
      <Cell><Caption>보조 버튼</Caption><SecondaryButton type="button">도면 업데이트</SecondaryButton></Cell>
      <Cell><Caption>상태 배지</Caption><BadgeRow>{BADGE_LIST.map((badge) => <Badge key={badge.label} $tone={badge.tone}>{badge.label}</Badge>)}</BadgeRow></Cell>
      <Cell><Caption>지시선 라벨</Caption><LabelSample><Dot /><Line /><Label><LabelCode>03</LabelCode><LabelTitle>펌프부</LabelTitle></Label></LabelSample></Cell>
      <Cell><Caption>진행 바</Caption><ProgressTrack><ProgressFill style={{ width: '62%' }} /></ProgressTrack></Cell>
      <Cell><Caption>패널</Caption><PanelSample>BOM · 부품 확인</PanelSample></Cell>
    </Grid>
  );
}

const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;`;
const Cell = styled.div`display: flex; flex-direction: column; gap: 12px; padding: 20px; background: rgba(10,8,6,.5); border: 1px solid ${({ theme }) => theme.color.primaryLineWeak};`;
const Caption = styled.span`${monoLabel}; font-size: 12px; color: ${({ theme }) => theme.color.inkMuted};`;
const PrimaryButton = styled.button`height: 56px; border: 0; background: ${({ theme }) => theme.color.primary}; color: ${({ theme }) => theme.color.onPrimary}; font: inherit; font-size: 18px; font-weight: ${({ theme }) => theme.weight.bold}; ${({ theme }) => cutCorner(theme.cut.md)};`;
const SecondaryButton = styled.button`height: 48px; border: 1px solid rgba(243,115,33,.7); background: rgba(243,115,33,.05); color: ${({ theme }) => theme.color.ink}; font: inherit; font-size: 15px; ${({ theme }) => cutCorner(theme.cut.sm)};`;
const BadgeRow = styled.div`display: flex; gap: 8px;`;
const Badge = styled.span<{ $tone: 'success' | 'primary' | 'primarySoft' }>`${monoLabel}; font-size: 11px; padding: 5px 8px; border: 1px solid ${({ theme, $tone }) => theme.color[$tone]}; color: ${({ theme, $tone }) => theme.color[$tone]};`;
const LabelSample = styled.div`display: flex; align-items: center;`;
const Dot = styled.span`width: 7px; height: 7px; border-radius: 50%; background: ${({ theme }) => theme.color.primary};`;
const Line = styled.span`width: 60px; height: 1px; background: rgba(255,214,180,.7);`;
const Label = styled.span`display: flex; align-items: baseline; gap: 10px; padding: 8px 14px; background: rgba(8,7,6,.72); border: 1px solid ${({ theme }) => theme.color.primaryLine};`;
const LabelCode = styled.span`font: ${({ theme }) => theme.weight.bold} 13px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primary};`;
const LabelTitle = styled.span`font-size: 18px; line-height: 1; font-weight: ${({ theme }) => theme.weight.bold};`;
const ProgressTrack = styled.div`height: 3px; background: rgba(243,115,33,.2);`;
const ProgressFill = styled.div`height: 3px; background: ${({ theme }) => theme.color.primary};`;
const PanelSample = styled.div`${glassPanel}; padding: 18px; font-size: 16px;`;
