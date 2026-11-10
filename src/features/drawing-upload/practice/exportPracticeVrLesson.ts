import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { StepModel } from '../../drawing-upload-dev/model/stepTypes';
import { createPracticeVrLesson, mmToLessonAxes } from './practiceVrLesson';
import { getPracticePartSurface } from './stepPracticeMotion';
import { encodeVrLesson, packVrLesson } from './vrLessonArchive';

async function makeGlb(model: StepModel, nodes: ReturnType<typeof createPracticeVrLesson>['models'][number]['nodes']) {
  const group = new Group();
  const shapes = new Map(model.manifest.shapeList.map((shape) => [shape.id, shape]));
  const meshes: Mesh<BufferGeometry, MeshStandardMaterial>[] = [];
  try {
    for (const { id, members, pivot, position } of nodes) {
      const partNode = new Group();
      partNode.name = id;
      partNode.position.copy(position);
      for (const part of members) for (const shapeId of part.shapeIds) {
        const shape = shapes.get(shapeId);
        if (!shape) throw new Error('교육 모델의 부품 형상을 찾을 수 없습니다.');
        const body = model.meshList[shape.meshIndex];
        const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(body.position, 3))
          .setIndex(new BufferAttribute(body.index, 1));
        if (body.normal) geometry.setAttribute('normal', new BufferAttribute(body.normal, 3));
        else geometry.computeVertexNormals();
        const material = new MeshStandardMaterial(getPracticePartSurface(part.number, part.name));
        if (body.color) material.color.set(new Color(...body.color));
        const mesh = new Mesh(geometry, material);
        mesh.name = `${id}-${shapeId}`;
        mesh.position.copy(mmToLessonAxes(new Vector3(...body.origin).sub(pivot).toArray()));
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.setScalar(0.001);
        meshes.push(mesh);
        partNode.add(mesh);
      }
      group.add(partNode);
    }
    const bytes = await new GLTFExporter().parseAsync(group, { binary: true });
    if (!(bytes instanceof ArrayBuffer)) throw new Error('교육 모델 GLB를 생성하지 못했습니다.');
    return new Uint8Array(bytes);
  } finally {
    for (const { geometry, material } of meshes) { geometry.dispose(); material.dispose(); }
  }
}

export async function exportPracticeVrLesson(...args: Parameters<typeof createPracticeVrLesson>) {
  const [model] = args;
  const { lesson, models } = createPracticeVrLesson(...args);
  const entries: Record<string, Uint8Array<ArrayBuffer>> = { 'lesson.json': encodeVrLesson(lesson) };
  for (const asset of models) entries[asset.path] = await makeGlb(model, asset.nodes);
  const blob = await packVrLesson(entries, { packageType: 'dx-vr-training', formatVersion: '0.2.0',
    trainingId: lesson.trainingId, contentVersion: lesson.contentVersion, purpose: 'integration_test', lessonFile: 'lesson.json' });
  return { filename: `${lesson.trainingId}_${lesson.contentVersion}.vrlesson.zip`, blob };
}
