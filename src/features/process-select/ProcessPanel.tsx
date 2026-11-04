'use client';
import { forwardRef } from 'react';
import styled from 'styled-components';
import type { ProcessSection } from './processSections';

interface ProcessPanelProps { section: ProcessSection; index: number; canStart: boolean; onClose: () => void; onStart: () => void; }

/** Demo 1.dc.html seqPick(): content-box 및 원문의 버튼 형태 유지. */
export const ProcessPanel = forwardRef<HTMLElement, ProcessPanelProps>(function ProcessPanel({ section, index, canStart, onClose, onStart }, ref) {
  return <Panel ref={ref} aria-label="공정 정보">
    <Code>{String(index + 1).padStart(2, '0')} · 조립 교육</Code>
    <Title>{section.name}</Title>
    <Description>{section.parts}</Description>
    <Actions>
      <Close type="button" onClick={onClose}>닫기</Close>
      {canStart ? <Start type="button" onClick={onStart}>교육 시작</Start> : <Unavailable>준비 중</Unavailable>}
    </Actions>
  </Panel>;
});

const Panel = styled.section`
  position: absolute; right: 64px; bottom: 64px; width: 440px; display: flex; flex-direction: column; gap: 14px;
  padding: 22px 24px; pointer-events: auto; z-index: 80; border: 1px solid rgba(243,115,33,.55);
  border-top: 2px solid #f37321; background: rgba(8,9,11,.7);
`;
const Code = styled.span`font: 500 12px/1 ${({ theme }) => theme.font.mono}; color: #f37321; letter-spacing: .16em;`;
const Title = styled.h2`margin: 0; font: 700 30px/1.1 'NexonLv2Gothic', sans-serif; color: #f2ede8;`;
const Description = styled.span`font: 400 16px/1.5 'NexonLv2Gothic', sans-serif; color: #e6eaec;`;
const Actions = styled.div`display: flex; gap: 10px;`;
const Close = styled.button`
  flex: 1; height: 54px; display: flex; align-items: center; justify-content: center; cursor: pointer;
  border: 1px solid rgba(243,115,33,.6); font: 400 16px/1 'NexonLv2Gothic', sans-serif; color: #f2ede8;
`;
const Start = styled.button`
  flex: 1.6; height: 54px; display: flex; align-items: center; justify-content: center; background: #f37321;
  color: #140a04; text-decoration: none; font: 700 18px/1 'NexonLv2Gothic', sans-serif; cursor: pointer;
`;
const Unavailable = styled.div`
  flex: 1.6; height: 54px; display: flex; align-items: center; justify-content: center;
  background: rgba(243,115,33,.18); color: rgba(242,237,232,.55); font: 700 18px/1 'NexonLv2Gothic', sans-serif;
`;
