import { useState } from 'react';
import styled from 'styled-components';
import { ReviewInput, ReviewLabel } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { approachDistance, editApproachPose } from './lessonApproach';
import type { LessonActionChange } from './lessonActionEdit';
import type { PreviewAction, PreviewPart } from './lessonPreviewData';

export function LessonActionEditor({ action, parts, disabled, onApply }: {
  action: PreviewAction; parts: PreviewPart[]; disabled: boolean; onApply: (change: LessonActionChange) => void;
}) {
  const attach = action.kind === 'attach';
  const [direction, setDirection] = useState(String(action.approach?.directionDeg ?? 0));
  const [tilt, setTilt] = useState(String(action.approach?.tiltDeg ?? 0));
  const [turns, setTurns] = useState(action.rotationDeg === undefined ? '' : String(Number((action.rotationDeg / 360).toFixed(6))));
  const [clockwise, setClockwise] = useState(action.clockwise);
  if (!attach && action.kind !== 'fasten' && action.kind !== 'thread') return null;
  const approach = { directionDeg: Number(direction), tiltDeg: Number(tilt), distanceM: approachDistance(action, parts) };
  const available = !attach || !!editApproachPose(action, parts, approach);
  const amount = Number(turns);
  const valid = attach ? !!direction.trim() && !!tilt.trim() && Number.isFinite(approach.directionDeg) &&
    approach.directionDeg >= -180 && approach.directionDeg <= 180 && approach.tiltDeg >= 0 && approach.tiltDeg <= 90
    : Number.isFinite(amount) && amount >= .001 && amount <= 1000;
  return <Editor onSubmit={(event) => {
    event.preventDefault();
    if (!disabled && valid && available) onApply(attach ? { approach } : { turns: amount, clockwise });
  }}>
    <strong>동작 설정</strong>
    {attach ? <>
      <Muted>포트 축에서 바깥을 볼 때의 진입 방향입니다. 기울기가 0°면 축을 따라 들어옵니다.</Muted>
      <Fields>
        <ReviewLabel>진입 방향 (°)<ReviewInput type="number" min={-180} max={180} step="any" value={direction}
          disabled={disabled || !available} onChange={(event) => setDirection(event.target.value)} /></ReviewLabel>
        <ReviewLabel>진입 기울기 (°)<ReviewInput type="number" min={0} max={90} step="any" value={tilt}
          disabled={disabled || !available} onChange={(event) => setTilt(event.target.value)} /></ReviewLabel>
      </Fields>
      <Muted>{available ? '부품이 들어오기 시작하는 자세를 조정합니다.' : '이 단계는 진입 편집에 필요한 결합 좌표가 없습니다.'}</Muted>
    </> : <>
      <Muted>체결부 머리에서 바라본 방향을 선택하세요.</Muted>
      <Fields>
        <ActionButton type="button" aria-pressed={clockwise} $primary={clockwise} disabled={disabled} onClick={() => setClockwise(true)}>↻ 시계 방향</ActionButton>
        <ActionButton type="button" aria-pressed={!clockwise} $primary={!clockwise} disabled={disabled} onClick={() => setClockwise(false)}>↶ 반시계 방향</ActionButton>
      </Fields>
      <ReviewLabel>체결 바퀴 수<ReviewInput type="number" min={.001} max={1000} step="any" disabled={disabled}
        value={turns} onChange={(event) => setTurns(event.target.value)} /></ReviewLabel>
      {valid && <Muted>{(amount * 360).toLocaleString('ko-KR', { maximumFractionDigits: 3 })}° 회전</Muted>}
    </>}
    <ActionButton type="submit" $primary disabled={disabled || !valid || !available}>동작 설정 적용</ActionButton>
  </Editor>;
}

const Editor = styled.form(({ theme }) => ({
  display: 'grid', gap: theme.space[2], padding: theme.space[3], background: theme.color.bgEdge,
  border: '1px solid ' + theme.color.primaryLineWeak, flexShrink: 0,
  '& strong': { color: theme.color.primarySoft },
}));
const Fields = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: theme.space[2],
  '& input, & button': { width: '100%', minWidth: 0 },
}));
