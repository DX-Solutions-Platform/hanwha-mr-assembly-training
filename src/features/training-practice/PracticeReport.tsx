'use client';
import styled from 'styled-components';
import type { AssemblyReport } from './assemblyTypes';

interface ReportProps { report: AssemblyReport; section: number; onRestart: () => void; onClose: () => void; }

/** Demo 1 HUD의 REPORT와 진입용 PAUSE. 펌프 실습 화면에만 사용합니다. */
export function PracticeReport({ report, section, onRestart, onClose }: ReportProps) {
  return <ReportDim role="dialog" aria-modal="true" aria-label={section >= 3 ? '유압 펌프 조립 완료' : '현재까지 진행 현황'}>
    <ReportPanel>
      <Heading><Titles><Tag>REPORT · 진행 현황</Tag><Title>{section >= 3 ? '유압 펌프 조립 완료' : '현재까지 진행 현황'}</Title></Titles><Grade><span>{report.mode}</span><b>{report.grade}</b></Grade></Heading>
      <Metrics>
        <Metric><Label>소요 시간</Label><Time>{report.time}</Time></Metric>
        <Metric><Label>실수 횟수</Label><Value>{report.mistakes}</Value></Metric>
        <Metric><Label>힌트 사용</Label><Value>{report.hints}</Value></Metric>
        <Metric><Label>토크 정확도</Label><Value $accent>{report.torque}</Value></Metric>
      </Metrics>
      <Bolts><span>볼트별 토크 (N·m)</span><b>{report.bolts}</b></Bolts>
      <Record><i /><span>교육 기록이 담당자에게 전송되었습니다 · {report.at}</span></Record>
      <Actions><Restart type="button" onClick={onRestart}>다시 하기</Restart><Close type="button" onClick={onClose}>닫기</Close></Actions>
    </ReportPanel>
  </ReportDim>;
}

export function PracticePause({ onResume, onReport, onRestart, onBack }: { onResume: () => void; onReport: () => void; onRestart: () => void; onBack: () => void; }) {
  return <PauseDim role="dialog" aria-modal="true" aria-label="일시정지"><PausePanel>
    <Tag>PAUSED</Tag><PauseTitle>일시정지</PauseTitle>
    <PauseAction type="button" $primary onClick={onResume}>계속하기</PauseAction>
    <PauseAction type="button" onClick={onReport}>진행 현황 보기</PauseAction>
    <PauseAction type="button" onClick={onRestart}>처음부터 다시</PauseAction>
    <PauseAction type="button" onClick={onBack}>조립 카드로 나가기</PauseAction>
  </PausePanel></PauseDim>;
}

const ReportDim = styled.div`position:absolute;inset:0;background:rgba(4,5,6,.62);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:55;pointer-events:auto;`;
const ReportPanel = styled.div`width:760px;display:flex;flex-direction:column;gap:22px;padding:32px;background:rgba(10,8,6,.92);border:1px solid rgba(243,115,33,.6);border-top:3px solid #f37321;clip-path:polygon(0 0,calc(100% - 26px) 0,100% 26px,100% 100%,26px 100%,0 calc(100% - 26px));`;
const Heading = styled.div`display:flex;justify-content:space-between;align-items:flex-end;`;
const Titles = styled.div`display:flex;flex-direction:column;gap:10px;`;
const Tag = styled.span`font:500 12px/1 ${({ theme }) => theme.font.mono};color:#f37321;letter-spacing:.18em;`;
const Title = styled.span`font:700 32px/1.1 'NexonLv2Gothic';`;
const Grade = styled.div`display:flex;flex-direction:column;align-items:flex-end;gap:8px;span {font:400 13px/1 'NexonLv2Gothic';color:#c9d0d3;}b {font:700 26px/1 'NexonLv2Gothic';color:#3fe0c5;}`;
const Metrics = styled.div`display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;`;
const Metric = styled.div`display:flex;flex-direction:column;gap:10px;padding:16px;border:1px solid rgba(243,115,33,.3);`;
const Label = styled.span`font:400 13px/1 'NexonLv2Gothic';color:#c9d0d3;`;
const Time = styled.span`white-space:nowrap;font:700 24px/1 'NexonLv2Gothic';`;
const Value = styled.span<{ $accent?: boolean }>`font:700 30px/1 ${({ theme }) => theme.font.mono};${({ $accent }) => $accent ? 'color:#f37321;' : ''}`;
const Bolts = styled.div`display:flex;justify-content:space-between;padding:12px 16px;background:rgba(243,115,33,.06);span {font:400 14px/1 'NexonLv2Gothic';color:#c9d0d3;}b {font:500 14px/1 ${({ theme }) => theme.font.mono};color:#ffb07a;}`;
const Record = styled.div`display:flex;align-items:center;gap:10px;i {width:8px;height:8px;border-radius:50%;background:#3fe0c5;}span {font:400 14px/1 'NexonLv2Gothic';color:#eef1f2;}`;
const Actions = styled.div`display:flex;gap:10px;`;
const Restart = styled.button`flex:1;height:56px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(243,115,33,.5);cursor:pointer;font:400 17px/1 'NexonLv2Gothic';&:hover {background:rgba(243,115,33,.16);}`;
const Close = styled.button`flex:2;height:56px;display:flex;align-items:center;justify-content:center;background:#f37321;color:#140a04;cursor:pointer;font:700 18px/1 'NexonLv2Gothic';&:hover {background:#ff8a3d;}`;
const PauseDim = styled(ReportDim)`backdrop-filter:blur(6px);z-index:50;`;
const PausePanel = styled.div`width:520px;display:flex;flex-direction:column;gap:10px;padding:28px;background:rgba(10,8,6,.8);border:1px solid rgba(243,115,33,.6);border-top:2px solid #f37321;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));`;
const PauseTitle = styled.span`font:700 30px/1.2 'NexonLv2Gothic';padding-bottom:12px;`;
const PauseAction = styled.button<{ $primary?: boolean }>`height:58px;display:flex;align-items:center;padding:0 20px;cursor:pointer;font:${({ $primary }) => $primary ? 700 : 400} 18px/1 'NexonLv2Gothic';${({ $primary }) => $primary ? 'background:#f37321;color:#140a04;' : 'border:1px solid rgba(243,115,33,.5);'}&:hover {background:${({ $primary }) => $primary ? '#ff8a3d' : 'rgba(243,115,33,.16)'};}`;
