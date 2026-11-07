import { Group, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { appearanceSurface, type ModelAppearance } from '@/features/part-library/modelAppearance';
import type { ReviewDocument } from '../../review/reviewTypes';
import type { FlangePart } from '../flangeTypes';
import type { DrawingShape, DraftSize } from './draftGeometry';
import { buildDrawingModel } from './buildDrawingModel';

export async function exportDrawingDraft(shape: DrawingShape, size: DraftSize, part: FlangePart, appearance: ModelAppearance,
  document: ReviewDocument, confirmedAt: string | null, dimensionSources: Partial<Record<keyof DraftSize, string>>,
  productBasis?: 'proportional' | 'provided') {
  const material = new MeshStandardMaterial(appearanceSurface(appearance));
  const { frame, dispose } = buildDrawingModel(shape, size, material);
  const model = new Group();
  model.add(frame);
  model.name = part.partNumber || part.name;
  model.scale.setScalar(.001);
  model.userData = {
    ...(shape.kind === 'orthographic'
      ? { template: 'orthographic-hull-v1', generationMethod: 'orthographic-hull-from-pdf', sourceViews: shape.regions }
      : shape.kind === 'isometric'
        ? { template: 'isometric-blocks-v1', generationMethod: 'isometric-blocks-from-pdf', sourceBlocks: shape.draft.blocks }
        : { template: 'step-stool-v1', generationMethod: 'step-stool-from-pdf' }),
    parameterUnit: 'mm',
    ...(productBasis ? { modelRole: 'finished-product', dimensionBasis: productBasis } : {}),
    documentSha256: document.sha256, documentName: document.name, sourcePage: shape.pageNumber, sourceRect: shape.rect,
    parameters: size, dimensionSources, part, appearance, reviewStatus: confirmedAt ? 'confirmed' : 'draft', confirmedAt,
  };
  try {
    const bytes = await new GLTFExporter().parseAsync(model, { binary: true });
    if (!(bytes instanceof ArrayBuffer)) throw new Error('GLB를 생성하지 못했습니다.');
    return new Blob([bytes], { type: 'model/gltf-binary' });
  } finally { dispose(); material.dispose(); }
}
