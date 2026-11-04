'use client';
import styled from 'styled-components';
import { BOM } from './bomData';
import type { PreparationPhase } from './preparationScene';

interface OverlayProps {
  phase: PreparationPhase; hoveredIndex: number | null;
  onLabelElement: (index: number, element: HTMLDivElement | null) => void;
  onConfirm: () => void; onProceed: () => void; onBack: () => void; onPause: () => void;
}

/** Demo 1 HUD.dc.html의 안전 수칙·BOM UI. 문구와 CSS 수치를 그대로 사용합니다. */
export function PreparationOverlay({ phase, hoveredIndex, onLabelElement, onConfirm, onProceed, onBack, onPause }: OverlayProps) {
  return <>
    {(phase === 'bom' || phase === 'placing') && <>
      <Labels>{BOM.map((part, index) => <PartLabel key={part.code} ref={(element) => onLabelElement(index, element)} data-bom-label={part.code} $hovered={hoveredIndex === index}>
        <PartRow><Badge $hovered={hoveredIndex === index}>{part.code}</Badge><PartName>{part.name}</PartName><Quantity>×{part.qty}</Quantity></PartRow>
        <Specification>{part.spec}</Specification>
        {hoveredIndex === index && <Description><span>{part.desc}</span><Use>사용 단계 · {part.use}</Use></Description>}
      </PartLabel>)}</Labels>
      <Header>
        <IconButton type="button" aria-label="공정 선택으로" onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f37321" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg></IconButton>
        <IconButton type="button" aria-label="일시정지" onClick={onPause}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f37321" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5v14" /><path d="M15 5v14" /></svg></IconButton>
        <TitleStack><Caption>BOM · HP-2200</Caption><Title>부품 명세(BOM)</Title></TitleStack>
      </Header>
      <Count><span>체결 부품 A–F · 구조 부품 ①–⑥</span><span>12 ITEMS</span></Count>
      {phase === 'bom' && <Proceed type="button" onClick={onProceed}><svg width="18" height="18" viewBox="0 0 24 24" fill="#140a04"><path d="M7 4l13 8-13 8z" /></svg><span>진행하기</span><Space>SPACE</Space></Proceed>}
    </>}
    {phase !== 'transition' && phase !== 'main' && <Guide><GuideTag>{phase === 'setup' || phase === 'placing' ? 'SETUP' : 'BOM'}</GuideTag><GuideText>{phase === 'setup' ? '교육장을 준비합니다' : phase === 'placing' ? '부품을 자재 구역으로 배치합니다' : '부품에 마우스를 올려 확인하세요. 확인이 끝나면 진행하기를 누르세요.'}</GuideText></Guide>}
    {phase === 'safety' && <SafetyDim role="dialog" aria-modal="true" aria-label="교육 시작 전 안전 수칙"><SafetyPanel>
      <SafetyCaption>SAFETY CHECK</SafetyCaption><SafetyTitle>교육 시작 전 안전 수칙</SafetyTitle>
      {['보호 장갑을 착용했습니다', '보안경을 착용했습니다', '작업대 주변을 정리했습니다'].map((rule) => <Rule key={rule}><Check>✓</Check><span>{rule}</span></Rule>)}
      <Confirm type="button" onClick={onConfirm}>모두 확인했습니다</Confirm>
    </SafetyPanel></SafetyDim>}
  </>;
}

const Labels = styled.div`position: absolute; inset: 0; pointer-events: none;`;
const PartLabel = styled.div<{ $hovered: boolean }>`position: absolute; left: 0; top: 0; opacity: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: ${({ $hovered }) => $hovered ? 20 : 1};`;
const PartRow = styled.div`display: flex; align-items: center; gap: 8px;`;
const Badge = styled.span<{ $hovered: boolean }>`
  min-width: 22px; height: 22px; padding: 0 4px; box-sizing: border-box !important; display: flex; align-items: center; justify-content: center;
  font: 700 12px/1 ${({ theme }) => theme.font.mono}; border: 1px solid #f37321;
  background: ${({ $hovered }) => $hovered ? '#f37321' : 'rgba(10,8,6,.7)'}; color: ${({ $hovered }) => $hovered ? '#140a04' : '#f37321'};
`;
const PartName = styled.span`white-space: nowrap; font: 700 15px/1 'NexonLv2Gothic'; color: #fff; text-shadow: 0 0 8px rgba(0,0,0,.9);`;
const Quantity = styled.span`white-space: nowrap; font: 700 13px/1 ${({ theme }) => theme.font.mono}; color: #ffb07a;`;
const Specification = styled.span`white-space: nowrap; font: 500 11px/1 ${({ theme }) => theme.font.mono}; color: #c9d0d3; text-shadow: 0 0 6px rgba(0,0,0,.9);`;
const Description = styled.div`width: 250px; display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 12px; background: rgba(10,8,6,.8); backdrop-filter: blur(3px); border: 1px solid rgba(243,115,33,.55); border-top: 2px solid #f37321; font: 400 14px/1.5 'NexonLv2Gothic'; color: #eef1f2; text-wrap: pretty;`;
const Use = styled.span`white-space: nowrap; font: 400 12px/1 'NexonLv2Gothic'; color: #f37321;`;
const Header = styled.div`position: absolute; left: 40px; top: 36px; display: flex; gap: 12px; align-items: center; pointer-events: auto;`;
const IconButton = styled.button`width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid rgba(243,115,33,.75); background: rgba(243,115,33,.05); clip-path: polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px)); &:hover { background: rgba(243,115,33,.22); }`;
const TitleStack = styled.div`display: flex; flex-direction: column; gap: 8px; padding-left: 10px;`;
const Caption = styled.span`white-space: nowrap; font: 500 12px/1 ${({ theme }) => theme.font.mono}; color: #f37321; letter-spacing: .18em;`;
const Title = styled.span`white-space: nowrap; font: 700 26px/1 'NexonLv2Gothic';`;
const Count = styled.div`position: absolute; right: 40px; top: 44px; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; pointer-events: none; span:first-child { white-space: nowrap; font: 400 15px/1 'NexonLv2Gothic'; } span:last-child { white-space: nowrap; font: 500 13px/1 ${({ theme }) => theme.font.mono}; color: #c9d0d3; letter-spacing: .12em; }`;
const Proceed = styled.button`position: absolute; left: 810px; top: 40px; width: 300px; height: 60px; display: flex; align-items: center; justify-content: center; gap: 12px; cursor: pointer; background: #f37321; color: #140a04; box-shadow: 0 0 24px rgba(243,115,33,.5); clip-path: polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px)); transition: background .2s,box-shadow .2s; pointer-events: auto; font: 700 20px/1 'NexonLv2Gothic'; &:hover { background: #ff8a3d; box-shadow: 0 0 36px rgba(243,115,33,.75); }`;
const Space = styled.span`white-space: nowrap; font: 700 11px/1 ${({ theme }) => theme.font.mono}; padding: 4px 6px; border: 1px solid rgba(20,10,4,.5);`;
const Guide = styled.div`position: absolute; left: 360px; top: 232px; width: 1200px; display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; text-shadow: 0 0 12px rgba(0,0,0,.95),0 2px 4px rgba(0,0,0,.9);`;
const GuideTag = styled.span`white-space: nowrap; font: 500 14px/1 ${({ theme }) => theme.font.mono}; color: #f37321; letter-spacing: .14em;`;
const GuideText = styled.span`white-space: nowrap; font: 400 26px/1.35 'NexonLv2Gothic';`;
const SafetyDim = styled.div`position: absolute; inset: 0; background: rgba(4,5,6,.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 55; pointer-events: auto;`;
const SafetyPanel = styled.div`width: 560px; display: flex; flex-direction: column; gap: 14px; padding: 28px; background: rgba(10,8,6,.9); border: 1px solid rgba(242,194,48,.7); border-top: 3px solid #f2c230;`;
const SafetyCaption = styled.span`font: 500 12px/1 ${({ theme }) => theme.font.mono}; color: #f2c230; letter-spacing: .18em;`;
const SafetyTitle = styled.span`font: 700 28px/1.2 'NexonLv2Gothic';`;
const Rule = styled.div`display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid rgba(242,194,48,.3); background: rgba(242,194,48,.06); font: 400 17px/1.4 'NexonLv2Gothic'; color: #eef1f2;`;
const Check = styled.span`width: 22px; height: 22px; flex: none; display: flex; align-items: center; justify-content: center; border: 1.5px solid #f2c230; color: #f2c230; font: 700 13px/1 ${({ theme }) => theme.font.mono};`;
const Confirm = styled.button`margin-top: 6px; height: 56px; display: flex; align-items: center; justify-content: center; background: #f2c230; color: #1a1404; cursor: pointer; font: 700 18px/1 'NexonLv2Gothic'; &:hover { background: #ffd24d; }`;
