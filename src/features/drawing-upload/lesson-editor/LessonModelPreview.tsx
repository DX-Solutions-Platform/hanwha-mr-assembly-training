'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bounds, Environment, Lightformer, Line, OrbitControls, useBounds } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, CanvasTexture, DoubleSide, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, PropertyBinding, Quaternion, Raycaster, SRGBColorSpace, Vector3, type Material, type Matrix4, type Object3D } from 'three';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { disposeLibraryAssemblyModel } from '@/features/drawing-upload-dev/assembly/loadLibraryAssemblyModel';
import { type PreviewAction, type PreviewPart, type PreviewPose } from './lessonPreviewData';
import { loadLessonModels } from './lessonModelAssets';
import { LessonActionMotion, partMotion, type ActionAnchors, type MotionPart, type ThreadGrip, type WorldPose } from './LessonActionMotion';
import { motionPhase, motionRange } from './lessonMotion';
import { approachTransform } from './lessonApproach';
import { LESSON_PREVIEW_MATERIALS, type LessonMaterialOverride } from './lessonPreviewMaterials';

type ModelProps = {
  assetList: unknown; assets: Record<string, Uint8Array<ArrayBuffer>>; parts: PreviewPart[];
  action?: PreviewAction; progress: number; playing: boolean; hasPlayback: boolean;
  lightweight?: boolean;
  cameraRequest: { id: number; target: boolean }; viewKey: string;
  materialsByPart: ReadonlyMap<string, LessonMaterialOverride>;
  onReady: (status: { ready: boolean; partIds: ReadonlySet<string> }) => void;
};
type Binding = MotionPart & { node: Object3D; matrix: Matrix4; localPosition: Vector3; localRotation: Quaternion };
type MeshState = { part: string; material: Mesh['material']; visible: boolean };
type Loaded = { scene: Group; bindings: Map<string, Binding>; owners: Map<Mesh, MeshState>; failed: number };

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <span role="alert">이 브라우저에서 3D 화면을 열 수 없습니다.</span> : this.props.children; }
}

async function loadModel(assetList: unknown, assets: ModelProps['assets'], parts: PreviewPart[]): Promise<Loaded> {
  const scene = new Group();
  const bindings = new Map<string, Binding>(), owners = new Map<Mesh, MeshState>();
  const { models, failed } = await loadLessonModels(assetList, assets);
  for (const { id, model } of models) {
    scene.add(model);
    const roots = new Map<Object3D, string>();
    for (const part of parts) {
      if (part.assetId !== id) continue;
      const node = model.getObjectByName(part.nodeName) ?? model.getObjectByName(PropertyBinding.sanitizeNodeName(part.nodeName));
      if (!node) continue;
      bindings.set(part.id, { part, node, origin: node.getWorldPosition(new Vector3()), rotation: node.getWorldQuaternion(new Quaternion()),
        bounds: new Box3().setFromObject(node), matrix: node.matrixWorld.clone(), localPosition: node.position.clone(), localRotation: node.quaternion.clone() });
      roots.set(node, part.id);
    }
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      let parent: Object3D | null = object;
      while (parent && !roots.has(parent)) parent = parent.parent;
      owners.set(object, { part: parent ? roots.get(parent)! : '', material: object.material, visible: object.visible });
    });
  }
  scene.updateMatrixWorld(true);
  return { scene, bindings, owners, failed };
}

function restoreAppearance(model: Loaded) {
  for (const [mesh, { material, visible }] of model.owners) {
    mesh.material = material;
    mesh.visible = visible;
  }
}

function releaseModel(model: Loaded) {
  restoreAppearance(model);
  disposeLibraryAssemblyModel(model.scene);
}

function showAction(model: Loaded, selected: ReadonlySet<string> | undefined, materialsByPart: ModelProps['materialsByPart']) {
  const replacements = new Map<LessonMaterialOverride, Map<Material, MeshStandardMaterial>>();
  const applyMaterial = (material: Material, preset: LessonMaterialOverride) => {
    const surface = LESSON_PREVIEW_MATERIALS[preset].surface;
    let cache = replacements.get(preset);
    if (!cache) replacements.set(preset, cache = new Map());
    const existing = cache.get(material);
    if (existing) return existing;
    const hasTextureMaps = material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial;
    const replacement = new MeshStandardMaterial({
      ...surface, side: material.side, visible: material.visible, opacity: material.opacity,
      transparent: material.transparent, alphaTest: material.alphaTest,
      depthWrite: material.depthWrite, depthTest: material.depthTest,
      alphaMap: hasTextureMaps ? material.alphaMap : null,
      map: hasTextureMaps && (material.transparent || material.alphaTest > 0) ? material.map : null,
    });
    cache.set(material, replacement);
    return replacement;
  };
  for (const [mesh, { part, visible, material }] of model.owners) {
    mesh.visible = visible && (!selected || selected.has(part));
    const preset = materialsByPart.get(part);
    if (!mesh.visible || !preset) continue;
    mesh.material = Array.isArray(material) ? material.map((item) => applyMaterial(item, preset)) : applyMaterial(material, preset);
  }
  return () => {
    restoreAppearance(model);
    replacements.forEach((cache) => cache.forEach((material) => material.dispose()));
  };
}

const toolAxis = new Vector3(0, 0, 1);

function touchOrientation(point: Vector3, bounds?: Box3) {
  if (!bounds || bounds.isEmpty()) return new Quaternion().setFromUnitVectors(toolAxis, new Vector3(0, 1, 0));
  let distance = Infinity;
  const normal = new Vector3();
  for (const axis of ['y', 'x', 'z'] as const) {
    const low = Math.abs(point[axis] - bounds.min[axis]);
    const high = Math.abs(point[axis] - bounds.max[axis]);
    if (Math.min(low, high) >= distance) continue;
    distance = Math.min(low, high);
    normal.set(0, 0, 0);
    normal[axis] = low < high ? -1 : 1;
  }
  return new Quaternion().setFromUnitVectors(toolAxis, normal);
}

function sampleThreadGrip(moving: Binding, target: WorldPose, source: WorldPose | undefined, scale: number): ThreadGrip | undefined {
  const axis = toolAxis.clone().applyQuaternion(target.orientation);
  const radial = new Vector3(Math.abs(axis.x) < .8 ? 1 : 0, 0, Math.abs(axis.x) < .8 ? 0 : 1);
  radial.addScaledVector(axis, -radial.dot(axis)).normalize();
  const tangent = new Vector3().crossVectors(axis, radial);
  const center = moving.bounds.getCenter(new Vector3());
  if (source) {
    const height = center.clone().sub(source.point).dot(axis);
    center.copy(source.point).addScaledVector(axis, height * .8);
  }

  // Raycast against the assembled pose even if the prior preview is still moving the live mesh.
  moving.node.updateWorldMatrix(true, true);
  const assembled = moving.matrix.clone().multiply(moving.node.matrixWorld.clone().invert());
  const meshes: Mesh[] = [];
  moving.node.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const proxy = new Mesh(object.geometry, object.material);
    proxy.matrixWorld.multiplyMatrices(assembled, object.matrixWorld);
    meshes.push(proxy);
  });
  if (!meshes.length) return;

  const distance = moving.bounds.getSize(new Vector3()).length() + scale;
  const raycaster = new Raycaster();
  raycaster.far = distance;
  const reach = Array.from({ length: 24 }, (_, index) => {
    const angle = index * Math.PI / 12;
    const outward = radial.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle));
    const inward = outward.clone().negate();
    let radius: number | undefined;
    for (const height of [-.22, .12, .50]) {
      const start = center.clone().addScaledVector(axis, height * scale).addScaledVector(outward, distance);
      raycaster.set(start, inward);
      const [hit] = raycaster.intersectObjects(meshes, false);
      if (hit) radius = Math.max(radius ?? 0, distance - hit.distance);
    }
    return radius;
  });
  if (reach.filter((value) => value !== undefined).length < reach.length / 2) return;
  return { center, radial, tangent, reach };
}

function actionAnchors(model: Loaded, action: PreviewAction, moving?: Binding): ActionAnchors {
  const transform = (partId?: string, value?: PreviewPose): WorldPose | undefined => {
    const binding = partId ? model.bindings.get(partId) : undefined;
    if (!binding || !value) return undefined;
    return { point: new Vector3(...value.position).applyMatrix4(binding.matrix),
      orientation: binding.rotation.clone().multiply(new Quaternion(...value.rotation ?? [0, 0, 0, 1]).normalize()) };
  };
  const target = transform(action.target?.partId, action.target?.pose);
  const source = transform(action.source?.partId, action.source?.pose);
  const partId = action.partIds[0];
  const workingPart = model.bindings.get(partId);
  const inspection = transform(partId, action.surface?.pose);
  const boltsById = new Map(action.bolts.map((bolt) => [bolt.id, bolt.pose]));
  const bolts = action.boltOrder.flatMap((id, index) => {
    const bolt = boltsById.get(id);
    return target && bolt ? [{ index, point: new Vector3(...bolt.position).applyQuaternion(target.orientation).add(target.point),
      orientation: target.orientation.clone().multiply(new Quaternion(...bolt.rotation ?? [0, 0, 0, 1]).normalize()) }] : [];
  });
  const points = action.points.flatMap((position) => {
    const marker = transform(partId, { position });
    return marker ? [{ point: marker.point, orientation: touchOrientation(marker.point, workingPart?.bounds) }] : [];
  });
  const extent = (moving ?? workingPart)?.bounds.getSize(new Vector3()).toArray().sort((a, b) => b - a);
  const handSize = MathUtils.clamp(Math.max(extent?.[1] ?? .09, (extent?.[0] ?? 0) * .32) * .65, .003, .19);
  const spacing = bolts.length > 1 ? Math.min(...bolts.slice(1).map((bolt) => bolt.point.distanceTo(bolts[0].point))) : 0;
  const scale = action.kind === 'fasten' ? MathUtils.clamp(spacing ? spacing * .38 : handSize, .003, .14)
    : action.kind === 'inspect' && action.surface ? Math.max(.003, action.surface.outer * .57)
    : action.kind === 'touch' ? MathUtils.clamp((action.radiusM ?? handSize * .26) * 2.6, .003, .12) : handSize;
  let start: Vector3 | undefined;
  if (action.kind === 'attach' && source && moving) {
    if (action.approach && target) start = approachTransform(action.approach, target.orientation, moving.origin, source.point).start;
    else if (moving.part.initial && moving.part.assembled) {
      start = source.point.clone().add(new Vector3(...moving.part.initial.position).sub(new Vector3(...moving.part.assembled.position)));
    }
  }
  const threadGrip = action.kind === 'thread' && moving && target ? sampleThreadGrip(moving, target, source, scale * .9) : undefined;
  return { target, source, inspection, bolts, points, moving, scale, start, threadGrip };
}

function frameAction(box: Box3, anchors: ActionAnchors, action: PreviewAction) {
  if (anchors.moving) box.union(anchors.moving.bounds);
  for (const { point } of [...anchors.bolts, ...anchors.points]) box.expandByPoint(point);
  const anchor = anchors.inspection ?? anchors.target;
  if (anchor) box.expandByPoint(anchor.point);
  if (box.isEmpty()) return;
  box.expandByScalar(anchors.scale * 1.1);
  if (anchor) box.expandByPoint(anchor.point.clone().addScaledVector(toolAxis.clone().applyQuaternion(anchor.orientation), anchors.scale * 3));
  if (anchors.inspection && action.surface) {
    const { point, orientation } = anchors.inspection;
    const radius = action.surface.outer * 1.1;
    const tangentX = new Vector3(radius, 0, 0).applyQuaternion(orientation);
    const tangentY = new Vector3(0, radius, 0).applyQuaternion(orientation);
    for (const sign of [-1, 1]) {
      box.expandByPoint(point.clone().addScaledVector(tangentX, sign));
      box.expandByPoint(point.clone().addScaledVector(tangentY, sign));
    }
  }
  if (action.kind === 'attach' && anchors.start && anchors.target) {
    box.expandByPoint(anchors.start.clone().lerp(anchors.target.point, .58));
  }
}

export default function LessonModelPreview(props: ModelProps) {
  const { assetList, assets, parts, onReady } = props;
  const [model, setModel] = useState<Loaded>();
  useEffect(() => {
    let alive = true;
    let current: Loaded | undefined;
    void loadModel(assetList, assets, parts).then((result) => {
      current = result;
      if (alive) {
        setModel(result);
        onReady({ ready: result.owners.size > 0, partIds: new Set([...result.owners.values()].map(({ part }) => part).filter(Boolean)) });
      } else releaseModel(result);
    }).catch(() => {
      if (alive) {
        setModel({ scene: new Group(), bindings: new Map(), owners: new Map(), failed: 1 });
        onReady({ ready: false, partIds: new Set() });
      }
    });
    return () => {
      alive = false;
      if (current) releaseModel(current);
    };
  }, [assetList, assets, parts, onReady]);

  if (!model) return <span role="status">3D 모델을 불러오는 중입니다.</span>;
  if (!model.owners.size) return <span role="status">{model.failed ? '이 구간의 GLB를 열 수 없습니다.' : '이 구간에 3D 모델이 없습니다.'}</span>;
  return <PreviewBoundary>
    <SceneCanvas detailDpr={props.lightweight ? 1 : 2} camera={{ position: [4, 3.6, 4], fov: 38 }} frameloop="demand" resize={{ offsetSize: true }}>
      <hemisphereLight args={['#deedff', '#4d5361', 1.04]} />
      <directionalLight position={[3, 5, 4]} intensity={2.1} />
      <directionalLight position={[-3, 2, -4]} color="#c8e4ff" intensity={1.15} />
      <Environment resolution={props.lightweight ? 64 : 128} environmentIntensity={.65}>
        <Lightformer position={[0, 4, 1]} rotation={[Math.PI / 2, 0, 0]} scale={[5, 3, 1]} intensity={3} />
        <Lightformer position={[3, 0, -3]} rotation={[0, -Math.PI / 4, 0]} scale={[3, 5, 1]} intensity={2} />
      </Environment>
      <OrbitControls makeDefault enableDamping />
      <Bounds margin={1.28} maxDuration={.35}>
        <PreviewScene model={model} action={props.action} progress={props.progress} playing={props.playing}
          hasPlayback={props.hasPlayback} cameraRequest={props.cameraRequest} viewKey={props.viewKey} materialsByPart={props.materialsByPart} />
      </Bounds>
    </SceneCanvas>
    {model.failed > 0 && <span role="status">GLB {model.failed}개를 표시할 수 없습니다.</span>}
    <span hidden data-lesson-model-ready={model.bindings.size} />
  </PreviewBoundary>;
}

function PreviewScene({ model, action, progress, playing, hasPlayback, cameraRequest, viewKey, materialsByPart }: {
  model: Loaded;
} & Pick<ModelProps, 'action' | 'progress' | 'playing' | 'hasPlayback' | 'cameraRequest' | 'viewKey' | 'materialsByPart'>) {
  const invalidate = useThree((state) => state.invalidate);
  const bounds = useBounds();
  const lastView = useRef<{ bounds: typeof bounds; model: Loaded; key: string }>(null);
  const targetIds = useMemo(() => new Set(action?.partIds.filter((id) => model.bindings.has(id))), [action, model]);
  const moving = action?.movingId ? model.bindings.get(action.movingId) : undefined;
  const markers = useMemo(() => action ? actionAnchors(model, action, moving) : undefined, [action, model, moving]);
  const focusOnAction = cameraRequest.target;
  useEffect(() => {
    const selected = focusOnAction && targetIds.size ? targetIds : undefined;
    if (!selected && !materialsByPart.size) return;
    const restore = showAction(model, selected, materialsByPart);
    invalidate();
    return () => {
      restore();
      invalidate();
    };
  }, [model, targetIds, focusOnAction, materialsByPart, invalidate]);

  useEffect(() => {
    const key = cameraRequest.id + ':' + (cameraRequest.target ? viewKey : '');
    if (lastView.current?.bounds === bounds && lastView.current.model === model && lastView.current.key === key) return;
    lastView.current = { bounds, model, key };
    const box = new Box3();
    if (cameraRequest.target) {
      if (action && markers) frameAction(box, markers, action);
      if (box.isEmpty()) {
        for (const id of targetIds) {
          const binding = model.bindings.get(id);
          if (binding) box.union(binding.bounds);
        }
      }
    }
    if (box.isEmpty()) box.setFromObject(model.scene);
    if (!box.isEmpty()) bounds.refresh(box).clip().reset().fit();
  }, [action, cameraRequest, bounds, markers, model, targetIds, viewKey]);

  useEffect(() => {
    if (!moving?.node.parent || !action || !markers || !playing) return;
    const movement = partMotion(action, markers, progress);
    if (!movement) return;
    const parent = moving.node.parent;
    moving.node.position.copy(parent.worldToLocal(movement.position));
    moving.node.quaternion.copy(parent.getWorldQuaternion(new Quaternion()).invert().multiply(movement.rotation));
    invalidate();
  }, [action, markers, moving, playing, progress, invalidate]);

  useEffect(() => {
    if (!playing || !moving) return;
    return () => {
      moving.node.position.copy(moving.localPosition);
      moving.node.quaternion.copy(moving.localRotation);
      invalidate();
    };
  }, [moving, playing, invalidate]);

  return <>
    <primitive object={model.scene} dispose={null} />
    {playing && action && markers && <LessonActionMotion action={action} anchors={markers} progress={progress} />}
    {!playing && markers?.target && !markers.bolts.length &&
      <Marker position={markers.target.point} label={action?.kind === 'attach' ? '장착 위치' : '체결 기준 위치'} />}
    {markers?.bolts.map(({ point, index }) => <Marker key={index} position={point} label={String(index + 1)}
      active={playing && index === Math.floor(progress * (action?.boltOrder.length ?? 0))} />)}
    {markers?.start && markers.target && markers.start.distanceTo(markers.target.point) > .0001 &&
      <Line points={[markers.start, markers.target.point]} color="#ffbe7e" dashed dashScale={8} lineWidth={2} />}
    {markers?.inspection && action?.surface && <>
      <group position={markers.inspection.point} quaternion={markers.inspection.orientation}>
        {Array.from({ length: action.surface.sectors }, (_, index) => {
          const angle = 2 * Math.PI / action.surface!.sectors;
          return <mesh key={index} renderOrder={2}>
            <ringGeometry args={[action.surface!.inner, action.surface!.outer, 16, 1, index * angle, angle * .96]} />
            <meshBasicMaterial color={playing && index === motionPhase(motionRange(progress, .12, .9), action.surface!.sectors).index ? '#b3f4ff' : '#6ad5dc'}
              transparent opacity={.34} side={DoubleSide} depthTest={false} depthWrite={false} />
          </mesh>;
        })}
      </group>
      {!playing && <Marker position={markers.inspection.point} label={action.surface.sectors + '개 검사 구역'} />}
    </>}
    {markers?.points.map(({ point, orientation }, index) => {
      const completed = hasPlayback && progress * markers.points.length >= index + .86;
      if (completed && action?.tool === 'pen') return <mesh key={index} position={point} quaternion={orientation} scale={markers.scale} renderOrder={3}>
        <planeGeometry args={[.24, .046]} /><meshBasicMaterial color="#ffe278" side={DoubleSide} depthTest={false} depthWrite={false} />
      </mesh>;
      if (completed && action?.tool === 'brush') return <mesh key={index} position={point} quaternion={orientation} scale={markers.scale} renderOrder={3}>
        <circleGeometry args={[.13, 22]} /><meshBasicMaterial color="#dba85c" side={DoubleSide} transparent opacity={.65} depthTest={false} depthWrite={false} />
      </mesh>;
      return <Marker key={index} position={point} label={String(index + 1)}
        active={playing && index === Math.floor(progress * markers.points.length)} />;
    })}
  </>;
}

function Marker({ position, label, active }: { position: Vector3; label: string; active?: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    const font = '600 26px sans-serif';
    context.font = font;
    canvas.width = Math.ceil(context.measureText(label).width) + 28;
    canvas.height = 40;
    context.fillStyle = active ? '#ffad68' : '#16191e';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#ffad68';
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    context.font = font;
    context.textBaseline = 'middle';
    context.fillStyle = active ? '#151719' : '#ffdfb7';
    context.fillText(label, 14, canvas.height / 2);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [label, active]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  const labelHeight = .032;
  return <sprite position={position} scale={[labelHeight * texture.image.width / texture.image.height, labelHeight, 1]} renderOrder={3}>
    <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} depthWrite={false} toneMapped={false} />
  </sprite>;
}
