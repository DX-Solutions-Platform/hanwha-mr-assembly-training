'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useState } from 'react';
import styled from 'styled-components';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted } from '@/features/drawing-upload-dev/ui/sharedStyles';
import type { PreviewAction, PreviewPart } from './lessonPreviewData';
import { lessonMotionDuration, motionLabel, motionPhase, turnProgress } from './lessonMotion';
import { LESSON_PREVIEW_MATERIALS, type LessonMaterialId, type LessonMaterialOverride } from './lessonPreviewMaterials';

const ModelPreview = dynamic(() => import('./LessonModelPreview'), { ssr: false, loading: () => <span role="status">3D 화면 준비 중…</span> });

const materialIds = Object.keys(LESSON_PREVIEW_MATERIALS) as LessonMaterialId[];

export function LessonStepPreview({ assets, assetList, parts, action, motionKey, title, subtitle, caution, checkpoints, lightweight = false,
  stepNumber, stepCount, materialsByPart, onMaterialChange, editDisabled, packageLabel, onPrevious, onNext }: {
  assets: Record<string, Uint8Array<ArrayBuffer>>; assetList: unknown; parts: PreviewPart[];
  action?: PreviewAction; motionKey: string; title: string; subtitle: string; caution: string; checkpoints: string[];
  materialsByPart: ReadonlyMap<string, LessonMaterialOverride>;
  onMaterialChange: (partIds: string[], material: LessonMaterialId) => void;
  editDisabled: boolean;
  packageLabel: string;
  lightweight?: boolean;
  stepNumber: number; stepCount: number; onPrevious: () => void; onNext: () => void;
}) {
  const [playback, setPlayback] = useState<{ key: string; start: number; progress: number }>();
  const [modelStatus, setModelStatus] = useState<{ ready: boolean; partIds: ReadonlySet<string> }>();
  const [cameraRequest, setCameraRequest] = useState({ id: 0, target: true });
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const materialsId = useId();
  const current = playback?.key === motionKey ? playback : undefined;
  const playStart = current?.start;
  const progress = current?.progress ?? 1;
  const playing = !!current && progress < 1;
  const playbackMs = lessonMotionDuration(action);
  const phases = action?.boltOrder.length ? action.boltOrder : undefined;
  const phaseIndex = motionPhase(progress, phases?.length ?? 1).index;
  const showRotation = action?.rotationDeg !== undefined && !!current;
  const isVisualAction = action && ['attach', 'inspect', 'touch', 'fasten', 'thread'].includes(action.kind);
  const canFocusOnAction = !!action?.partIds.length;
  const focusOnAction = cameraRequest.target && canFocusOnAction;
  const supportId = action?.target?.partId;
  const editablePartIds = action?.partIds.filter((id) => modelStatus?.partIds.has(id)) ?? [];
  const supportParts = editablePartIds.filter((id) => id === supportId && id !== action?.movingId);
  const workParts = editablePartIds.filter((id) => !supportParts.includes(id));
  const canPickMaterials = focusOnAction && editablePartIds.length > 0;
  const workMaterial = materialsByPart.get(workParts[0]) ?? 'original';
  const supportMaterial = materialsByPart.get(supportParts[0]) ?? 'original';

  useEffect(() => {
    if (!playing || playStart === undefined) return;
    let frame: number;
    const update = (time: number) => {
      const amount = Math.max(0, Math.min(1, (time - playStart) / playbackMs));
      setPlayback((previous) => previous?.start === playStart && previous.key === motionKey ? { ...previous, progress: amount } : previous);
      if (amount < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [playStart, motionKey, playbackMs, playing]);

  const camera = (target: boolean) => setCameraRequest((previous) => ({ id: previous.id + 1, target }));
  return <PreviewPanel aria-label="단계 미리보기">
    <ReviewHeader><ReviewTitle>단계 미리보기</ReviewTitle><Muted>{stepNumber || '–'} / {stepCount}</Muted></ReviewHeader>
    <Toolbar>
      <ActionButton type="button" aria-pressed={!focusOnAction} onClick={() => camera(false)}>전체 보기</ActionButton>
      <ActionButton type="button" disabled={!canFocusOnAction} aria-pressed={focusOnAction}
        onClick={() => camera(true)}>작업 부품 보기</ActionButton>
      <ActionButton type="button" disabled={!canPickMaterials} aria-expanded={canPickMaterials && materialsOpen} aria-controls={materialsId}
        onClick={() => setMaterialsOpen((open) => !open)}>재질 선택</ActionButton>
      <Muted>드래그로 회전 · 휠로 확대</Muted>
    </Toolbar>
    <MaterialsPanel id={materialsId} hidden={!canPickMaterials || !materialsOpen}>
      {!!workParts.length && <MaterialChoices label="작업 부품" disabled={editDisabled}
        value={workParts.every((id) => (materialsByPart.get(id) ?? 'original') === workMaterial) ? workMaterial : undefined}
        onChange={(material) => onMaterialChange(workParts, material)} />}
      {!!supportParts.length && <MaterialChoices label="맞물리는 부품" disabled={editDisabled} value={supportMaterial}
        onChange={(material) => onMaterialChange(supportParts, material)} />}
      <MaterialsFooter>
        <Muted>부품별로 적용되며 {packageLabel}에 포함됩니다.</Muted>
        <ActionButton type="button" disabled={editDisabled || !editablePartIds.some((id) => materialsByPart.has(id))}
          onClick={() => onMaterialChange(editablePartIds, 'original')}>이 동작의 원본 재질로 복원</ActionButton>
      </MaterialsFooter>
    </MaterialsPanel>
    <Viewport>
      <ModelPreview assetList={assetList} assets={assets} parts={parts} action={action} progress={progress} playing={playing}
        hasPlayback={!!current} cameraRequest={cameraRequest} viewKey={motionKey} materialsByPart={materialsByPart} onReady={setModelStatus}
        lightweight={lightweight} />
      {title && <Badge aria-live="polite">{title}{action ? ' · ' + action.label : ''}</Badge>}
      {playing && action && <MotionStatus><span />{motionLabel(action, progress)}</MotionStatus>}
    </Viewport>
    {action && (phases || showRotation) && <MotionBar aria-label="동작 시각화">
      {phases && <Muted>체결 순서</Muted>}
      {phases?.map((bolt, index) => <Bolt key={bolt + index} title={bolt}
        $active={!!current && index === phaseIndex}>{index + 1}</Bolt>)}
      {showRotation && <Muted>{action.clockwise ? '↻' : '↶'} {Math.round((action.rotationDeg ?? 0) * turnProgress(action, progress))}°</Muted>}
    </MotionBar>}
    <Captions aria-live="polite">
      {subtitle && <Subtitle><strong>자막</strong><span>{subtitle}</span></Subtitle>}
      {caution && <Warning><strong>경고</strong><span>{caution}</span></Warning>}
      {!!checkpoints.length && <Notice><strong>확인 알림 {checkpoints.length}건</strong><span>{checkpoints[0]}</span></Notice>}
      {!subtitle && !caution && !checkpoints.length && <Muted>단계를 선택하면 자막과 안내가 표시됩니다.</Muted>}
    </Captions>
    <Playback>
      <ActionButton type="button" disabled={stepNumber <= 1} onClick={onPrevious}>← 이전 단계</ActionButton>
      <ActionButton type="button" $primary disabled={!isVisualAction || !modelStatus?.ready} onClick={() => {
        if (playing) setPlayback(undefined);
        else setPlayback({ key: motionKey, start: performance.now(), progress: 0 });
      }}>{playing ? '■ 정지' : current ? '↻ 다시 보기' : '▶ 동작 미리보기'}</ActionButton>
      <ActionButton type="button" disabled={!stepNumber || stepNumber >= stepCount} onClick={onNext}>다음 단계 →</ActionButton>
    </Playback>
  </PreviewPanel>;
}

function MaterialChoices({ label, value, disabled, onChange }: {
  label: string; value?: LessonMaterialId; disabled: boolean; onChange: (value: LessonMaterialId) => void;
}) {
  return <MaterialRow role="group" aria-label={label + ' 재질'}>
    <strong>{label}</strong>
    <MaterialOptions>
      {materialIds.map((id) => <ActionButton key={id} type="button" disabled={disabled} aria-pressed={id === value} onClick={() => onChange(id)}>
        {LESSON_PREVIEW_MATERIALS[id].label}
      </ActionButton>)}
    </MaterialOptions>
  </MaterialRow>;
}

const PreviewPanel = styled(ReviewPanel)(({ theme }) => ({ background: theme.color.bgMid }));
const Toolbar = styled.div(({ theme }) => ({
  flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2], padding: theme.space[3],
  '& button': { minHeight: theme.space[6], paddingInline: theme.space[3], fontSize: theme.size.sm },
  '& button[aria-pressed="true"]': { borderColor: theme.color.primary, color: theme.color.primarySoft },
}));
const MaterialsPanel = styled.div(({ theme }) => ({
  display: 'grid', flexShrink: 0, gap: theme.space[2], marginInline: theme.space[3], marginBottom: theme.space[3],
  padding: theme.space[3], background: theme.color.panel, border: '1px solid ' + theme.color.primaryLineWeak,
  '&[hidden]': { display: 'none' },
}));
const MaterialRow = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2], fontSize: theme.size.sm,
  '& strong': { minWidth: '7em', color: theme.color.ink },
}));
const MaterialOptions = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', gap: theme.space[2],
  '& button': { minHeight: 28, paddingInline: theme.space[2], fontSize: theme.size.sm },
  '& button[aria-pressed="true"]': { borderColor: theme.color.primary, color: theme.color.primarySoft },
}));
const MaterialsFooter = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[2],
  '& button': { minHeight: 28, fontSize: theme.size.sm },
}));
const Viewport = styled.div(({ theme }) => ({
  minHeight: 240, flex: 1, position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center',
  color: theme.color.inkMuted, background: theme.color.bgCenter, borderBlock: '1px solid ' + theme.color.primaryLineWeak,
  '& > span[role]': { zIndex: 1, padding: theme.space[2], background: theme.color.bgMid },
}));
const Badge = styled.div(({ theme }) => ({
  position: 'absolute', zIndex: 1, left: theme.space[3], top: theme.space[3], maxWidth: 'calc(100% - 24px)',
  padding: theme.space[2], color: theme.color.ink, background: theme.color.panel, pointerEvents: 'none',
  fontSize: theme.size.sm, fontWeight: theme.weight.bold,
}));
const MotionStatus = styled(Badge)(({ theme }) => ({
  top: 'auto', bottom: theme.space[3], display: 'flex', alignItems: 'center', gap: theme.space[2],
  padding: theme.space[2] + 'px ' + theme.space[3] + 'px', background: theme.color.bgCenter,
  '& > span': { width: 7, height: 7, borderRadius: '50%', background: theme.color.primary },
}));
const MotionBar = styled.div(({ theme }) => ({
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0, gap: theme.space[1], padding: theme.space[2] + 'px ' + theme.space[3] + 'px',
  borderBottom: '1px solid ' + theme.color.primaryLineWeak,
}));
const Bolt = styled.span<{ $active: boolean }>(({ theme, $active }) => ({
  fontFamily: theme.font.mono, fontSize: theme.size.sm, padding: '3px 6px', border: '1px solid ' + theme.color.primaryLine,
  background: $active ? theme.color.primary : theme.color.bgEdge, color: $active ? theme.color.onPrimary : theme.color.ink,
}));
const Captions = styled.div(({ theme }) => ({
  display: 'grid', gap: theme.space[1], padding: theme.space[3], overflowY: 'auto', maxHeight: 192, flexShrink: 0,
}));
const Subtitle = styled.div(({ theme }) => ({
  padding: theme.space[2], display: 'grid', gridTemplateColumns: 'max-content minmax(0,1fr)', gap: theme.space[3],
  background: theme.color.bgEdge, color: theme.color.inkSub, fontSize: theme.size.sm, lineHeight: 1.5,
  '& span': { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }, '& strong': { color: theme.color.primarySoft },
}));
const Warning = styled(Subtitle)(({ theme }) => ({ borderInlineStart: '2px solid ' + theme.color.warning, '& strong': { color: theme.color.warning } }));
const Notice = styled(Subtitle)(({ theme }) => ({ borderInlineStart: '2px solid ' + theme.color.primary }));
const Playback = styled(Toolbar)(({ theme }) => ({ justifyContent: 'space-between', borderTop: '1px solid ' + theme.color.primaryLineWeak }));
