'use client';
import Link from 'next/link';
import styled from 'styled-components';
import { monoLabel } from '@/styles/mixins';
import { PRINCIPLE_LIST, RESOLUTION_RULE_LIST } from './designGuideContent';
import { GuideSection } from './ui/GuideSection';
import { ColorTokenGrid } from './ui/ColorTokenGrid';
import { TypeScaleList } from './ui/TypeScaleList';
import { SpacingScale } from './ui/SpacingScale';
import { ComponentSampleBoard } from './ui/ComponentSampleBoard';

/** 디자인 가이드 — 모든 UI 개발의 기준 (토큰은 src/styles/theme.ts) */
export function DesignGuideScreen() {
  return (
    <Root>
      <Header>
        <Eyebrow>HANWHA · MR ASSEMBLY TRAINING</Eyebrow>
        <Title>디자인 가이드</Title>
        <BackLink href="/training">교육 선택으로</BackLink>
      </Header>
      <GuideSection code="01" title="원칙">
        <PrincipleGrid>{PRINCIPLE_LIST.map((item) => <Principle key={item.title}><PrincipleTitle>{item.title}</PrincipleTitle><PrincipleBody>{item.body}</PrincipleBody></Principle>)}</PrincipleGrid>
      </GuideSection>
      <GuideSection code="02" title="색상"><ColorTokenGrid /></GuideSection>
      <GuideSection code="03" title="글자"><TypeScaleList /></GuideSection>
      <GuideSection code="04" title="간격"><SpacingScale /></GuideSection>
      <GuideSection code="05" title="컴포넌트"><ComponentSampleBoard /></GuideSection>
      <GuideSection code="06" title="해상도 · 성능"><RuleList>{RESOLUTION_RULE_LIST.map((rule) => <li key={rule}>{rule}</li>)}</RuleList></GuideSection>
    </Root>
  );
}

const Root = styled.main`min-height: 100vh; max-width: 1280px; margin: 0 auto; padding: 64px 48px 120px; color: ${({ theme }) => theme.color.ink}; background: ${({ theme }) => theme.color.bgEdge};`;
const Header = styled.header`display: flex; flex-direction: column; gap: 14px; padding-bottom: 32px;`;
const Eyebrow = styled.span`${monoLabel}; font-size: 13px; color: ${({ theme }) => theme.color.primary};`;
const Title = styled.h1`margin: 0; font-size: ${({ theme }) => theme.size.display}px; font-weight: ${({ theme }) => theme.weight.bold};`;
const BackLink = styled(Link)`align-self: flex-start; font-size: 15px; color: ${({ theme }) => theme.color.primary};`;
const PrincipleGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;`;
const Principle = styled.div`display: flex; flex-direction: column; gap: 10px; padding: 20px; border: 1px solid ${({ theme }) => theme.color.primaryLineWeak};`;
const PrincipleTitle = styled.span`font-size: 18px; font-weight: ${({ theme }) => theme.weight.bold};`;
const PrincipleBody = styled.span`font-size: 15px; line-height: 1.6; color: ${({ theme }) => theme.color.inkSub}; text-wrap: pretty;`;
const RuleList = styled.ul`margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 16px; line-height: 1.6; color: ${({ theme }) => theme.color.inkSub};`;
