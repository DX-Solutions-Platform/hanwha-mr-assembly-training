'use client';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import type { SelectionKind } from '@/features/education-select/selectionProducts';
import { getProcessSections, PROCESS_NAMES } from './processSections';
import { ProcessPanel } from './ProcessPanel';

export interface ProcessElements {
  labels: (HTMLButtonElement | null)[];
  lines: (SVGPolylineElement | null)[];
  back: HTMLButtonElement | null;
  panel: HTMLElement | null;
}
interface ProcessOverlayProps {
  kind: SelectionKind; selectedIndex: number | null; isReturning: boolean; isDeparting: boolean;
  onLabelElement: (index: number, element: HTMLButtonElement | null) => void;
  onLineElement: (index: number, element: SVGPolylineElement | null) => void;
  onBackElement: (element: HTMLButtonElement | null) => void;
  onPanelElement: (element: HTMLElement | null) => void;
  onHover: (index: number | null) => void; onSelect: (index: number) => void;
  onClose: () => void; onBack: () => void; onStart: () => void;
}

export function ProcessOverlay({ kind, selectedIndex, isReturning, isDeparting, onLabelElement, onLineElement, onBackElement, onPanelElement, onHover, onSelect, onClose, onBack, onStart }: ProcessOverlayProps) {
  const sections = getProcessSections(kind), done = sections.filter((section) => section.status === 'DONE').length;
  const summaryRef = useRef<HTMLDivElement>(null), hintRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 시안의 JetBrains Mono → monospace 대체 순서. next/font의 크기 보정용 fallback은 제외.
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').split(',')[0].trim();
    if (family) rootRef.current?.style.setProperty('--font-mono', family);
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => {
      if (summaryRef.current) { summaryRef.current.style.opacity = '1'; summaryRef.current.style.transform = 'none'; }
      if (hintRef.current) hintRef.current.style.opacity = '1';
    }); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, []);
  useEffect(() => {
    if (!isDeparting || !rootRef.current) return;
    const root = rootRef.current, summary = summaryRef.current, hint = hintRef.current;
    root.querySelectorAll<HTMLElement>('[data-process-label]').forEach((label, index) => {
      label.style.transition = `opacity .3s ease ${index * 0.04}s, transform .4s ease ${index * 0.04}s`;
      label.style.opacity = '0'; label.style.transform = 'translateX(24px)'; label.style.pointerEvents = 'none';
    });
    root.querySelectorAll<SVGPolylineElement>('polyline').forEach((line) => { line.style.transition = 'opacity .3s'; line.style.opacity = '0'; });
    root.querySelectorAll<HTMLElement>('[data-process-fade]').forEach((element) => { element.style.transition = 'opacity .3s'; element.style.opacity = '0'; element.style.pointerEvents = 'none'; });
    const panel = root.querySelector<HTMLElement>('[aria-label="공정 정보"]');
    if (panel) { panel.style.transition = 'opacity .35s ease, transform .45s cubic-bezier(.5,0,.75,0)'; panel.style.opacity = '0'; panel.style.transform = 'translateX(40px)'; panel.style.pointerEvents = 'none'; }
    return () => {
      root.querySelectorAll<HTMLElement>('[data-process-label], [data-process-fade], [aria-label="공정 정보"]').forEach((element) => { element.style.removeProperty('transition'); element.style.removeProperty('transform'); element.style.removeProperty('pointer-events'); });
      panel?.style.removeProperty('opacity');
      if (summary) { summary.style.opacity = '1'; summary.style.transform = 'none'; }
      if (hint) hint.style.opacity = '1';
    };
  }, [isDeparting]);
  return <Overlay ref={rootRef} data-passthrough $isReturning={isReturning}>
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {sections.map((section, index) => <polyline key={section.name} ref={(element) => onLineElement(index, element)} fill="none" stroke="rgba(243,115,33,.7)" strokeWidth="1.5" opacity="0" />)}
    </svg>
    {sections.map((section, index) => <Label data-process-label key={section.name} ref={(element) => onLabelElement(index, element)} type="button" $color={section.color}
      onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)} onClick={() => onSelect(index)}>
      <LabelCode $color={section.color}>{String(index + 1).padStart(2, '0')} · {section.status}</LabelCode>
      <LabelName>{section.name}</LabelName><LabelSummary>{section.summary}</LabelSummary>
    </Label>)}
    <Back data-process-fade ref={onBackElement} type="button" onClick={onBack}><span>←</span>교육 선택</Back>
    <Summary data-process-fade ref={summaryRef}>
      <Caption>공정 선택</Caption><ProductName>{PROCESS_NAMES[kind]}</ProductName>
      <Stats><Stat><StatLabel>공정</StatLabel><Number>{String(sections.length).padStart(2, '0')}</Number></Stat>
        <Stat><StatLabel>표준 작업 시간</StatLabel><Number>≈ 32<Small> MIN</Small></Number></Stat>
        <Stat><StatLabel>완료</StatLabel><Number $color="#3fe0c5">{done}<Small> / {sections.length}</Small></Number></Stat></Stats>
      <Progress>{sections.map((section) => <Segment key={section.name} $color={section.status === 'NEXT' ? 'rgba(243,115,33,.22)' : section.color} />)}</Progress>
    </Summary>
    <Hint data-process-fade ref={hintRef}><span>공정을 선택하세요</span><Dot>·</Dot><span><Key>휠</Key> 조립 / 분해</span><Dot>·</Dot><span><Key>R</Key> 와이어프레임</span></Hint>
    {selectedIndex !== null && sections[selectedIndex] && !isReturning && <ProcessPanel ref={onPanelElement} section={sections[selectedIndex]} index={selectedIndex}
      canStart={kind === 'pump' || kind === 'stool'} onClose={onClose} onStart={onStart} />}
  </Overlay>;
}

const Overlay = styled.div<{ $isReturning: boolean }>`
  position: absolute; inset: 0; pointer-events: none; z-index: 20;
  &, & * { box-sizing: content-box; }
  ${({ $isReturning }) => $isReturning && 'opacity: 0; transition: opacity .3s ease; pointer-events: none;'}
`;
const Label = styled.button<{ $color: string }>`
  position: absolute; display: flex; flex-direction: column; align-items: stretch; text-align: left; gap: 7px;
  padding: 10px 14px; border-left: 2px solid ${({ $color }) => $color}; background: rgba(8,9,11,.6);
  cursor: pointer; pointer-events: none; opacity: 0; transform: translateX(16px);
  transition: opacity .4s ease, transform .5s ease, background .2s;
`;
const LabelCode = styled.span<{ $color: string }>`white-space: nowrap; font: 500 12px/1 ${({ theme }) => theme.font.mono}; letter-spacing: .14em; color: ${({ $color }) => $color};`;
const LabelName = styled.span`white-space: nowrap; font: 700 22px/1 'NexonLv2Gothic', sans-serif; color: #fff;`;
const LabelSummary = styled.span`white-space: nowrap; font: 400 14px/1 'NexonLv2Gothic', sans-serif; color: #e6eaec;`;
const Back = styled.button`
  position: absolute; left: 48px; top: 40px; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 16px;
  cursor: pointer; pointer-events: auto; border: 1px solid rgba(243,115,33,.7); background: rgba(10,8,6,.7);
  font: 400 15px/1 'NexonLv2Gothic', sans-serif; color: #f2ede8; opacity: 0; transition: opacity .5s ease;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  span { color: #f37321; }
`;
const Summary = styled.div`
  position: absolute; left: 64px; top: 150px; display: flex; flex-direction: column; gap: 18px; width: 360px;
  opacity: 0; transform: translateX(-16px); transition: opacity .5s ease .6s, transform .6s ease .6s;
`;
const Caption = styled.span`font: 500 13px/1 ${({ theme }) => theme.font.mono}; letter-spacing: .2em; color: #f37321;`;
const ProductName = styled.span`font: 700 56px/1.05 'NexonLv2Gothic', sans-serif; color: #fff;`;
const Stats = styled.div`display: flex; gap: 28px; padding-top: 6px;`;
const Stat = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const StatLabel = styled.span`white-space: nowrap; font: 500 12px/1 ${({ theme }) => theme.font.mono}; letter-spacing: .14em; color: #c9d0d3;`;
const Number = styled.span<{ $color?: string }>`white-space: nowrap; font: 700 30px/1 ${({ theme }) => theme.font.mono}; color: ${({ $color }) => $color ?? '#fff'};`;
const Small = styled.span`font-size: 15px; color: #c9d0d3;`;
const Progress = styled.div`display: flex; gap: 4px;`;
const Segment = styled.div<{ $color: string }>`flex: 1; height: 3px; background: ${({ $color }) => $color};`;
const Hint = styled.div`
  position: absolute; left: 0; right: 0; bottom: 56px; display: flex; justify-content: center; gap: 28px;
  opacity: 0; transition: opacity .6s ease 1s; font: 400 17px/1 'NexonLv2Gothic', sans-serif; color: #e6eaec;
  text-shadow: 0 1px 6px rgba(0,0,0,.8);
`;
const Dot = styled.span`color: #f37321;`;
const Key = styled.b`font: 700 14px/1 ${({ theme }) => theme.font.mono}; color: #f37321;`;
