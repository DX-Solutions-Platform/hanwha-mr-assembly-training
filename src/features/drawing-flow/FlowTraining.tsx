'use client';

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { cloneFlowProject, type FlowProject, type FlowStep } from './flowProject';
import { trainingToolShape } from './flowToolCatalog';

interface TrainingStatus {
  step?: FlowStep;
  sec?: { no: number; ko: string };
  stepNo: number;
  left: number;
  pct: number;
  fin: boolean;
  toolOn: boolean;
  msg?: string;
  kind?: string;
}

interface TrainingEngine {
  trainBuild: (project: FlowProject & { nSteps: number }, viewport: HTMLElement, onState: (status: TrainingStatus) => void) => void;
  down: (event: PointerEvent) => void;
  moveP: (event: PointerEvent) => void;
  up: () => void;
  wheel: (event: WheelEvent) => void;
  equip: () => void;
  resetCam: () => void;
  skip: () => void;
  destroy: () => void;
}

export function FlowTraining({ project, onClose }: { project: FlowProject; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const engine = useRef<TrainingEngine>(null);
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [error, setError] = useState('');
  const [restart, setRestart] = useState(0);
  const stepCount = project.sections.reduce((total, section) => total + section.steps.length, 0);

  useEffect(() => {
    const source = window as unknown as {
      FlowEngine: new (canvas: HTMLCanvasElement, overlay: HTMLDivElement) => TrainingEngine;
      ShaperHQ: { apply: (value: TrainingEngine) => void };
      ShaperTex: { patch: (value: TrainingEngine, data: FlowProject) => void };
    };
    let stop: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      if (!canvas.current || !overlay.current || !viewport.current) return;
      let mounted: TrainingEngine | undefined;
      try {
        const active = new source.FlowEngine(canvas.current, overlay.current);
        mounted = active;
        engine.current = active;
        const data = cloneFlowProject(project);
        if (data.key === 'shaper-reference') {
          source.ShaperHQ.apply(active);
          source.ShaperTex.patch(active, data);
        }
        data.sections.forEach((section, index) => {
          section.idx = section.idx.filter((part) => section.steps.some((step) => step.part === data.pieces[part].part));
          section.idx.forEach((part) => { data.pieces[part].sec = index; });
          section.steps = section.steps.map((step) => ({
            ...step, txt: step.txt || step.g,
            tool: trainingToolShape(step.toolK, step.tool || step.toolKo), toolKo: step.toolKo || step.tool,
          }));
        });
        active.trainBuild({ ...data, nSteps: stepCount }, viewport.current, setStatus);
        const move = (event: PointerEvent) => active.moveP(event);
        const up = () => active.up();
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        stop = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          engine.current = null;
          active.destroy();
        };
      } catch (reason) {
        mounted?.destroy();
        engine.current = null;
        setError(reason instanceof Error ? reason.message : '교육장을 열지 못했습니다.');
      }
    });
    return () => { cancelAnimationFrame(frame); stop?.(); };
  }, [project, restart, stepCount]);

  return <Room role="dialog" aria-modal="true" aria-label="생성된 조립 교육장">
    <Header>
      <div><h2>{project.ko}</h2><span>{project.code} · 조립 교육장</span></div>
      <button onClick={onClose}>← 도면 업데이트</button>
    </Header>
    <Scene ref={viewport} onPointerDown={(event) => engine.current?.down(event.nativeEvent)}
      onWheel={(event) => engine.current?.wheel(event.nativeEvent)} onContextMenu={(event) => event.preventDefault()}>
      <canvas key={restart} ref={canvas} />
      <Overlay ref={overlay} />
      <Info aria-live="polite">
        <b>{status?.fin ? '교육 완료' : 'STEP ' + String(status?.stepNo ?? 0).padStart(2, '0') + ' / ' + stepCount}</b>
        <strong>{error || (status?.fin ? '모든 조립 단계를 마쳤습니다.' : status?.step?.txt || '3D 장면 준비 중')}</strong>
        {status?.sec && <span>구간 {status.sec.no} · {status.sec.ko}{status.left > 0 ? ' · 남은 부품 ' + status.left + '개' : ''}</span>}
        {status?.msg && <span>{status.msg}</span>}
      </Info>
      <Actions onPointerDown={(event) => event.stopPropagation()}>
        <button onClick={() => engine.current?.resetCam()}>시점 초기화</button>
        {status?.step?.t === 'fasten' && !status.toolOn && !status.fin &&
          <button onClick={() => engine.current?.equip()}>{status.step.toolKo || '공구 선택'}</button>}
        {status?.fin
          ? <button onClick={() => { setError(''); setRestart((value) => value + 1); }}>다시 시작</button>
          : <button disabled={!status || !!error} onClick={() => engine.current?.skip()}>다음 단계</button>}
      </Actions>
    </Scene>
    <Progress $value={status?.fin ? 100 : status?.pct ?? 0} />
  </Room>;
}

const Room = styled.section`
  position: fixed; inset: 0; z-index: 50; display: grid;
  grid-template-rows: 72px minmax(0, 1fr) 5px; background: #0a0d10;
  button { padding: .7em 1.2em; border-radius: 8px; background: #222b31; color: white; }
  button:hover { background: #f37321; }
`;
const Header = styled.header`
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 28px; background: #0d1114; border-bottom: 1px solid #1a2026;
  h2 { margin: 0 0 3px; font-size: 22px; color: white; }
  span { font: 12px var(--font-mono), monospace; color: #8f9aa1; }
`;
const Scene = styled.div`
  position: relative; overflow: hidden;
  background: radial-gradient(ellipse at 50% 58%, #222c33, #141a1f 55%, #0d1114);
  canvas { width: 100%; height: 100%; display: block; }
`;
const Overlay = styled.div`position: absolute; inset: 0; pointer-events: none;`;
const Info = styled.div`
  position: absolute; inset: 24px 24px auto; display: grid; justify-items: center;
  gap: 8px; color: #fff; text-shadow: 0 2px 8px #000; pointer-events: none;
  b { color: #f37321; font-family: var(--font-mono), monospace; }
  strong { font-size: clamp(16px, 1.5vw, 26px); }
  span { color: #c3cbd0; }
`;
const Actions = styled.div`
  position: absolute; right: 24px; bottom: 24px; display: flex; gap: 8px;
`;
const Progress = styled.div<{ $value: number }>`
  background: linear-gradient(to right, #f37321 ${({ $value }) => $value}%, #232b31 ${({ $value }) => $value}%);
`;
