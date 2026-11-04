'use client';
import styled from 'styled-components';
import { PRACTICE_SECTIONS, PRACTICE_HELP, getPracticeGuide, getPartInfo } from './practiceData';
import { PracticeControls } from './PracticeControls';
import type { PracticeState } from './practiceTypes';

interface HudProps {
  state: PracticeState; isMain: boolean; voice: boolean;
  onBack: () => void; onPause: () => void; onResetView: () => void; onVoice: () => void; onMode: (mode: 'practice' | 'eval') => void; onEdit: () => void; onHeight: (height: number) => void; onResetLayout: () => void;
  onInfoElement: (element: HTMLDivElement | null) => void; onSectionElement: (index: number, element: HTMLDivElement | null) => void; onCoordinateElement: (element: HTMLDivElement | null) => void;
}

/** 원본 HUD 기본 화면 및 클릭한 부품의 설명 패널. */
export function PracticeHud(props: HudProps) {
  const { state, isMain, onBack, onPause, onInfoElement, onSectionElement, onCoordinateElement } = props;
  const section = PRACTICE_SECTIONS[Math.min(3, state.section)], guide = getPracticeGuide(state.section, state.step, state.boltN, state.boltStage, state.restTool), info = getPartInfo(state.selectedPart);
  const total = String(Math.round(((state.section === 0 ? state.step : 4 + state.step) / 13) * 100)).padStart(2, '0');
  return <>
    <Hud $visible={isMain} data-practice-hud>
      <Corners><Corner type="button" aria-label="공정 선택으로" onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f37321" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg></Corner><Corner type="button" aria-label="일시정지" onClick={onPause}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f37321" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5v14" /><path d="M15 5v14" /></svg></Corner></Corners>
      <Progress data-practice-progress><ProgressTitle><span>유압 펌프 조립</span><Total>TOTAL <b>{total}%</b></Total></ProgressTitle><Tracks>{PRACTICE_SECTIONS.map((item, index) => <Section key={item.name}>
        <Track><Fill style={{ width: `${index < state.section ? 100 : index === state.section ? state.step / item.steps.length * 100 : 0}%` }} /></Track>
        <SectionName $status={index < state.section ? 'done' : index === state.section ? 'current' : 'wait'}>{item.name}{index < state.section ? ' ✓' : index === state.section ? <> <Sub>{String(state.step + 1).padStart(2, '0')}/{String(item.steps.length).padStart(2, '0')}</Sub></> : ''}</SectionName>
      </Section>)}</Tracks></Progress>
      <MissionPerspective data-practice-missions><Mission><MissionTitle><span>{section.name} 미션</span><span>{String(state.step + 1).padStart(2, '0')} / {String(section.steps.length).padStart(2, '0')}</span></MissionTitle><MissionRows>{section.steps.map((name, index) => index === state.step ? <Current key={name}><Diamond /><div><b>{name}</b><span>작업 중</span></div></Current> : <MissionRow key={name} $done={index < state.step}>{index < state.step ? <Done>✓</Done> : <Todo><i /></Todo>}<span>{name}</span></MissionRow>)}</MissionRows></Mission></MissionPerspective>
      <PracticeControls {...props} />
      <Views style={{ opacity: state.section === 0 && state.step === 2 ? 0 : 1 }}>{['◀ 완성품', '작업', '재료 ▶'].map((label, index) => <View key={label} $active={state.view === index - 1}>{label}</View>)}</Views>
      <Help style={{ opacity: state.section === 0 && state.step === 2 ? 0 : 1 }}><HelpTitle>MOUSE = GESTURE</HelpTitle>{PRACTICE_HELP.map((item) => <HelpRow key={item.k}><span>{item.k}</span><span>{item.v}</span></HelpRow>)}</Help>
      <Coordinates ref={onCoordinateElement}><b data-coordinate-name /><span data-coordinate-text /></Coordinates>
    </Hud>
    {isMain && <Guide style={{ opacity: state.isRadialOpen ? 0 : 1 }}><GuideTag>{state.isLayoutEditing ? 'LAYOUT' : guide.tag}</GuideTag><GuideText>{state.isLayoutEditing ? '구역을 끌어 위치 이동 · 휠 또는 R로 회전 · L로 종료' : state.mode === 'eval' && state.section === 0 ? '' : guide.text}</GuideText></Guide>}
    <Info ref={onInfoElement} data-practice-info $reverse={state.section === 0 && state.step === 2 && state.selectedPart === 'wrench'}><InfoPanel><InfoTag>{info?.tag}</InfoTag><InfoName>{info?.name}</InfoName><InfoDescription>{info?.desc}</InfoDescription></InfoPanel><InfoLine /><InfoMark /></Info>
    {[['상부','모터 · 상단 커버 · 볼트 · 배선'],['중부','베어링 하우징 · 구동축 · 고정 링'],['하부','펌프 본체 · 베이스 · 플랜지']].map(([name, description], index) => <SceneLabel key={name} ref={(element) => onSectionElement(index, element)}><SceneLine /><ScenePanel><b>{name}</b><span>{description}</span><em>{index < state.section ? '완료' : index === state.section ? '작업 중' : '대기'}</em></ScenePanel></SceneLabel>)}
  </>;
}

const Hud = styled.div<{ $visible: boolean }>`position: absolute; inset: 0; pointer-events: none; opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity .6s; ${({ $visible }) => !$visible && '& * { pointer-events: none !important; }'}`;
const Corners = styled.div`position: absolute; left: 40px; top: 36px; display: flex; gap: 12px;`;
const Corner = styled.button`width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto; border: 1px solid rgba(243,115,33,.75); background: rgba(243,115,33,.05); clip-path: polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px)); &:hover { background: rgba(243,115,33,.22); }`;
const Progress = styled.div`position: absolute; left: 200px; top: 38px; width: 1520px; display: flex; flex-direction: column; gap: 10px;`;
const ProgressTitle = styled.div`display: flex; justify-content: space-between; align-items: baseline; & > span:first-child { white-space: nowrap; font: 700 20px/1 'NexonLv2Gothic'; }`;
const Total = styled.span`white-space: nowrap; font: 500 12px/1 ${({ theme }) => theme.font.mono}; color: #c9d0d3; letter-spacing: .12em; b { font-weight: inherit; color: #f37321; }`;
const Tracks = styled.div`display: flex; gap: 8px;`;
const Section = styled.div`flex: 1; display: flex; flex-direction: column; gap: 7px;`;
const Track = styled.div`position: relative; height: 9px; &::before { content: ''; position: absolute; left: 0; right: 0; top: 4px; height: 1px; background: rgba(243,115,33,.35); } &::after { content: ''; position: absolute; left: 0; top: 0; width: 1px; height: 9px; background: rgba(243,115,33,.8); }`;
const Fill = styled.div`position: absolute; left: 0; top: 3px; height: 3px; background: #f37321; box-shadow: 0 0 8px rgba(243,115,33,.8); transition: width .5s;`;
const SectionName = styled.span<{ $status: string }>`white-space: nowrap; font: ${({ $status }) => $status === 'current' ? 700 : 400} 14px/1 'NexonLv2Gothic'; color: ${({ $status }) => $status === 'done' ? '#3fe0c5' : $status === 'current' ? '#f37321' : '#b4bcc0'};`;
const Sub = styled.span`font: 500 11px/1 ${({ theme }) => theme.font.mono};`;
const MissionPerspective = styled.div`position: absolute; right: 40px; top: 130px; width: 380px; perspective: 1200px;`;
const Mission = styled.div`transform: rotateY(-18deg); transform-origin: 100% 50%; display: flex; flex-direction: column; padding: 16px 16px 14px; background: rgba(243,115,33,.06); backdrop-filter: blur(3px); border: 1px solid rgba(243,115,33,.35); border-top: 2px solid #f37321;`;
const MissionTitle = styled.div`display: flex; justify-content: space-between; align-items: baseline; padding: 0 2px 12px; border-bottom: 1px solid #f37321; color: #f37321; span:first-child { white-space: nowrap; font: 700 19px/1 'NexonLv2Gothic'; } span:last-child { white-space: nowrap; font: 500 14px/1 ${({ theme }) => theme.font.mono}; }`;
const MissionRows = styled.div`display: flex; flex-direction: column; gap: 4px; padding-top: 10px;`;
const Current = styled.div`display: flex; align-items: center; gap: 14px; padding: 11px 12px; background: rgba(243,115,33,.22); border: 1px solid #f37321; box-shadow: 0 0 14px rgba(243,115,33,.25) inset; div { display: flex; flex-direction: column; gap: 7px; } b { white-space: nowrap; font: 700 17px/1 'NexonLv2Gothic'; } span { white-space: nowrap; font: 400 13px/1 'NexonLv2Gothic'; color: #f37321; }`;
const Diamond = styled.i`width: 10px; height: 10px; border: 2px solid #fff; transform: rotate(45deg); box-sizing: border-box !important; flex: none;`;
const MissionRow = styled.div<{ $done: boolean }>`display: flex; align-items: center; gap: 14px; height: 40px; padding: 0 12px; border: 1px solid ${({ $done }) => $done ? 'rgba(243,115,33,.18)' : 'rgba(255,255,255,.08)'}; & > span:last-child { white-space: nowrap; font: 400 16px/1 'NexonLv2Gothic'; color: ${({ $done }) => $done ? '#e6eaec' : '#f0ebe6'}; }`;
const Done = styled.span`font: 700 14px/1 ${({ theme }) => theme.font.mono}; color: #3fe0c5;`;
const Todo = styled.span`width: 14px; display: flex; justify-content: center; i { width: 5px; height: 5px; background: #c9d0d3; }`;
const Views = styled.div`position: absolute; left: 760px; top: 880px; width: 400px; display: flex; justify-content: center; align-items: center; gap: 18px; transition: opacity .3s;`;
const View = styled.span<{ $active: boolean }>`white-space: nowrap; font: ${({ $active }) => $active ? 700 : 400} 14px/1 'NexonLv2Gothic'; color: ${({ $active }) => $active ? '#f37321' : '#b4bcc0'}; padding: 6px 10px; border-bottom: 2px solid ${({ $active }) => $active ? '#f37321' : 'transparent'};`;
const Help = styled.div`position: absolute; left: 40px; bottom: 30px; transition: opacity .3s; display: flex; flex-direction: column; gap: 7px; padding: 12px 14px; background: rgba(5,6,7,.55); border: 1px solid rgba(255,255,255,.12);`;
const HelpTitle = styled.span`font: 500 11px/1 ${({ theme }) => theme.font.mono}; color: #f37321; letter-spacing: .14em;`;
const HelpRow = styled.div`display: flex; gap: 10px; span:first-child { white-space: nowrap; width: 120px; font: 500 12px/1.3 ${({ theme }) => theme.font.mono}; color: #ffb07a; } span:last-child { white-space: nowrap; font: 400 13px/1.3 'NexonLv2Gothic'; color: #eef1f2; }`;
const Coordinates = styled.div`position: absolute; left: 0; top: 0; opacity: 0; pointer-events: none; display: flex; flex-direction: column; gap: 5px; padding: 8px 12px; background: rgba(10,8,6,.8); border: 1px solid rgba(243,115,33,.6); border-top: 2px solid #f37321; b { white-space: nowrap; font: 700 14px/1 'NexonLv2Gothic'; color: #fff; } span { white-space: nowrap; font: 500 12px/1 ${({ theme }) => theme.font.mono}; color: #ffb07a; }`;
const Guide = styled.div`position: absolute; left: 360px; top: 232px; width: 1200px; display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; text-shadow: 0 0 12px rgba(0,0,0,.95),0 2px 4px rgba(0,0,0,.9);`;
const GuideTag = styled.span`white-space: nowrap; font: 500 14px/1 ${({ theme }) => theme.font.mono}; color: #f37321; letter-spacing: .14em;`;
const GuideText = styled.span`white-space: nowrap; font: 400 26px/1.35 'NexonLv2Gothic';`;
const Info = styled.div<{ $reverse: boolean }>`position: absolute; left: 0; top: 0; opacity: 0; pointer-events: none; display: flex; flex-direction: ${({ $reverse }) => $reverse ? 'row-reverse' : 'row'}; align-items: center; z-index: 40;`;
const InfoPanel = styled.div`display: flex; flex-direction: column; gap: 7px; padding: 12px 16px 14px; max-width: 320px; background: rgba(10,8,6,.92); backdrop-filter: blur(6px); border: 1px solid rgba(243,115,33,.5); border-top: 2px solid #f37321;`;
const InfoTag = styled.span`white-space: nowrap; font: 500 11px/1 ${({ theme }) => theme.font.mono}; color: #f37321; letter-spacing: .1em;`;
const InfoName = styled.span`white-space: nowrap; font: 700 22px/1.1 'NexonLv2Gothic'; color: #fff;`;
const InfoDescription = styled.span`font: 400 15px/1.5 'NexonLv2Gothic'; color: #eef1f2; text-wrap: pretty;`;
const InfoLine = styled.div`width: 50px; height: 1.5px; background: #f37321; box-shadow: 0 0 6px #f37321;`;
const InfoMark = styled.div`width: 9px; height: 9px; border: 2px solid #f37321; transform: rotate(45deg);`;
const SceneLabel = styled.div`position: absolute; left: 0; top: 0; opacity: 0; pointer-events: none; display: flex; align-items: center; gap: 10px;`;
const SceneLine = styled.div`width: 60px; height: 1px; background: #f37321;`;
const ScenePanel = styled.div`display: flex; flex-direction: column; gap: 6px; padding: 10px 14px; background: rgba(243,115,33,.08); border: 1px solid rgba(243,115,33,.5); border-top: 2px solid #f37321; b { white-space: nowrap; font: 700 20px/1 'NexonLv2Gothic'; color: #fff; } span { white-space: nowrap; font: 400 14px/1 'NexonLv2Gothic'; color: #e6eaec; } em { white-space: nowrap; font: 500 12px/1 ${({ theme }) => theme.font.mono}; color: #f37321; }`;
