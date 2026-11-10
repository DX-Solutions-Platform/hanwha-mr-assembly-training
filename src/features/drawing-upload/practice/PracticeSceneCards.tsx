import { useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import styled from 'styled-components';
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3, type Camera, type Group } from 'three';
import type { VectorTuple } from '../../drawing-upload-dev/model/stepTypes';
import { PracticeCardContent } from './PracticeCardContent';
import type { PracticeCardFigures } from './practiceCardFigures';
import { DEFAULT_PRACTICE_CARD_THEME, getPracticeCardThemeStyle } from './practiceCardThemes';
import { clampPracticeCardSize, DEFAULT_PRACTICE_CARD_SIZE, PRACTICE_CARD_IMAGE_SHARE, PRACTICE_STAGE_CARD_LIMIT, type PracticeCardGeometry,
  type PracticeCardSize, type PracticeSceneCard, type PracticeStageCards } from './practiceTrayLayout';

export type PracticeCardControls = { add: () => void };
export type PracticeCardSettings = {
  key: string;
  cards: PracticeStageCards;
  controls: Ref<PracticeCardControls>;
  figures: PracticeCardFigures;
  edit: (id: string | null, card: PracticeSceneCard) => void;
  adjust: (id: string, geometry: PracticeCardGeometry) => Promise<boolean>;
};

const arrowOffsets: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

function pointOnPlane(camera: Camera, x: number, y: number, plane: Plane) {
  const ray = new Raycaster();
  ray.setFromCamera(new Vector2(x, y), camera);
  return ray.ray.intersectPlane(plane, new Vector3());
}

function facingPlane(camera: Camera, point: Vector3) {
  return new Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()), point);
}

function getDepthView(camera: Camera, position: Vector3) {
  if (!(camera instanceof PerspectiveCamera)) return null;
  camera.updateMatrixWorld();
  const distance = -position.clone().applyMatrix4(camera.matrixWorldInverse).z;
  if (distance <= camera.near) return null;
  return {
    eye: camera.getWorldPosition(new Vector3()), origin: position.clone(), distance,
    min: Math.min(distance, Math.max(0.12, camera.near * 2)),
    max: Math.max(distance, Math.min(32, camera.far * 0.85)),
  };
}

export function PracticeSceneCards({ settings, anchor, onDragChange }: {
  settings: PracticeCardSettings; anchor: VectorTuple; onDragChange: (active: boolean) => void;
}) {
  const { camera, controls } = useThree();
  const entries = Object.entries(settings.cards);
  useImperativeHandle(settings.controls, () => ({
    add() {
      if (entries.length >= PRACTICE_STAGE_CARD_LIMIT) return;
      camera.updateMatrixWorld();
      const target = (controls as { target?: Vector3 } | null)?.target ?? new Vector3(...anchor);
      const plane = facingPlane(camera, target);
      const column = entries.length % 2, row = Math.floor(entries.length / 2) % 3;
      const position = pointOnPlane(camera, -0.55 + column * 0.9, 0.52 - row * 0.32, plane)?.toArray() ?? anchor;
      settings.edit(null, { layout: 'text', theme: DEFAULT_PRACTICE_CARD_THEME, title: '', text: '', image: null, imageShare: PRACTICE_CARD_IMAGE_SHARE.default,
        position, size: DEFAULT_PRACTICE_CARD_SIZE });
    },
  }));

  return <>{entries.map(([id, card]) =>
    <SceneCard key={id} card={card} figures={settings.figures}
      onEdit={() => settings.edit(id, card)} onAdjust={(geometry) => settings.adjust(id, geometry)} onDragChange={onDragChange} />
  )}</>;
}

type DepthView = NonNullable<ReturnType<typeof getDepthView>>;
type CardDrag = { id: number } & ({ kind: 'move'; plane: Plane; grab: Vector3 }
  | { kind: 'depth'; y: number; sensitivity: number; view: DepthView }
  | { kind: 'resize'; x: number; y: number; start: PracticeCardSize; size: PracticeCardSize });

function SceneCard({ card, figures, onEdit, onAdjust, onDragChange }: {
  card: PracticeSceneCard; figures: PracticeCardFigures; onEdit: () => void;
  onAdjust: (geometry: PracticeCardGeometry) => Promise<boolean>; onDragChange: (active: boolean) => void;
}) {
  const { camera, gl, invalidate } = useThree();
  const group = useRef<Group>(null);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<CardDrag | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [depthReadout, setDepthReadout] = useState<number | null>(null);
  const imageOnly = card.layout === 'image';
  useEffect(() => () => { if (drag.current) onDragChange(false); }, [onDragChange]);

  function pointerOnPlane(event: PointerEvent<HTMLButtonElement>, plane: Plane) {
    const rect = gl.domElement.getBoundingClientRect();
    const x = Math.max(-0.9, Math.min(0.9, 2 * (event.clientX - rect.left) / Math.max(1, rect.width) - 1));
    const y = Math.max(-0.9, Math.min(0.9, 1 - 2 * (event.clientY - rect.top) / Math.max(1, rect.height)));
    return pointOnPlane(camera, x, y, plane);
  }

  function displaySize(size: PracticeCardSize) {
    panel.current?.style.setProperty('width', `${size.width}px`);
    panel.current?.style.setProperty('height', `${size.height}px`);
  }

  function start(event: PointerEvent<HTMLButtonElement>, kind: CardDrag['kind']) {
    if (busy || event.button !== 0 || drag.current || !group.current || !panel.current) return;
    event.stopPropagation();
    if (kind === 'resize') {
      const { width, height } = panel.current.getBoundingClientRect();
      const size = { width, height };
      drag.current = { kind, id: event.pointerId, x: event.clientX, y: event.clientY, start: size, size };
    } else if (kind === 'depth') {
      const view = getDepthView(camera, group.current.position);
      if (!view) return;
      const sensitivity = Math.max(120, gl.domElement.getBoundingClientRect().height / 2);
      drag.current = { kind, id: event.pointerId, y: event.clientY, sensitivity, view };
      setDepthReadout(view.distance);
    } else {
      camera.updateMatrixWorld();
      const plane = facingPlane(camera, group.current.position);
      const point = pointerOnPlane(event, plane);
      if (!point) return;
      drag.current = { kind, id: event.pointerId, plane, grab: point.sub(group.current.position) };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragChange(true);
  }

  function displayDepth(view: DepthView, factor: number) {
    const distance = Math.max(view.min, Math.min(view.max, view.distance * factor));
    group.current?.position.copy(view.eye).lerp(view.origin, distance / view.distance).clampScalar(-256, 256);
    invalidate();
    return distance;
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId || !group.current) return;
    event.stopPropagation();
    if (current.kind === 'resize') {
      current.size = clampPracticeCardSize({ width: current.start.width + 2 * (event.clientX - current.x),
        height: current.start.height + 2 * (event.clientY - current.y) });
      displaySize(current.size);
      return;
    }
    if (current.kind === 'depth') {
      setDepthReadout(displayDepth(current.view, Math.exp((event.clientY - current.y) / current.sensitivity)));
      return;
    }
    const point = pointerOnPlane(event, current.plane);
    if (!point) return;
    const position = point.sub(current.grab);
    const projected = position.clone().project(camera);
    const x = Math.max(-0.85, Math.min(0.85, projected.x)), y = Math.max(-0.85, Math.min(0.85, projected.y));
    const visible = x === projected.x && y === projected.y ? position : pointOnPlane(camera, x, y, current.plane);
    if (!visible) return;
    group.current.position.copy(visible).clampScalar(-256, 256);
    invalidate();
  }

  function restore(geometry: PracticeCardGeometry) {
    if (geometry.size) displaySize(card.size);
    if (geometry.position) group.current?.position.set(...card.position);
    invalidate();
  }

  async function save(geometry: PracticeCardGeometry) {
    setBusy(true);
    setError(false);
    if (!await onAdjust(geometry)) { restore(geometry); setError(true); }
    setBusy(false);
  }

  function end(event: PointerEvent<HTMLButtonElement>, cancelled: boolean) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId || !group.current) return;
    event.stopPropagation();
    if (!cancelled) move(event);
    drag.current = null;
    if (current.kind === 'depth') setDepthReadout(null);
    const geometry = current.kind === 'resize' ? { size: current.size } : { position: group.current.position.toArray() };
    if (cancelled) restore(geometry);
    else if (current.kind === 'resize'
      ? Math.abs(event.clientX - current.x) + Math.abs(event.clientY - current.y) > 1
      : group.current.position.distanceToSquared(new Vector3(...card.position)) > 0.000001) void save(geometry);
    else restore(geometry);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onDragChange(false);
  }

  function nudge(event: KeyboardEvent<HTMLButtonElement>, kind: CardDrag['kind']) {
    const delta = arrowOffsets[event.key];
    if (busy || !delta || !group.current || (kind === 'depth' && !delta[1])) return;
    event.preventDefault();
    event.stopPropagation();
    if (kind === 'resize') {
      const size = clampPracticeCardSize({ width: card.size.width + delta[0] * 12, height: card.size.height - delta[1] * 12 });
      displaySize(size);
      void save({ size });
      return;
    }
    if (kind === 'depth') {
      const view = getDepthView(camera, group.current.position);
      if (!view) return;
      displayDepth(view, Math.exp(-delta[1] * 0.08));
      void save({ position: group.current.position.toArray() });
      return;
    }
    camera.updateMatrixWorld();
    const projected = group.current.position.clone().project(camera);
    const position = pointOnPlane(camera, Math.max(-0.85, Math.min(0.85, projected.x + delta[0] * 0.04)),
      Math.max(-0.85, Math.min(0.85, projected.y + delta[1] * 0.04)), facingPlane(camera, group.current.position));
    if (!position) return;
    position.clampScalar(-256, 256);
    group.current.position.copy(position);
    invalidate();
    void save({ position: position.toArray() });
  }

  const pointerHandlers = {
    onPointerMove: move,
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => end(event, false),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => end(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => end(event, true),
  };
  return <group ref={group} position={card.position}>
    <Html center zIndexRange={[4, 1]} style={{ pointerEvents: 'none' }}>
      <Card ref={panel} style={{ ...getPracticeCardThemeStyle(card.theme), ...card.size }} $imageOnly={imageOnly} role="note" aria-label="3D 설명 카드"
        onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
        <CardHeader $overlay={imageOnly}>
          <MoveHandle type="button" title="드래그해 카드 위치 이동" aria-label="카드 위치 이동" disabled={busy}
            onPointerDown={(event) => start(event, 'move')} onKeyDown={(event) => nudge(event, 'move')} {...pointerHandlers}>
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 2v16M2 10h16M7 5l3-3 3 3M7 15l3 3 3-3M5 7l-3 3 3 3m10-6 3 3-3 3" />
            </svg>
          </MoveHandle>
          <CardActions>
            <DepthHandle type="button" title="위로 끌면 가까이, 아래로 끌면 멀리" aria-label="카드 깊이 조절" disabled={busy}
              onPointerDown={(event) => start(event, 'depth')} onKeyDown={(event) => nudge(event, 'depth')} {...pointerHandlers}>
              {depthReadout === null ? '깊이' : `깊이 ${depthReadout.toFixed(1)}`}
            </DepthHandle>
            <CardButton type="button" disabled={busy} onClick={onEdit}>편집</CardButton>
          </CardActions>
        </CardHeader>
        <PracticeCardContent card={card} figures={figures} />
        {error && <CardError $overlay={imageOnly} role="alert">변경 사항을 저장하지 못했습니다.</CardError>}
        <ResizeHandle type="button" title="드래그해 카드 크기 조절" aria-label="카드 크기 조절" disabled={busy}
          onPointerDown={(event) => start(event, 'resize')} onKeyDown={(event) => nudge(event, 'resize')} {...pointerHandlers}>↘</ResizeHandle>
      </Card>
    </Html>
  </group>;
}

const Card = styled.div<{ $imageOnly: boolean }>(({ $imageOnly }) => ({
  position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 'calc(100vw - 24px)', maxHeight: '68dvh',
  boxSizing: 'border-box', padding: $imageOnly ? 0 : '8px 10px 16px', overflow: $imageOnly ? 'hidden' : undefined, color: 'var(--card-text)',
  background: 'var(--card-surface)', border: '1px solid var(--card-edge)', borderInlineStart: '3px solid var(--card-accent)',
  borderRadius: 6, backdropFilter: 'blur(5px)', boxShadow: '0 6px 20px #0007', pointerEvents: 'none',
  fontSize: 13, lineHeight: 1.45, overflowWrap: 'anywhere',
}));
const CardHeader = styled.div<{ $overlay: boolean }>(({ $overlay }) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
  ...($overlay ? { position: 'absolute', top: 5, left: 6, right: 6, zIndex: 1,
    '& button': { background: 'var(--card-control)', borderColor: 'var(--card-edge)' } } : {}),
}));
const CardActions = styled.div({ display: 'flex', alignItems: 'center', gap: 5 });
const CardButton = styled.button({
  pointerEvents: 'auto', cursor: 'pointer', color: 'var(--card-text)', background: 'var(--card-control)', border: '1px solid var(--card-edge)',
  borderRadius: 4, padding: '2px 6px', font: 'inherit', whiteSpace: 'nowrap',
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' }, '&:focus-visible': { outline: '2px solid var(--card-accent)' },
});
const MoveHandle = styled(CardButton)({
  display: 'grid', placeItems: 'center', width: 26, height: 24, padding: 0,
  cursor: 'grab', touchAction: 'none', color: 'var(--card-title)',
  '&:active': { cursor: 'grabbing' },
});
const DepthHandle = styled(CardButton)({ cursor: 'ns-resize', touchAction: 'none', fontVariantNumeric: 'tabular-nums' });
const ResizeHandle = styled(CardButton)({
  position: 'absolute', bottom: 2, right: 2, zIndex: 1, width: 25, height: 23, padding: 0, touchAction: 'none',
  color: 'var(--card-title)', cursor: 'nwse-resize', fontSize: 16, lineHeight: 1,
});
const CardError = styled.span<{ $overlay: boolean }>(({ $overlay }) => ({
  color: 'var(--card-error)', fontSize: 12, paddingRight: 22,
  ...($overlay ? { position: 'absolute', bottom: 6, left: 6, right: 30, padding: 4, background: 'var(--card-control)' } : {}),
}));
