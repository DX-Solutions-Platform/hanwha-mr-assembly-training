'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { BackButton } from '@/components/common/BackButton';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Stage } from '@/components/common/Stage';
import { cutCorner } from '@/styles/mixins';

const tools = [
  { title: '교범 생성', input: '입력 · STEP / PDF / CAD', href: '/training/demo/textbook',
    description: '파일을 선택해 3D 교범을 열고 조립 단계별 동작과 작업 안내를 확인합니다.' },
  { title: '교범 편집', input: '입력 · 교범 ZIP', href: '/training/demo/edit',
    description: '기존 교범의 작업 안내와 동작, 부품 재질을 수정하고 ZIP으로 내보냅니다.' },
] as const;

export function TrainingDemoStart() {
  return <Stage>
    <ScreenHeader title="교범 관리" subtitle="3D 교범을 생성하거나 기존 교범을 편집하세요."
      action={<BackButton href="/?view=start" label="작업 모드 선택" />} />
    <ToolGrid aria-label="교범 작업 선택">
      {tools.map(({ title, input, href, description }, index) => <Tool key={href} href={href}>
        <Number aria-hidden="true">0{index + 1}</Number>
        <Input>{input}</Input>
        <h2>{title}</h2>
        <p>{description}</p>
        <span className="tool-link">열기 <span aria-hidden="true">→</span></span>
      </Tool>)}
    </ToolGrid>
  </Stage>;
}

const ToolGrid = styled.main(({ theme }) => ({
  position: 'absolute', inset: '225px 120px 145px', display: 'grid', alignContent: 'center',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: theme.space[5],
}));
const Tool = styled(Link)(({ theme }) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 405, gap: theme.space[3],
  padding: theme.space[7], background: theme.color.bgCenter, border: '1px solid ' + theme.color.primaryLine,
  color: theme.color.ink, transition: 'background .18s, border-color .18s',
  '& h2': { margin: 0, fontSize: 50, lineHeight: 1.16 },
  '& p': { margin: 0, color: theme.color.inkSub, fontSize: theme.size.lg, lineHeight: 1.55 },
  '&:hover, &:focus-visible': { borderColor: theme.color.primary, background: theme.color.primaryFill, color: theme.color.ink },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: 3 },
  '& .tool-link': { marginTop: 'auto', padding: '10px 20px', background: theme.color.primary, color: theme.color.onPrimary,
    fontWeight: theme.weight.bold },
  '& .tool-link > span': { marginLeft: theme.space[3] },
}), ({ theme }) => cutCorner(theme.cut.md));
const Number = styled.span(({ theme }) => ({
  color: theme.color.primarySoft, fontFamily: theme.font.mono, fontSize: 54, fontWeight: theme.weight.bold, lineHeight: 1,
}));
const Input = styled.span(({ theme }) => ({ color: theme.color.inkMuted, fontSize: theme.size.md }));
