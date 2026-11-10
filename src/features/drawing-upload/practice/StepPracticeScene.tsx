import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Environment, Line, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, CanvasTexture, DataTexture, DataUtils, DoubleSide, EdgesGeometry, EquirectangularReflectionMapping, HalfFloatType, PerspectiveCamera, Plane, Quaternion, Raycaster, RGBAFormat, Vector2, Vector3, type Group, type Object3D } from 'three';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { StepCamera } from '@/features/drawing-upload-dev/model/StepCamera';
import { createStepStructureEdges, showStepStructureEdges } from '@/features/drawing-upload-dev/model/stepStructureEdges';
import { modelScale } from '@/features/drawing-upload-dev/model/stepModel';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepBounds, StepMesh, StepModel, StepPick, VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';
import { ATTACHMENT_POINT_TOLERANCE } from './stepPracticeConfig';
import { clampPracticeTraySlot, getPracticeFasteningFocus, getPracticePartSurface, getPracticeTrayHomeX, getPracticeTrayPlacementIssue, getPracticeTraySurface, getPracticeWorkbench, getSeatingClearance, layoutPracticeTray, type TrayPlacementIssue } from './stepPracticeMotion';
import { getPracticeGroupBounds } from './stepPracticeSequence';
import { PracticeFasteningTool } from './PracticeFasteningTool';
import { getPracticeToolKind, getPracticeToolShape, getPracticeToolView } from './practiceToolGeometry';
import { getPracticePartCorners, getPracticePickupPose, isPracticePartVisible } from './practicePartPickup';
import { PracticeSceneCards, type PracticeCardSettings } from './PracticeSceneCards';
import { trayTravel, type PracticeTrayLayout, type TrayPoint } from './practiceTrayLayout';

export type PracticePhase = 'place' | 'insert' | 'seat' | 'tool' | 'turn' | 'done';
export type PracticeTrayItem = { index: number; key: string; parts: StepAssemblyPart[] };
type TrayLayout = ReturnType<typeof layoutPracticeTray>;
type TrayEdit = {
  moveBox: (point: TrayPoint) => void;
  movePart: (key: string, result: TrayPoint | TrayPlacementIssue) => void;
  onPlacementIssue: (issue: TrayPlacementIssue | null) => void;
};
const noRaycast = () => {};
const benchView: VectorTuple = [0, -1, 0.9];
const assemblyCenter: VectorTuple = [0, 0, 0];
const defaultTrayOffset: TrayPoint = [0, 0];
const benchCamera = { fov: 37, position: [2.6, -6.2, 4.4] as VectorTuple, up: [0, 0, 1] as VectorTuple, near: 0.001, far: 100 };

export function StepPracticeScene({ model, mountedParts, wireParts, wireGuide, trayItems, stageIndex, isSubassembly, preparing, positions, trayOffset = defaultTrayOffset, movableTray, wideTrayView, trayEdit, attachment, fastening, seating, phase, turn, pickupRequest, cardSettings, onSourceVisibilityChange, onDrop, onSeated }: {
  model: StepModel; mountedParts: StepAssemblyPart[]; wireParts: StepAssemblyPart[];
  wireGuide: boolean;
  trayItems: PracticeTrayItem[]; stageIndex: number; isSubassembly: boolean; preparing: boolean; positions: PracticeTrayLayout;
  trayOffset?: TrayPoint; movableTray: boolean; wideTrayView: boolean; trayEdit?: TrayEdit;
  attachment: { parts: StepAssemblyPart[]; pick: StepPick; support?: StepPick } | null;
  fastening: { part: StepAssemblyPart; head: StepPick; tool: string } | null;
  seating: { parts: StepAssemblyPart[]; pick: StepPick } | null;
  phase: PracticePhase; turn: { progress: number; rotation: number; excess: number }; onDrop: (matched: boolean) => void;
  pickupRequest?: number; onSourceVisibilityChange: (stageIndex: number, visible: boolean) => void;
  cardSettings?: PracticeCardSettings;
  onSeated: () => void;
}) {
  const [isDragging, setDragging] = useState(false);
  const [isMovingCard, setMovingCard] = useState(false);
  const scale = modelScale(model.bounds);
  const head = fastening?.head;
  const fasteningBounds = fastening?.part.bounds;
  const boltRotation = useMemo(() => head && new Quaternion().setFromAxisAngle(new Vector3(...head.normal).normalize(), -turn.rotation), [head, turn.rotation]);
  const partSize = fasteningBounds ? Math.max(...fasteningBounds.max.map((value, axis) => (value - fasteningBounds.min[axis]) * scale), 0.025) : 0;
  const focusHead = phase === 'seat' || phase === 'tool' || phase === 'turn' ? head : undefined;
  const framingTool = phase === 'tool' || phase === 'turn';
  const toolKind = fastening ? getPracticeToolKind(fastening.tool, fastening.part.name) : undefined;
  const toolShape = useMemo(() => head && toolKind ? getPracticeToolShape(toolKind, head, partSize) : undefined, [head, toolKind, partSize]);
  const toolView = useMemo(() => framingTool && head && toolShape ? getPracticeToolView(model.bounds, head, scale, partSize, toolShape, benchView) : undefined,
    [framingTool, head, toolShape, model.bounds, scale, partSize]);
  const fasteningFocus = useMemo(() => focusHead && getPracticeFasteningFocus(model.bounds, focusHead.point, scale, partSize),
    [focusHead, model.bounds, scale, partSize]);
  const floor = (model.bounds.min[2] - model.bounds.max[2]) / 2 * scale - 0.045;
  const workParts = useMemo(() => trayItems.flatMap(({ parts }) => parts), [trayItems]);
  const workBounds = useMemo(() => isSubassembly ? getPracticeGroupBounds(workParts) : model.bounds, [isSubassembly, model.bounds, workParts]);
  const workbench = useMemo(() => getPracticeWorkbench(model.bounds, workBounds, scale), [model.bounds, workBounds, scale]);
  const trayHomeX = getPracticeTrayHomeX(workbench);
  const tray = useMemo(() => layoutPracticeTray(model.bounds, trayItems.map(({ parts }) => getPracticeGroupBounds(parts)), scale,
    trayItems.map(({ key }) => positions[key]), { homeX: trayHomeX, movable: movableTray }),
  [model.bounds, trayItems, scale, positions, trayHomeX, movableTray]);
  const modelX = (model.bounds.min[0] + model.bounds.max[0]) / 2;
  const modelY = (model.bounds.min[1] + model.bounds.max[1]) / 2;
  const activeSlotIndex = trayItems.findIndex(({ index }) => index === stageIndex);
  const activeSlot = tray.slots[activeSlotIndex];
  const activeKey = `${stageIndex}-${trayItems[activeSlotIndex]?.key}`;
  const activeOffset = useMemo<VectorTuple | undefined>(() => activeSlot && [
    activeSlot.offset[0] + trayHomeX + trayOffset[0], activeSlot.offset[1] + trayOffset[1], activeSlot.offset[2],
  ], [activeSlot, trayHomeX, trayOffset]);
  const benchTarget = useMemo<VectorTuple>(() => isSubassembly
    ? workBounds.min.map((value, axis) => (value + workBounds.max[axis] - model.bounds.min[axis] - model.bounds.max[axis]) * scale / 2) as VectorTuple
    : assemblyCenter, [isSubassembly, workBounds, model.bounds, scale]);
  const traySurface = useMemo(() => getPracticeTraySurface(tray.slots), [tray.slots]);
  const trayX = traySurface.x + trayHomeX + trayOffset[0], trayY = traySurface.y + trayOffset[1];
  const left = Math.min(workbench.x - workbench.width / 2, trayX - traySurface.width / 2);
  const right = Math.max(workbench.x + workbench.width / 2, trayX + traySurface.width / 2);
  const front = Math.min(workbench.y - workbench.depth / 2, trayY - traySurface.depth / 2);
  const back = Math.max(workbench.y + workbench.depth / 2, trayY + traySurface.depth / 2);
  const benchBounds = useMemo<StepBounds>(() => ({
    min: [modelX + (left - 0.32) / scale, modelY + (front - 0.32) / scale, model.bounds.min[2] - 0.05 / scale],
    max: [modelX + (right + 0.32) / scale, modelY + (back + 0.32) / scale, model.bounds.max[2]],
  }), [model.bounds, modelX, modelY, left, right, front, back, scale]);

  return (
    <SceneCanvas frameloop="demand" camera={benchCamera}>
      <PracticeLighting />
      <OrbitControls makeDefault enableDamping enabled={!focusHead && phase !== 'seat' && !isDragging && !isMovingCard} />
      <StepCamera model={model} command={0} focusBounds={toolView?.bounds ?? fasteningFocus ?? (wideTrayView ? benchBounds : workBounds)}
        viewDirection={toolView?.direction ?? benchView} viewTarget={focusHead?.point ?? (wideTrayView ? undefined : benchTarget)}
        viewNormal={toolView ? undefined : focusHead?.normal} fixedView={!!focusHead} />
      <gridHelper args={[tray.map.depth, Math.round(tray.map.depth * 3), '#67402a', '#302a27']} position={[tray.map.x, 0, floor]}
        rotation={[Math.PI / 2, 0, 0]} scale={[tray.map.width / tray.map.depth, 1, 1]} />
      <mesh position={[workbench.x, workbench.y, floor - 0.002]} raycast={noRaycast}>
        <planeGeometry args={[workbench.width, workbench.depth]} /><meshBasicMaterial color="#22252a" />
      </mesh>
      <ZoneOutline {...workbench} floor={floor} color="#bf804e" />
      {phase !== 'done' && <PreparationBox model={model} items={trayItems} stageIndex={stageIndex} showActivePart={preparing || !!trayEdit}
        activeSlot={activeSlot && (phase === 'place' || phase === 'insert') ? activeSlot : undefined}
        tray={tray} floor={floor} homeX={trayHomeX} offset={trayOffset} edit={trayEdit} dragging={isDragging} onDragChange={setDragging} />}
      {preparing && workParts.map((part) => <PartMeshes key={part.number} model={model} part={part} reference />)}
      <group name="installed-assembly">
        {mountedParts.map((part, index) => <PartMeshes key={part.number} model={model} part={part} installed={index > 0} />)}
        {seating && <SeatingParts key={stageIndex} model={model} parts={seating.parts} pick={seating.pick}
          clearance={getSeatingClearance(getPracticeGroupBounds(seating.parts), scale)} onSeated={onSeated} />}
        {(phase === 'tool' || phase === 'turn') && fastening && head && boltRotation && <group position={head.point} quaternion={boltRotation}>
          <group position={[-head.point[0], -head.point[1], -head.point[2]]}>
            <PartMeshes model={model} part={fastening.part} wirePreview={wireGuide} />
          </group>
        </group>}
      </group>
      {!preparing && !seating && !trayEdit && wireParts.map((part) => <PartMeshes key={part.number} model={model} part={part} wirePreview />)}
      {attachment && activeOffset && !trayEdit && (
        <MovingPart key={activeKey} model={model} parts={attachment.parts} target={attachment.pick}
          support={attachment.support} offset={activeOffset} tolerance={ATTACHMENT_POINT_TOLERANCE}
          pickupRequest={pickupRequest} onSourceVisibilityChange={(visible) => onSourceVisibilityChange(stageIndex, visible)}
          onDrop={onDrop} onDragChange={setDragging} wireGuide={wireGuide} dragging={isDragging} />
      )}
      {phase === 'insert' && fastening && head && activeOffset && !trayEdit && <MovingPart key={activeKey} model={model} parts={[fastening.part]} target={head}
        pickupRequest={pickupRequest} onSourceVisibilityChange={(visible) => onSourceVisibilityChange(stageIndex, visible)}
        offset={activeOffset} tolerance={Math.max(partSize * 0.6, 0.04)} onDrop={onDrop} onDragChange={setDragging} wireGuide={wireGuide} dragging={isDragging} />}
      {phase === 'tool' && head && <ContactArrow pick={head} length={Math.max(partSize * 0.55, 0.025)} />}
      {phase === 'turn' && head && toolKind && toolShape && <PracticeFasteningTool pick={head} kind={toolKind} shape={toolShape} turn={turn} />}
      {cardSettings && <PracticeSceneCards key={cardSettings.key} settings={cardSettings}
        anchor={focusHead?.point ?? benchTarget} onDragChange={setMovingCard} />}
    </SceneCanvas>
  );
}

function usePracticeGrabCursor(hovered: boolean, dragging: boolean) {
  const canvas = useThree((state) => state.gl.domElement);
  useLayoutEffect(() => {
    if (!hovered && !dragging) return;
    const previous = canvas.style.getPropertyValue('cursor');
    const priority = canvas.style.getPropertyPriority('cursor');
    canvas.style.setProperty('cursor', dragging ? 'grabbing' : 'grab');
    return () => { canvas.style.setProperty('cursor', previous, priority); };
  }, [canvas, hovered, dragging]);
}

export const StepPracticeOverview = memo(function StepPracticeOverview({ model, parts }: { model: StepModel; parts: StepAssemblyPart[] }) {
  return <SceneCanvas frameloop="demand" camera={{ fov: 35, up: [0, 0, 1] }}>
    <PracticeLighting />
    <StepCamera model={model} command={0} focusBounds={null} />
    {parts.map((part) => <PartMeshes key={part.number} model={model} part={part} />)}
  </SceneCanvas>;
});

const PracticeLighting = memo(function PracticeLighting() {
  const reflectionMap = useMemo(() => {
    const width = 64, height = 32, pixels = new Uint16Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width, v = (y + 0.5) / height;
      const key = 4.2 * Math.exp(-(((u - 0.23) / 0.14) ** 4 + ((v - 0.73) / 0.12) ** 4));
      const fill = 1.7 * Math.exp(-(((u - 0.73) / 0.10) ** 4 + ((v - 0.62) / 0.17) ** 4));
      const offset = (y * width + x) * 4;
      pixels[offset] = DataUtils.toHalfFloat(0.12 + key + fill * 0.85);
      pixels[offset + 1] = DataUtils.toHalfFloat(0.13 + key * 0.95 + fill * 0.93);
      pixels[offset + 2] = DataUtils.toHalfFloat(0.15 + key * 0.89 + fill);
      pixels[offset + 3] = DataUtils.toHalfFloat(1);
    }
    const environment = new DataTexture(pixels, width, height, RGBAFormat, HalfFloatType);
    environment.mapping = EquirectangularReflectionMapping;
    environment.needsUpdate = true;
    return environment;
  }, []);
  useEffect(() => () => reflectionMap.dispose(), [reflectionMap]);
  return <>
    <Environment map={reflectionMap} />
    <ambientLight intensity={0.85} />
    <directionalLight position={[3, -4, 6]} intensity={2.25} />
    <directionalLight position={[-4, 3, 2]} color="#b5c8dc" intensity={0.9} />
  </>;
});

function PreparationBox({ model, items, stageIndex, showActivePart, activeSlot, tray, floor, homeX, offset, edit, dragging, onDragChange }: {
  model: StepModel; items: PracticeTrayItem[]; stageIndex: number; showActivePart: boolean; activeSlot?: TrayLayout['slots'][number];
  tray: TrayLayout; floor: number; homeX: number; offset: TrayPoint; edit?: TrayEdit; dragging: boolean; onDragChange: (dragging: boolean) => void;
}) {
  usePracticeGrabCursor(false, !!edit && dragging);
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [preview, setPreview] = useState<{ index: number; point: TrayPoint; issue: TrayPlacementIssue | null } | null>(null);
  const surface = useMemo(() => getPracticeTraySurface(tray.slots, preview?.issue ? null : preview), [tray.slots, preview]);
  const hit = useMemo(() => new Vector3(), []);
  const drag = useRef<{
    id: number; target: Object3D; origin: Vector3; plane: Plane; index?: number;
    grab: TrayPoint; start: TrayPoint; position: TrayPoint; issue: TrayPlacementIssue | null; cleanup: () => void;
  } | null>(null);

  useEffect(() => () => {
    if (!drag.current) return;
    drag.current.cleanup();
    onDragChange(false);
  }, [onDragChange]);

  function down(event: ThreeEvent<PointerEvent>, index?: number) {
    const target = index === undefined ? group.current : event.eventObject;
    if (!edit || event.button !== 0 || drag.current || !target) return;
    const plane = new Plane(new Vector3(0, 0, 1), -event.point.z);
    if (!event.ray.intersectPlane(plane, hit)) return;
    event.stopPropagation();
    const start: TrayPoint = index === undefined ? offset : [tray.slots[index].x, tray.slots[index].y];
    const captureTarget = event.nativeEvent.target as Element;
    captureTarget.addEventListener('pointercancel', cancel);
    captureTarget.addEventListener('lostpointercapture', cancel);
    drag.current = { id: event.pointerId, target, origin: target.position.clone(), plane, index,
      grab: [hit.x - start[0], hit.y - start[1]], start, position: start, issue: null, cleanup: () => {
        captureTarget.removeEventListener('pointercancel', cancel);
        captureTarget.removeEventListener('lostpointercapture', cancel);
      } };
    onDragChange(true);
    (event.target as Element).setPointerCapture(event.pointerId);
  }

  function cancel(event: Event) {
    const current = drag.current;
    if (!current || current.id !== (event as PointerEvent).pointerId) return;
    current.target.position.copy(current.origin);
    endDrag(current);
  }

  function endDrag(current: NonNullable<typeof drag.current>) {
    drag.current = null;
    current.cleanup();
    setPreview(null);
    edit?.onPlacementIssue(null);
    onDragChange(false);
    invalidate();
  }

  function move(event: ThreeEvent<PointerEvent>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    event.stopPropagation();
    if (!event.ray.intersectPlane(current.plane, hit)) return;
    const desired: TrayPoint = [hit.x - current.grab[0], hit.y - current.grab[1]];
    const issue = current.index === undefined ? null : getPracticeTrayPlacementIssue(tray, current.index, desired);
    const [x, y] = current.index === undefined ? [
      Math.max(trayTravel.minX, Math.min(trayTravel.maxX, desired[0])),
      Math.max(-trayTravel.maxY, Math.min(trayTravel.maxY, desired[1])),
    ] : clampPracticeTraySlot(tray, current.index, desired);
    if (x === current.position[0] && y === current.position[1] && issue === current.issue) return;
    if (issue !== current.issue) edit?.onPlacementIssue(issue);
    current.issue = issue;
    current.position = [x, y];
    current.target.position.set(current.origin.x + x - current.start[0], current.origin.y + y - current.start[1], current.origin.z);
    if (current.index !== undefined) setPreview({ index: current.index, point: current.position, issue });
    invalidate();
  }

  function finish(event: ThreeEvent<PointerEvent>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    event.stopPropagation();
    move(event);
    const moved = Math.hypot(current.position[0] - current.start[0], current.position[1] - current.start[1]) > 0.001;
    if (edit && current.index !== undefined && current.issue) {
      current.target.position.copy(current.origin);
      edit.movePart(items[current.index].key, current.issue);
    } else if (moved && edit) {
      if (current.index === undefined) edit.moveBox(current.position);
      else edit.movePart(items[current.index].key, current.position);
    } else current.target.position.copy(current.origin);
    endDrag(current);
    if ((event.target as Element).hasPointerCapture(event.pointerId)) (event.target as Element).releasePointerCapture(event.pointerId);
  }

  // The object capturing the pointer also handles moves and releases beyond its hit area.
  const handlers = edit ? { onPointerMove: move, onPointerUp: finish } : {};
  const invalidSlot = preview?.issue ? tray.slots[preview.index] : null;
  return <group ref={group} position={[homeX + offset[0], offset[1], 0]}>
    <group position={[surface.x, surface.y, 0]} scale={[surface.width, surface.depth, 1]}>
      <ZoneOutline x={0} y={0} width={1} depth={1} floor={floor} color={edit ? '#78bce8' : '#7f9cb3'} />
      <mesh position={[0, 0, floor - 0.002]} raycast={noRaycast}>
        <planeGeometry /><meshBasicMaterial color="#1e2931" />
      </mesh>
    </group>
    {preview && invalidSlot && <>
      <ZoneOutline x={preview.point[0]} y={preview.point[1]} width={invalidSlot.width} depth={invalidSlot.depth}
        floor={floor + 0.005} color="#ff5f66" />
      <mesh position={[...preview.point, floor + 0.006]} raycast={noRaycast}>
        <planeGeometry args={[invalidSlot.width, invalidSlot.depth]} />
        <meshBasicMaterial color="#ff5f66" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </>}
    {edit && <group position={[surface.x, surface.y - surface.depth / 2 + 0.12, floor]}>
      <mesh position={[0, 0, 0.014]} onPointerDown={(event) => down(event)} {...handlers}>
        <boxGeometry args={[Math.min(0.56, surface.width), 0.19, 0.028]} /><meshBasicMaterial color="#76bae6" toneMapped={false} />
      </mesh>
      {[-0.045, 0, 0.045].map((y) => <mesh key={y} position={[0, y, 0.029]} raycast={noRaycast}>
        <planeGeometry args={[0.25, 0.012]} /><meshBasicMaterial color="#244558" toneMapped={false} />
      </mesh>)}
    </group>}
    {activeSlot && !showActivePart && <ZoneOutline {...activeSlot} floor={floor} color="#ff973d" />}
    {items.map((item, index) => {
      if (item.index < stageIndex || (!showActivePart && item.index === stageIndex)) return null;
      const slot = tray.slots[index];
      return <group key={item.key} position={slot.offset} onPointerDown={edit ? (event) => down(event, index) : undefined} {...handlers}>
        {item.parts.map((part) => <PartMeshes key={part.number} model={model} part={part} />)}
        {edit && <mesh visible={false} position={[slot.x - slot.offset[0], slot.y - slot.offset[1], floor + 0.025 + slot.height / 2 - slot.offset[2]]}>
          <boxGeometry args={[slot.width, slot.depth, slot.height]} />
        </mesh>}
      </group>;
    })}
  </group>;
}

function ZoneOutline({ x, y, width, depth, floor, color }: { x: number; y: number; width: number; depth: number; floor: number; color: string }) {
  const points = useMemo<VectorTuple[]>(() => {
    const left = x - width / 2, right = x + width / 2, bottom = y - depth / 2, top = y + depth / 2;
    const z = floor + 0.003;
    return [[left, bottom, z], [right, bottom, z], [right, top, z], [left, top, z], [left, bottom, z]];
  }, [x, y, width, depth, floor]);
  return <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.76} raycast={noRaycast} />;
}

function PickupHighlight({ corners }: { corners: readonly Vector3[] }) {
  const frame = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const min = corners[0], max = corners[corners.length - 1];
  const center: VectorTuple = [(min.x + max.x) / 2, (min.y + max.y) / 2, min.z + 0.001];
  const pad = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) * 0.1;
  const x = (max.x - min.x) / 2 + pad, y = (max.y - min.y) / 2 + pad;
  const points = useMemo<VectorTuple[]>(() => [-1, 1].flatMap((sx) => [-1, 1].flatMap((sy) => [
    [sx * x * 0.65, sy * y, 0], [sx * x, sy * y, 0],
    [sx * x, sy * y, 0], [sx * x, sy * y * 0.65, 0],
  ] as VectorTuple[])), [x, y]);

  useFrame(({ clock }) => {
    if (!frame.current || reducedMotion) return;
    const now = clock.elapsedTime;
    start.current ??= now;
    const progress = Math.min(1, (now - start.current) / 0.45);
    const pulse = 1 + 0.22 * (1 - progress) ** 2;
    frame.current.scale.set(pulse, pulse, 1);
    if (progress < 1) invalidate();
  });

  return <group position={center} ref={frame}>
    <mesh raycast={noRaycast}>
      <planeGeometry args={[x * 2, y * 2]} />
      <meshBasicMaterial color="#ffad55" transparent opacity={0.13} depthWrite={false} toneMapped={false} />
    </mesh>
    <Line segments points={points} color="#ffc370" lineWidth={3} transparent opacity={0.95}
      depthTest={false} depthWrite={false} toneMapped={false} raycast={noRaycast} />
  </group>;
}

function ContactArrow({ pick, length }: { pick: StepPick; length: number }) {
  const arrow = useRef<Group>(null);
  const started = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const orientation = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...pick.normal).normalize()), [pick]);
  useFrame(({ clock }) => {
    if (!arrow.current || reducedMotion) return;
    const now = clock.elapsedTime;
    started.current ??= now;
    const elapsed = now - started.current;
    arrow.current.position.z = elapsed < 3.3 ? length * 0.42 * (1 + Math.cos(elapsed * 7)) / 2 : 0;
    if (elapsed < 3.3) invalidate();
  });
  return <group position={pick.point} quaternion={orientation}>
    <group ref={arrow}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length * 0.18]} renderOrder={7} raycast={noRaycast}>
        <coneGeometry args={[length * 0.17, length * 0.36, 12]} />
        <meshBasicMaterial color="#ff973d" depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, length * 0.65]} renderOrder={7} raycast={noRaycast}>
        <cylinderGeometry args={[length * 0.06, length * 0.06, length * 0.62, 10]} />
        <meshBasicMaterial color="#ffbd70" depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  </group>;
}

function SeatingParts({ model, parts, pick, clearance, onSeated }: {
  model: StepModel; parts: StepAssemblyPart[]; pick: StepPick; clearance: number; onSeated: () => void;
}) {
  const body = useRef<Group>(null);
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const offset = useMemo(() => new Vector3(...pick.normal).normalize().multiplyScalar(reducedMotion ? 0 : clearance), [clearance, pick, reducedMotion]);

  useFrame(({ clock }) => {
    if (!body.current || finished.current) return;
    const now = clock.elapsedTime;
    started.current ??= now;
    const elapsed = now - started.current;
    const progress = Math.min(1, Math.max(0, (elapsed - 0.22) / 0.48));
    body.current.position.copy(offset).multiplyScalar(1 - progress * progress * (3 - 2 * progress));
    if (elapsed >= (reducedMotion ? 0.35 : 0.92)) {
      finished.current = true;
      onSeated();
    } else invalidate();
  });

  return <>
    <group ref={body} position={offset}>
      {parts.map((part) => <PartMeshes key={part.number} model={model} part={part} installed />)}
    </group>
    <ContactArrow pick={pick} length={Math.max(0.035, clearance * 0.55)} />
  </>;
}

function AttachmentMark({ point }: { point: VectorTuple }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#ffad54'; ctx.fill();
    ctx.strokeStyle = '#192530'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#192530'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('A', 32, 33);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return <sprite position={point} scale={[0.042, 0.042, 1]} renderOrder={5} raycast={noRaycast}>
    <spriteMaterial map={texture} transparent sizeAttenuation={false} depthTest={false} depthWrite={false} toneMapped={false} />
  </sprite>;
}

function MovingPart({ model, parts, target, support, offset, tolerance, pickupRequest, onSourceVisibilityChange, onDrop, onDragChange, wireGuide, dragging }: {
  model: StepModel; parts: StepAssemblyPart[]; target: StepPick; support?: StepPick; offset: VectorTuple; tolerance: number;
  pickupRequest?: number; onSourceVisibilityChange: (visible: boolean) => void;
  wireGuide: boolean; dragging: boolean;
  onDrop: (matched: boolean) => void; onDragChange: (dragging: boolean) => void;
}) {
  const group = useRef<Group>(null);
  const { camera, invalidate } = useThree();
  const [hovered, setHovered] = useState(false);
  usePracticeGrabCursor(hovered, dragging);
  const raycaster = useMemo(() => new Raycaster(), []);
  const drag = useRef<{ id: number; plane: Plane; grab: Vector2; cleanup: () => void } | null>(null);
  const presented = useRef<ReturnType<typeof getPracticePickupPose> | null>(null);
  const previousVisibility = useRef<boolean | null>(null);
  const corners = useMemo(() => getPracticePartCorners(model.bounds, getPracticeGroupBounds(parts), modelScale(model.bounds)), [model.bounds, parts]);
  const projected = useMemo(() => new Vector3(), []);
  const anchor = useMemo(() => new Vector3(...target.point), [target.point]);
  const destination = support ?? target;
  const destinationPoint = useMemo(() => new Vector3(...destination.point), [destination.point]);
  const expectedOffset = useMemo(() => destinationPoint.clone().sub(anchor), [destinationPoint, anchor]);

  useEffect(() => () => drag.current?.cleanup(), []);
  useLayoutEffect(() => { invalidate(); }, [invalidate, pickupRequest]);
  useFrame(() => {
    if (!group.current || drag.current || !(camera instanceof PerspectiveCamera)) return;
    camera.updateMatrixWorld();
    const visible = isPracticePartVisible(camera, corners, offset, projected);
    if (visible !== previousVisibility.current) {
      previousVisibility.current = visible;
      onSourceVisibilityChange(visible);
    }
    if (pickupRequest !== undefined || presented.current) {
      presented.current = pickupRequest === undefined ? null : getPracticePickupPose(camera, corners, destinationPoint);
      restorePosition();
    }
  });

  function down(event: ThreeEvent<PointerEvent>) {
    if (event.button !== 0 || drag.current || !group.current) return;
    event.stopPropagation();
    const normal = camera.getWorldDirection(new Vector3());
    const source = group.current.localToWorld(anchor.clone()).project(camera);
    const grab = event.pointer.clone().sub(new Vector2(source.x, source.y));
    const captureTarget = event.nativeEvent.target as Element;
    captureTarget.addEventListener('pointercancel', cancel);
    captureTarget.addEventListener('lostpointercapture', cancel);
    drag.current = { id: event.pointerId, plane: new Plane().setFromNormalAndCoplanarPoint(normal, destinationPoint), grab, cleanup: () => {
      captureTarget.removeEventListener('pointercancel', cancel);
      captureTarget.removeEventListener('lostpointercapture', cancel);
    } };
    onDragChange(true);
    (event.target as Element).setPointerCapture(event.pointerId);
  }

  function move(event: ThreeEvent<PointerEvent>) {
    const current = drag.current;
    if (current?.id !== event.pointerId || !group.current) return;
    event.stopPropagation();
    raycaster.setFromCamera(event.pointer.clone().sub(current.grab), camera);
    const hit = raycaster.ray.intersectPlane(current.plane, new Vector3());
    if (!hit) return;
    group.current.scale.setScalar(1);
    group.current.position.copy(hit.sub(anchor));
    invalidate();
  }

  function endDrag() {
    drag.current?.cleanup();
    drag.current = null;
    setHovered(false);
    onDragChange(false);
    invalidate();
  }

  function restorePosition() {
    group.current?.scale.setScalar(presented.current?.scale ?? 1);
    group.current?.position.set(...(presented.current?.offset ?? offset));
  }

  function cancel(event: Event) {
    if (drag.current?.id !== (event as PointerEvent).pointerId) return;
    restorePosition();
    endDrag();
  }

  function finish(event: ThreeEvent<PointerEvent>) {
    if (drag.current?.id !== event.pointerId || !group.current) return;
    event.stopPropagation();
    move(event);
    const matched = group.current.position.distanceTo(expectedOffset) <= tolerance;
    if (!matched) restorePosition();
    endDrag();
    if ((event.target as Element).hasPointerCapture(event.pointerId)) (event.target as Element).releasePointerCapture(event.pointerId);
    onDrop(matched);
  }

  return <>
    {parts.map((part) => <PartMeshes key={part.number} model={model} part={part} ghost wirePreview={wireGuide} />)}
    <ContactArrow key={dragging ? 'dragging' : 'waiting'} pick={destination} length={Math.max(0.095, tolerance)} />
    <group ref={group} position={offset} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
      onPointerDown={down} onPointerMove={move} onPointerUp={finish}>
      {parts.map((part) => <PartMeshes key={part.number} model={model} part={part} active />)}
      {pickupRequest !== undefined && !dragging && <PickupHighlight key={pickupRequest} corners={corners} />}
      {support && <AttachmentMark point={target.point} />}
    </group>
  </>;
}

function PartMeshes({ model, part, ghost, active, installed, wirePreview, reference }: {
  model: StepModel; part: StepAssemblyPart; ghost?: boolean; active?: boolean; installed?: boolean; wirePreview?: boolean; reference?: boolean;
}) {
  const shapes = useMemo(() => {
    const ids = new Set(part.shapeIds);
    return model.manifest.shapeList.filter((shape) => ids.has(shape.id));
  }, [model.manifest.shapeList, part.shapeIds]);
  const scale = modelScale(model.bounds);
  const center = model.bounds.max.map((value, axis) => (value + model.bounds.min[axis]) / 2);
  const surface = getPracticePartSurface(part.number, part.name);
  return <>{shapes.map((shape) => <Body key={shape.id} body={model.meshList[shape.meshIndex]} center={center} scale={scale}
    surface={surface} ghost={ghost} active={active} installed={installed} wirePreview={wirePreview} reference={reference} />)}</>;
}

function Body({ body, center, scale, surface, ghost, active, installed, wirePreview, reference }: {
  body: StepMesh; center: number[]; scale: number; ghost?: boolean; active?: boolean; installed?: boolean; wirePreview?: boolean; reference?: boolean;
  surface: ReturnType<typeof getPracticePartSurface>;
}) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry().setAttribute('position', new BufferAttribute(body.position, 3))
      .setIndex(new BufferAttribute(body.index, 1));
    if (body.normal) result.setAttribute('normal', new BufferAttribute(body.normal, 3));
    else result.computeVertexNormals();
    return result;
  }, [body]);
  const edges = useMemo(() => wirePreview ? createStepStructureEdges(geometry)
    : ghost || installed ? new EdgesGeometry(geometry, 22) : null, [geometry, ghost, installed, wirePreview]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => edges?.dispose(), [edges]);
  const position = body.origin.map((value, axis) => (value - center[axis]) * scale) as VectorTuple;
  if (ghost || wirePreview) return <lineSegments geometry={edges ?? undefined} position={position} scale={scale} raycast={noRaycast}>
    <lineBasicMaterial key={wirePreview ? 'structure' : 'ghost'} color={ghost ? '#ff973d' : '#e2eef5'} transparent
      opacity={ghost ? 0.82 : 0.48} depthTest={!!ghost} depthWrite={false} toneMapped={false}
      {...(wirePreview ? { onBeforeCompile: showStepStructureEdges } : {})} />
  </lineSegments>;
  return <>
    <mesh geometry={geometry} position={position} scale={scale} {...(active ? {} : { raycast: noRaycast })}>
      <meshStandardMaterial {...surface} side={DoubleSide}
        transparent={!!reference} opacity={reference ? 0.32 : 1} depthWrite={!reference}
        polygonOffset={installed} polygonOffsetFactor={1} polygonOffsetUnits={1} />
    </mesh>
    {edges && <lineSegments geometry={edges} position={position} scale={scale} raycast={noRaycast} renderOrder={2}>
      <lineBasicMaterial color="#d08b52" transparent opacity={0.52} depthWrite={false} />
    </lineSegments>}
  </>;
}
