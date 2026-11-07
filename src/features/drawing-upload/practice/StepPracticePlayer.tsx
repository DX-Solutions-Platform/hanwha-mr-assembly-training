import { useEffect, useRef, useState, type PointerEvent } from 'react';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { ActionButton, Muted } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { angularDelta, displayedTorque } from '@/features/training-practice/assemblyMath';
import { AssemblySound } from '@/features/training-practice/assemblySound';
import type { AssemblyInstruction } from '../instructions/assemblyInstructions';
import type { PracticeConfig } from './stepPracticeConfig';
import { StepPracticeScene, type PracticePhase } from './StepPracticeScene';
import { advancePracticeTurn, getPracticeResistance } from './stepPracticeMotion';
import { Panel, Toolbar, Viewport, Workspace } from './stepPracticeStyles';

const guide = {
  place: '준비 구역의 부품을 주황색 윤곽 위로 끌어다 놓으세요.',
  insert: '오른쪽 준비 구역의 볼트를 주황색 체결 위치로 옮기세요.',
  tool: '체결부가 확대되었습니다. 아래에서 공구를 가져오세요.',
  turn: '원을 따라 시계 방향으로 드래그하고, 목표 토크에 도달하면 놓으세요.',
  done: '부품 배치와 볼트 체결을 완료했습니다.',
};

export default function StepPracticePlayer({ model, parts, instructions, config, notice, onSetup }: {
  model: StepModel; parts: StepAssemblyPart[]; instructions: AssemblyInstruction[]; config: PracticeConfig;
  notice: string; onSetup: () => void;
}) {
  const [phase, setPhase] = useState<PracticePhase>('place');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [turn, setTurn] = useState({ progress: 0, rotation: 0, excess: 0 });
  const turnRef = useRef(turn);
  const gesture = useRef<{ id: number; x: number; y: number; previous: number } | null>(null);
  const sound = useRef<AssemblySound | null>(null);
  const lastResistanceSound = useRef(0);
  const targetTorque = Number(config.torque);
  const actualTorque = targetTorque * (displayedTorque(turn.progress) / 12 + turn.excess / 3);
  const resistance = getPracticeResistance(turn.progress);
  const isOver = turn.excess > 0.45;
  const isSeating = turn.progress >= 0.76 && turn.progress < 1;
  const placement = parts[config.placement.partNumber - 1];
  const fastening = parts[config.fastening.partNumber - 1];
  const active = phase === 'place' ? placement : fastening;
  const description = instructions.find((step) => step.partNumber === active.number)?.description;

  useEffect(() => () => { sound.current?.dispose(); sound.current = null; }, []);

  function drop(matched: boolean) {
    if (!matched) { setMessage('표시된 위치에 맞지 않았습니다. 주황색 윤곽을 따라 다시 놓으세요.'); return; }
    setMessage(phase === 'place' ? '부품 배치 완료 · 볼트 체결 단계로 이동했습니다.' : '볼트 삽입 완료 · 공구를 가져오세요.');
    setPhase(phase === 'place' ? 'insert' : 'tool');
  }

  function resetTurn() {
    gesture.current = null;
    const initial = { progress: 0, rotation: 0, excess: 0 };
    turnRef.current = initial;
    setTurn(initial);
    lastResistanceSound.current = 0;
    setMessage('');
  }

  function rotate(delta: number) {
    const current = turnRef.current;
    if (delta <= 0 || current.excess > 0.45) return;
    const motion = advancePracticeTurn(current.progress, delta);
    const next = {
      progress: motion.progress,
      rotation: current.rotation + motion.rotation,
      excess: current.progress === 1 ? current.excess + delta : 0,
    };
    turnRef.current = next;
    setTurn(next);
    if (next.excess > 0.45) sound.current?.play('err');
    else if (current.progress < 1 && next.progress === 1) sound.current?.play('click');
    else if (next.progress >= 0.76 && next.progress < 1) {
      const now = performance.now();
      if (now - lastResistanceSound.current >= 85) {
        sound.current?.play('heavy');
        lastResistanceSound.current = now;
      }
    }
  }

  function completeTurn() {
    const current = turnRef.current;
    if (current.excess > 0.45) { setMessage('목표 토크를 초과했습니다. 다시 체결하세요.'); return; }
    if (current.progress < 1) return;
    setMessage('목표 토크에 도달했습니다. 실습을 완료했습니다.');
    setPhase('done');
  }

  function startTurn(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || gesture.current || isOver) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
    if (Math.hypot(event.clientX - x, event.clientY - y) < 16) return;
    gesture.current = { id: event.pointerId, x, y, previous: Math.atan2(event.clientY - y, event.clientX - x) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveTurn(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || Math.hypot(event.clientX - current.x, event.clientY - current.y) < 16) return;
    const angle = Math.atan2(event.clientY - current.y, event.clientX - current.x);
    rotate(angularDelta(angle, current.previous));
    current.previous = angle;
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled) completeTurn();
  }

  return (
    <Workspace>
      <Panel>
        <h3>웹 조립 실습</h3>
        <Muted>{guide[phase]}</Muted>
        {(phase === 'place' || phase === 'insert') && <ZoneLegend>
          <span>왼쪽 · 조립 작업 구역</span><span>오른쪽 · 부품 준비 구역</span>
        </ZoneLegend>}
        <Viewport role="region" aria-label={phase === 'tool' || phase === 'turn' ? '체결 확대 화면' : '3D 조립 실습'}>
          <StepPracticeScene key={`${attempt}-${phase === 'done' ? 'done' : 'work'}`} model={model} placement={placement}
            fastening={fastening} config={config} phase={phase} turn={turn} onDrop={drop} />
          {phase === 'turn' && <TurnRing role="group" aria-label="공구 회전 조작" tabIndex={0} $underLoad={isSeating}
            onPointerDown={startTurn} onPointerMove={moveTurn}
            onPointerUp={(event) => finishGesture(event, false)} onPointerCancel={(event) => finishGesture(event, true)}
            onLostPointerCapture={(event) => finishGesture(event, true)} onKeyDown={(event) => {
              if (event.key === 'ArrowRight') { event.preventDefault(); rotate(Math.PI / 12); }
              if (event.key === 'Enter') { event.preventDefault(); completeTurn(); }
            }} />}
        </Viewport>
        <Toolbar>
          <ActionButton onClick={onSetup}>실습 설정으로</ActionButton>
          <ActionButton onClick={() => { resetTurn(); setAttempt((value) => value + 1); setPhase('place'); }}>처음부터 다시</ActionButton>
        </Toolbar>
      </Panel>
      <Panel>
        <h3>조립 진행 · {phase === 'done' ? 2 : phase === 'place' ? 0 : 1} / 2</h3>
        <Stage $active={phase === 'place'}>1. 부품 배치 · {phase === 'place' ? '진행 중' : '완료'}</Stage>
        <Stage $active={phase !== 'place' && phase !== 'done'}>2. 볼트 체결 · {phase === 'done' ? '완료' : phase === 'place' ? '대기' : '진행 중'}</Stage>
        <strong>#{active.number} {active.name}</strong>
        {description && <Muted>{description}</Muted>}
        {phase !== 'place' && <Muted>공구 · {config.tool}</Muted>}
        {phase !== 'place' && <Muted>{config.exampleTorque ? '실습 예시 목표' : '목표 토크'} · {targetTorque} N·m</Muted>}
        {phase === 'tool' && <ActionButton $primary onClick={() => {
          resetTurn(); (sound.current ??= new AssemblySound()).play('seat'); setPhase('turn');
        }}>{config.tool} 가져오기</ActionButton>}
        {phase === 'turn' && <>
          <Gauge $warning={isOver} aria-live="off">{actualTorque.toFixed(2)} <small>N·m</small></Gauge>
          <progress aria-label="목표 토크 도달률" max={1} value={turn.progress} />
          <ResistanceLabel>회전 저항 <strong>{Math.round(resistance * 100)}%</strong>
            <progress aria-label="회전 저항" max={1} value={resistance} />
          </ResistanceLabel>
          <Muted>키보드는 오른쪽 화살표로 돌리고 Enter로 놓습니다.</Muted>
          {isOver && <ActionButton onClick={resetTurn}>다시 체결</ActionButton>}
        </>}
        <Stage role="status" $active={phase === 'done'}>{isOver ? '토크 초과 · 공구를 놓고 다시 체결하세요.'
          : phase === 'turn' && turn.progress === 1 ? '목표 도달 · 공구를 놓으세요.'
          : phase === 'turn' && isSeating ? '마무리 체결 · 저항이 커집니다. 천천히 돌리세요.' : message || guide[phase]}</Stage>
        {notice && <Muted>{notice}</Muted>}
      </Panel>
    </Workspace>
  );
}

const Stage = styled.div<{ $active: boolean }>(({ theme, $active }) => ({
  padding: theme.space[2], border: '1px solid ' + ($active ? theme.color.primary : theme.color.primaryLineWeak),
  background: $active ? theme.color.primaryFill : 'transparent', fontSize: theme.size.md,
}));
const Gauge = styled.strong<{ $warning: boolean }>(({ theme, $warning }) => ({
  color: $warning ? theme.color.danger : theme.color.primarySoft, fontFamily: theme.font.mono, fontSize: theme.size.xxl,
  '& small': { fontSize: theme.size.md },
}));
const ZoneLegend = styled.div(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.space[2],
  color: theme.color.inkMuted, fontSize: theme.size.sm,
  '& span:first-child': { color: theme.color.primarySoft },
  '& span:last-child': { color: '#a9c4db' },
}));
const ResistanceLabel = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: '1fr auto', gap: theme.space[1], color: theme.color.inkMuted, fontSize: theme.size.sm,
  '& progress': { gridColumn: '1 / -1', width: '100%', accentColor: theme.color.primary },
}));
const TurnRing = styled.div<{ $underLoad: boolean }>(({ theme, $underLoad }) => ({
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(68%, 300px)', aspectRatio: 1,
  border: '2px dashed ' + ($underLoad ? theme.color.warning : theme.color.primary), borderRadius: '50%', cursor: 'grab', touchAction: 'none',
  '&:active': { cursor: 'grabbing' }, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
