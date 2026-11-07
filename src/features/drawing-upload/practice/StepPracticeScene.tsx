import { useEffect, useMemo, useRef, useState } from 'react';
import { Line, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DoubleSide, EdgesGeometry, Plane, Quaternion, Raycaster, Vector2, Vector3, type Group } from 'three';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { StepCamera } from '@/features/drawing-upload-dev/model/StepCamera';
import { modelScale } from '@/features/drawing-upload-dev/model/stepModel';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepMesh, StepModel, StepPick, VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';
import { getPracticeFocus, type PracticeConfig } from './stepPracticeConfig';
import { getPreparationOffset, getPracticeResistance, PREPARATION_CENTER } from './stepPracticeMotion';

export type PracticePhase = 'place' | 'insert' | 'tool' | 'turn' | 'done';
const noRaycast = () => {};

export function StepPracticeScene({ model, placement, fastening, config, phase, turn, onDrop }: {
  model: StepModel; placement: StepAssemblyPart; fastening: StepAssemblyPart; config: PracticeConfig;
  phase: PracticePhase; turn: { progress: number; rotation: number; excess: number }; onDrop: (matched: boolean) => void;
}) {
  const [isDragging, setDragging] = useState(false);
  const isClose = phase === 'tool' || phase === 'turn';
  const scale = modelScale(model.bounds);
  const focus = useMemo(() => getPracticeFocus(model.bounds, fastening.bounds, config.fastening.pick.point, scale),
    [model.bounds, fastening.bounds, config.fastening.pick.point, scale]);
  const partSize = Math.max(...fastening.bounds.max.map((value, axis) => (value - fastening.bounds.min[axis]) * scale), 0.025);
  const floor = (model.bounds.min[2] - model.bounds.max[2]) / 2 * scale - 0.045;
  const placementOffset = useMemo(() => getPreparationOffset(model.bounds, placement.bounds, scale), [model.bounds, placement.bounds, scale]);
  const fasteningOffset = useMemo(() => getPreparationOffset(model.bounds, fastening.bounds, scale), [model.bounds, fastening.bounds, scale]);

  return (
    <SceneCanvas frameloop="demand" camera={{ fov: 37, position: [2.6, -6.2, 4.4], up: [0, 0, 1], near: 0.001, far: 100 }}>
      <ambientLight intensity={1.65} />
      <directionalLight position={[3, -4, 6]} intensity={2.1} />
      <OrbitControls makeDefault enableDamping enabled={phase !== 'turn' && !isDragging} target={[1.1, 0, 0]} />
      {isClose && <StepCamera model={model} command={0} focusBounds={focus} />}
      <gridHelper args={[12, 36, '#67402a', '#302a27']} position={[0, 0, floor]} rotation={[Math.PI / 2, 0, 0]} />
      {(phase === 'place' || phase === 'insert') && <>
        <ZoneOutline center={0} floor={floor} color="#bf804e" />
        <ZoneOutline center={PREPARATION_CENTER} floor={floor} color="#7f9cb3" />
      </>}
      {phase === 'place' ? (
        <MovingPart key="placement" model={model} part={placement} target={config.placement.pick}
          offset={placementOffset} tolerance={0.22} onDrop={onDrop} onDragChange={setDragging} />
      ) : <PartMeshes model={model} part={placement} />}
      {phase === 'insert' && <MovingPart key="fastening" model={model} part={fastening} target={config.fastening.pick}
        offset={fasteningOffset} tolerance={Math.max(partSize * 0.6, 0.04)} onDrop={onDrop} onDragChange={setDragging} />}
      {(isClose || phase === 'done') && <PartMeshes model={model} part={fastening} />}
      {phase === 'tool' && <Anchor point={config.fastening.pick.point} size={partSize * 0.17} />}
      {phase === 'turn' && <ToolVisual pick={config.fastening.pick} turn={turn} size={partSize} />}
    </SceneCanvas>
  );
}

function ZoneOutline({ center, floor, color }: { center: number; floor: number; color: string }) {
  const points = useMemo<VectorTuple[]>(() => {
    const edge = 1.07;
    const z = floor + 0.003;
    return [[center - edge, -edge, z], [center + edge, -edge, z], [center + edge, edge, z],
      [center - edge, edge, z], [center - edge, -edge, z]];
  }, [center, floor]);
  return <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.76} raycast={noRaycast} />;
}

function Anchor({ point, size }: { point: VectorTuple; size: number }) {
  return <mesh position={point} renderOrder={4} raycast={noRaycast}>
    <sphereGeometry args={[size, 14, 10]} /><meshBasicMaterial color="#ffad54" depthTest={false} depthWrite={false} />
  </mesh>;
}

function MovingPart({ model, part, target, offset, tolerance, onDrop, onDragChange }: {
  model: StepModel; part: StepAssemblyPart; target: StepPick; offset: VectorTuple; tolerance: number;
  onDrop: (matched: boolean) => void; onDragChange: (dragging: boolean) => void;
}) {
  const group = useRef<Group>(null);
  const { camera, invalidate } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const drag = useRef<{ id: number; plane: Plane; grab: Vector2 } | null>(null);
  const anchor = useMemo(() => new Vector3(...target.point), [target.point]);

  function down(event: ThreeEvent<PointerEvent>) {
    if (event.button !== 0 || drag.current || !group.current) return;
    event.stopPropagation();
    const normal = camera.getWorldDirection(new Vector3());
    const source = anchor.clone().add(group.current.position).project(camera);
    const grab = event.pointer.clone().sub(new Vector2(source.x, source.y));
    drag.current = { id: event.pointerId, plane: new Plane().setFromNormalAndCoplanarPoint(normal, anchor), grab };
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
    group.current.position.copy(hit.sub(anchor));
    invalidate();
  }

  function finish(event: ThreeEvent<PointerEvent>, cancelled: boolean) {
    if (drag.current?.id !== event.pointerId || !group.current) return;
    event.stopPropagation();
    if (!cancelled) move(event);
    const matched = !cancelled && group.current.position.length() <= tolerance;
    drag.current = null;
    onDragChange(false);
    const destination: VectorTuple = matched ? [0, 0, 0] : offset;
    group.current.position.set(...destination);
    if ((event.target as Element).hasPointerCapture(event.pointerId)) (event.target as Element).releasePointerCapture(event.pointerId);
    invalidate();
    if (!cancelled) onDrop(matched);
  }

  return <>
    <PartMeshes model={model} part={part} ghost />
    <Anchor point={target.point} size={tolerance * 0.17} />
    <group ref={group} position={offset} onPointerDown={down} onPointerMove={move}
      onPointerUp={(event) => finish(event, false)} onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}>
      <PartMeshes model={model} part={part} active />
    </group>
  </>;
}

function PartMeshes({ model, part, ghost, active }: { model: StepModel; part: StepAssemblyPart; ghost?: boolean; active?: boolean }) {
  const shapes = useMemo(() => {
    const ids = new Set(part.shapeIds);
    return model.manifest.shapeList.filter((shape) => ids.has(shape.id));
  }, [model.manifest.shapeList, part.shapeIds]);
  const scale = modelScale(model.bounds);
  const center = model.bounds.max.map((value, axis) => (value + model.bounds.min[axis]) / 2);
  return <>{shapes.map((shape) => <Body key={shape.id} body={model.meshList[shape.meshIndex]} center={center} scale={scale} ghost={ghost} active={active} />)}</>;
}

function Body({ body, center, scale, ghost, active }: {
  body: StepMesh; center: number[]; scale: number; ghost?: boolean; active?: boolean;
}) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry().setAttribute('position', new BufferAttribute(body.position, 3))
      .setIndex(new BufferAttribute(body.index, 1));
    if (body.normal) result.setAttribute('normal', new BufferAttribute(body.normal, 3));
    else result.computeVertexNormals();
    return result;
  }, [body]);
  const edges = useMemo(() => ghost ? new EdgesGeometry(geometry, 22) : null, [geometry, ghost]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => edges?.dispose(), [edges]);
  const position = body.origin.map((value, axis) => (value - center[axis]) * scale) as VectorTuple;
  if (edges) return <lineSegments geometry={edges} position={position} scale={scale} raycast={noRaycast}>
    <lineBasicMaterial color="#ff973d" transparent opacity={0.82} depthWrite={false} />
  </lineSegments>;
  return (
    <mesh geometry={geometry} position={position} scale={scale} {...(active ? {} : { raycast: noRaycast })}>
      <meshStandardMaterial color={active ? '#f0c396' : '#abb4be'} side={DoubleSide} roughness={0.55} metalness={0.2} />
    </mesh>
  );
}

function ToolVisual({ pick, size, turn }: {
  pick: StepPick; size: number; turn: { progress: number; rotation: number; excess: number };
}) {
  const handle = useRef<Group>(null);
  const pulse = useRef({ elapsed: 0, strength: 0 });
  const invalidate = useThree((state) => state.invalidate);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const direction = new Vector3(...pick.normal).normalize();
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direction);

  useEffect(() => {
    if (reducedMotion || turn.progress < 0.76) return;
    pulse.current = { elapsed: 0, strength: turn.progress === 1 ? 0.17 : getPracticeResistance(turn.progress) * 0.12 };
    invalidate();
  }, [invalidate, reducedMotion, turn.progress, turn.rotation, turn.excess]);

  useFrame(({ clock }, delta) => {
    const vibration = pulse.current;
    if (!handle.current || vibration.strength === 0) return;
    vibration.elapsed += Math.min(delta, 1 / 30);
    const fade = Math.max(0, 1 - vibration.elapsed / 0.19);
    const amplitude = vibration.strength * fade;
    handle.current.rotation.y = Math.sin(clock.elapsedTime * 86) * amplitude;
    handle.current.rotation.z = Math.sin(clock.elapsedTime * 113) * amplitude * 0.45;
    if (fade > 0) invalidate();
    else vibration.strength = 0;
  });

  return (
    <group position={pick.point} quaternion={quaternion}>
      <group rotation={[0, 0, -turn.rotation]}>
        <mesh position={[0, 0, size * 0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[size * 0.09, size * 0.09, size * 0.48, 12]} /><meshStandardMaterial color="#ced5db" />
        </mesh>
        <group ref={handle} position={[0, 0, size * 0.48]}>
          <mesh position={[size * 0.43, 0, 0]}>
            <boxGeometry args={[size * 0.98, size * 0.15, size * 0.15]} /><meshStandardMaterial color="#eda768" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
