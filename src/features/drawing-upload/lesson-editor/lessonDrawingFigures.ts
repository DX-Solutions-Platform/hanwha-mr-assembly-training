import { Box3, Mesh, PropertyBinding, Quaternion, Vector3, type Object3D } from 'three';
import { disposeLibraryAssemblyModel } from '@/features/drawing-upload-dev/assembly/loadLibraryAssemblyModel';
import { createPartDrawingRenderer, type DrawingMeshModel, type DrawingTarget } from '../instructions/renderPartDrawing';
import { approachTransform, poseRotation } from './lessonApproach';
import { loadLessonModels } from './lessonModelAssets';
import type { PreviewAction, PreviewPart, PreviewPose } from './lessonPreviewData';

type MeshSource = DrawingMeshModel['meshList'][number];
type Shape = DrawingMeshModel['manifest']['shapeList'][number];
type PartGeometry = { node: Object3D; shapes: string[]; bounds: Box3 };

export async function createLessonDrawingFigures(assetList: unknown, assets: Record<string, Uint8Array<ArrayBuffer>>, parts: PreviewPart[], signal: AbortSignal) {
  const { models, failed } = await loadLessonModels(assetList, assets);
  const meshes: MeshSource[] = [], shapes: Shape[] = [];
  const mappedParts = new Map<string, PartGeometry>();
  const totalBounds = new Box3();
  let renderer: ReturnType<typeof createPartDrawingRenderer> | undefined;

  try {
    signal.throwIfAborted();
    for (const { id, model } of models) {
      model.updateMatrixWorld(true);
      const roots = new Map<Object3D, PartGeometry>();
      for (const part of parts) {
        if (part.assetId !== id) continue;
        const node = model.getObjectByName(part.nodeName) ?? model.getObjectByName(PropertyBinding.sanitizeNodeName(part.nodeName));
        if (!node) continue;
        const geometry = { node, shapes: [], bounds: new Box3() };
        roots.set(node, geometry);
        mappedParts.set(part.id, geometry);
      }
      model.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        const position = node.geometry.getAttribute('position');
        if (!position?.count) return;
        let root: Object3D | null = node;
        while (root && !roots.has(root)) root = root.parent;
        const owner = root ? roots.get(root) : undefined;
        const point = new Vector3();
        const bounds = new Box3();
        const vertices = new Float32Array(position.count * 3);
        for (let index = 0; index < position.count; index++) {
          point.fromBufferAttribute(position, index).applyMatrix4(node.matrixWorld);
          point.toArray(vertices, index * 3);
          bounds.expandByPoint(point);
        }
        const index = node.geometry.getIndex();
        const meshIndex = meshes.length;
        const shapeId = String(meshIndex);
        meshes.push({ position: vertices, index: index ? Uint32Array.from(index.array) : Uint32Array.from({ length: position.count }, (_, i) => i), origin: [0, 0, 0] });
        shapes.push({ id: shapeId, meshIndex });
        totalBounds.union(bounds);
        owner?.shapes.push(shapeId);
        owner?.bounds.union(bounds);
      });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      signal.throwIfAborted();
    }
    if (meshes.length) renderer = createPartDrawingRenderer(2, 'y');
  } catch (error) {
    models.forEach(({ model }) => disposeLibraryAssemblyModel(model));
    renderer?.dispose();
    throw error;
  }

  const drawing = { manifest: { shapeList: shapes }, meshList: meshes };
  const cache = new Map<string, { assembly?: string; detail?: string }>();
  function worldPose(partId?: string, pose?: PreviewPose) {
    const binding = partId ? mappedParts.get(partId) : undefined;
    if (!binding || !pose) return;
    return { point: binding.node.localToWorld(new Vector3(...pose.position)),
      rotation: binding.node.getWorldQuaternion(new Quaternion()).multiply(poseRotation(pose)) };
  }
  function asBounds(box: Box3) { return { min: box.min.toArray(), max: box.max.toArray() }; }
  function draw(action?: PreviewAction, mountedPartId?: string) {
    signal.throwIfAborted();
    if (!renderer) return {};
    const key = JSON.stringify([action?.kind, action?.partIds, action?.source, action?.target, action?.approach, action?.approachDistance,
      action?.bolts, action?.surface, action?.points, mountedPartId]);
    const saved = cache.get(key);
    if (saved) return saved;
    const activeId = mountedPartId ?? action?.movingId ?? action?.partIds[0];
    const active = activeId ? mappedParts.get(activeId) : undefined;
    const included = [...new Set([...(action?.partIds ?? []), ...(mountedPartId ? [mountedPartId] : [])])].flatMap((id) => {
      const part = mappedParts.get(id);
      return part?.shapes.length ? [part] : [];
    });
    const bounds = new Box3();
    included.forEach((part) => bounds.union(part.bounds));
    if (bounds.isEmpty()) bounds.copy(totalBounds);
    let guide: DrawingTarget['guide'];
    const marks: NonNullable<DrawingTarget['marks']>[number][] = [];
    if (action?.kind === 'attach' && active) {
      const target = worldPose(action.target?.partId, action.target?.pose);
      const source = worldPose(action.source?.partId, action.source?.pose);
      if (target && source) {
        const approach = action.approach ?? { directionDeg: 0, tiltDeg: 0, distanceM: action.approachDistance || bounds.getSize(new Vector3()).length() * .25 };
        const { start } = approachTransform(approach, target.rotation, active.node.getWorldPosition(new Vector3()), source.point);
        bounds.expandByPoint(start);
        guide = { from: start.toArray(), to: target.point.toArray() };
      }
    }
    if (action?.kind === 'fasten') {
      const target = worldPose(action.target?.partId, action.target?.pose);
      if (target) {
        for (const bolt of action.bolts) marks.push(new Vector3(...bolt.pose.position).applyQuaternion(target.rotation).add(target.point).toArray());
        if (!marks.length) marks.push(target.point.toArray());
      }
    }
    if (action?.kind === 'touch') {
      for (const position of action.points) {
        const pose = worldPose(action.partIds[0], { position });
        if (pose) marks.push(pose.point.toArray());
      }
    }
    if (action?.kind === 'inspect') {
      const center = worldPose(action.partIds[0], action.surface?.pose);
      if (center) marks.push(center.point.toArray());
    }
    marks.forEach((position) => bounds.expandByPoint(new Vector3(...position)));
    const includedShapes = included.length ? included.flatMap((part) => part.shapes) : undefined;
    const detail = active?.shapes.length ? {
      bounds: asBounds(active.bounds),
      shapeIds: active.shapes,
      ...(mountedPartId && marks.length ? { shapeIds: includedShapes, marks,
        bounds: asBounds(new Box3().setFromPoints(marks.map((point) => new Vector3(...point))).union(active.bounds).expandByScalar(active.bounds.getSize(new Vector3()).length() * .12)) } : {}),
    } : undefined;
    const result = {
      assembly: renderer.draw(drawing, { bounds: asBounds(bounds), shapeIds: includedShapes, highlightShapeIds: active?.shapes, guide, marks }),
      detail: detail ? renderer.draw(drawing, detail) : undefined,
    };
    if (cache.size >= 12) cache.delete(cache.keys().next().value!);
    cache.set(key, result);
    return result;
  }
  return { draw, failed, dispose: () => {
    renderer?.dispose();
    models.forEach(({ model }) => disposeLibraryAssemblyModel(model));
  } };
}
