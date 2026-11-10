import {
  BufferAttribute, BufferGeometry, DoubleSide, EdgesGeometry, Group, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, OrthographicCamera, Scene, Vector3, WebGLRenderer, type Object3D,
} from 'three';
import type { StepBounds, StepMesh, StepShape, VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';

const WIDTH = 448;
const HEIGHT = 300;
const LINE_COLOR = '#57636b';
const LOCATION_COLOR = '#c45517';

export interface DrawingTarget {
  bounds: StepBounds;
  shapeIds?: readonly string[];
  highlightShapeIds?: readonly string[];
  guide?: { from: VectorTuple; to: VectorTuple };
  marks?: readonly VectorTuple[];
}
export type DrawingMeshModel = {
  manifest: { shapeList: readonly Pick<StepShape, 'id' | 'meshIndex'>[] };
  meshList: readonly Pick<StepMesh, 'position' | 'index' | 'origin'>[];
};

function fitCamera(camera: OrthographicCamera, bounds: StepBounds, scale: number) {
  const half = bounds.max.map((value, axis) => (value - bounds.min[axis]) * scale / 2);
  const corner = new Vector3();
  let width = 0;
  let height = 0;
  for (const x of [-half[0], half[0]]) {
    for (const y of [-half[1], half[1]]) {
      for (const z of [-half[2], half[2]]) {
        corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        width = Math.max(width, Math.abs(corner.x));
        height = Math.max(height, Math.abs(corner.y));
      }
    }
  }
  const aspect = WIDTH / HEIGHT;
  const frame = Math.max(height, width / aspect, 0.001) * 1.14;
  camera.left = -frame * aspect;
  camera.right = frame * aspect;
  camera.top = frame;
  camera.bottom = -frame;
  camera.updateProjectionMatrix();
}

function croppedFigure(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, padding: number) {
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = (y * width + x) * 4;
      if (pixels[pixel] >= 252 && pixels[pixel + 1] >= 252 && pixels[pixel + 2] >= 252) continue;
      left = Math.min(x, left);
      right = Math.max(x, right);
      top = Math.min(y, top);
      bottom = Math.max(y, bottom);
    }
  }
  if (right < left) return canvas.toDataURL('image/png');
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  const crop = document.createElement('canvas');
  crop.width = right - left + 1;
  crop.height = bottom - top + 1;
  crop.getContext('2d')?.drawImage(canvas, left, top, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return crop.toDataURL('image/png');
}

export function createPartDrawingRenderer(resolution = 1, up: 'y' | 'z' = 'z') {
  const width = WIDTH * resolution;
  const height = HEIGHT * resolution;
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const overlay = document.createElement('canvas');
  overlay.width = width;
  overlay.height = height;
  const canvasContext = output.getContext('2d');
  const overlayContext = overlay.getContext('2d');
  if (!canvasContext || !overlayContext) throw new Error('도면 이미지 캔버스를 만들 수 없습니다.');
  const context = canvasContext;
  const locationContext = overlayContext;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.setClearColor(0xffffff, 0);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.up.set(0, up === 'y' ? 1 : 0, up === 'y' ? 0 : 1);
  if (up === 'y') camera.position.set(1.25, .83, 1.5);
  else camera.position.set(1, -1, 1);
  camera.position.normalize().multiplyScalar(4);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const surface = new MeshBasicMaterial({
    color: 0xfafafa, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const outline = new LineBasicMaterial({ color: LINE_COLOR, depthWrite: false });
  const highlightedSurface = surface.clone();
  highlightedSurface.color.set('#ffdec5');
  const highlightedOutline = outline.clone();
  highlightedOutline.color.set(LOCATION_COLOR);

  function paintFigure(targetContext: CanvasRenderingContext2D, lineColor: string) {
    targetContext.clearRect(0, 0, width, height);
    for (const [x, y] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      targetContext.drawImage(renderer.domElement, x * resolution, y * resolution);
    }
    targetContext.globalCompositeOperation = 'source-in';
    targetContext.fillStyle = lineColor;
    targetContext.fillRect(0, 0, width, height);
    targetContext.globalCompositeOperation = 'source-over';
    targetContext.drawImage(renderer.domElement, 0, 0);
  }

  function draw(model: DrawingMeshModel, target: DrawingTarget) {
    const selected = target.shapeIds ? new Set(target.shapeIds) : null;
    const highlighted = new Set(target.highlightShapeIds);
    const locationMeshes = new Set<Object3D>();
    const group = new Group();
    const geometries: BufferGeometry[] = [];
    const center = target.bounds.max.map((value, axis) => (value + target.bounds.min[axis]) / 2);
    const span = Math.max(...target.bounds.max.map((value, axis) => value - target.bounds.min[axis]), 0.000001);
    const scale = 1 / span;
    try {
      for (const shape of model.manifest.shapeList) {
        if (selected && !selected.has(shape.id)) continue;
        const body = model.meshList[shape.meshIndex];
        const isHighlighted = highlighted.has(shape.id);
        const geometry = new BufferGeometry();
        geometries.push(geometry);
        geometry.setAttribute('position', new BufferAttribute(body.position, 3));
        geometry.setIndex(new BufferAttribute(body.index, 1));
        const mesh = new Mesh(geometry, isHighlighted ? highlightedSurface : surface);
        if (isHighlighted) locationMeshes.add(mesh);
        mesh.position.set((body.origin[0] - center[0]) * scale, (body.origin[1] - center[1]) * scale, (body.origin[2] - center[2]) * scale);
        mesh.scale.setScalar(scale);
        const edges = new EdgesGeometry(geometry, 21);
        geometries.push(edges);
        const lines = new LineSegments(edges, isHighlighted ? highlightedOutline : outline);
        lines.renderOrder = 1;
        mesh.add(lines);
        group.add(mesh);
      }
      scene.add(group);
      fitCamera(camera, target.bounds, scale);
      renderer.render(scene, camera);

      paintFigure(context, LINE_COLOR);
      if (locationMeshes.size) {
        // Project the selected part again from the same camera and assembly coordinates.
        for (const mesh of group.children) mesh.visible = locationMeshes.has(mesh);
        renderer.render(scene, camera);
        paintFigure(locationContext, LOCATION_COLOR);
        context.globalAlpha = 0.76;
        context.drawImage(overlay, 0, 0);
        context.globalAlpha = 1;
      }
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
      if (target.guide || target.marks?.length) {
        const map = (point: VectorTuple) => {
          const projected = new Vector3(...point).sub(new Vector3(...center)).multiplyScalar(scale).project(camera);
          return [(projected.x + 1) * width / 2, (1 - projected.y) * height / 2] as const;
        };
        context.save();
        context.strokeStyle = LOCATION_COLOR;
        context.fillStyle = LOCATION_COLOR;
        context.lineWidth = 2 * resolution;
        if (target.guide) {
          const [x, y] = map(target.guide.from), [toX, toY] = map(target.guide.to);
          const angle = Math.atan2(toY - y, toX - x);
          context.setLineDash([5 * resolution, 3 * resolution]);
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(toX, toY);
          context.stroke();
          context.setLineDash([]);
          context.beginPath();
          context.moveTo(toX, toY);
          for (const side of [-1, 1]) {
            const offset = angle + Math.PI + side * .42;
            context.lineTo(toX + Math.cos(offset) * 10 * resolution, toY + Math.sin(offset) * 10 * resolution);
          }
          context.closePath();
          context.fill();
        }
        for (const mark of target.marks ?? []) {
          const [x, y] = map(mark);
          context.beginPath();
          context.arc(x, y, 4 * resolution, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }
      return up === 'y' ? croppedFigure(output, context, 10 * resolution) : output.toDataURL('image/png');
    } finally {
      scene.remove(group);
      geometries.forEach((geometry) => geometry.dispose());
    }
  }

  function dispose() {
    outline.dispose();
    surface.dispose();
    highlightedOutline.dispose();
    highlightedSurface.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { draw, dispose };
}
