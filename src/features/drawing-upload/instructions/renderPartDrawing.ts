import {
  BufferAttribute, BufferGeometry, DoubleSide, EdgesGeometry, Group, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, OrthographicCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import type { StepBounds, StepModel } from '@/features/drawing-upload-dev/model/stepTypes';

const WIDTH = 448;
const HEIGHT = 300;
const LINE_COLOR = '#57636b';

export interface DrawingTarget {
  bounds: StepBounds;
  shapeIds?: readonly string[];
  highlightShapeIds?: readonly string[];
}

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

export function createPartDrawingRenderer(resolution = 1) {
  const width = WIDTH * resolution;
  const height = HEIGHT * resolution;
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const canvasContext = output.getContext('2d');
  if (!canvasContext) throw new Error('도면 이미지 캔버스를 만들 수 없습니다.');
  const context = canvasContext;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.setClearColor(0xffffff, 0);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.up.set(0, 0, 1);
  camera.position.set(1, -1, 1).normalize().multiplyScalar(4);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const surface = new MeshBasicMaterial({
    color: 0xfafafa, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const outline = new LineBasicMaterial({ color: LINE_COLOR, depthWrite: false });
  const highlightedSurface = surface.clone();
  highlightedSurface.color.set('#ffdec5');
  const highlightedOutline = outline.clone();
  highlightedOutline.color.set('#a94c19');

  function draw(model: StepModel, target: DrawingTarget) {
    const selected = target.shapeIds ? new Set(target.shapeIds) : null;
    const highlighted = new Set(target.highlightShapeIds);
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

      // Draw the outside silhouette from visible pixels, including smooth curved surfaces.
      context.clearRect(0, 0, width, height);
      for (const [x, y] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
        context.drawImage(renderer.domElement, x * resolution, y * resolution);
      }
      context.globalCompositeOperation = 'source-in';
      context.fillStyle = LINE_COLOR;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
      context.drawImage(renderer.domElement, 0, 0);
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
      return output.toDataURL('image/png');
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
