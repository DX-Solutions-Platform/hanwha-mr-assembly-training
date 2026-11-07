import { Mesh, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { appearanceSurface } from '@/features/part-library/modelAppearance';
import { buildFlangeGeometry } from './buildFlangeGeometry';
import type { FlangeRecipe } from './flangeTypes';

export async function exportFlangeGlb(recipe: FlangeRecipe) {
  const geometry = buildFlangeGeometry(recipe.values), material = new MeshStandardMaterial(appearanceSurface(recipe.appearance));
  const mesh = new Mesh(geometry, material); mesh.name = recipe.values.part.partNumber;
  mesh.scale.setScalar(.001); // The recipe/geometry use mm; glTF uses meters.
  mesh.rotation.x = -Math.PI / 2; // Convert the model's Z-up frame to glTF's Y-up frame.
  mesh.userData = {
    template: recipe.template, documentSha256: recipe.document.sha256, documentName: recipe.document.name,
    sourcePage: recipe.source.partEvidence.pageNumber, parameters: recipe.values.parameters,
    parameterUnit: 'mm', parameterAxes: 'Z_UP', outputAxes: 'Y_UP', part: recipe.values.part,
    reviewStatus: recipe.status, confirmedAt: recipe.confirmedAt,
    generationMethod: recipe.source.outline ? 'outline-flange-from-pdf' : 'parametric-flange-from-pdf',
    ...(recipe.source.outline ? { outlineSource: recipe.source.outline, outlineRegion: recipe.source.evidence.holeCount } : {}),
    ...(recipe.appearance ? { appearance: recipe.appearance } : {}),
  };
  try {
    const result = await new GLTFExporter().parseAsync(mesh, { binary: true });
    if (!(result instanceof ArrayBuffer)) throw new Error('GLB 파일 생성에 실패했습니다.');
    return new Blob([result], { type: 'model/gltf-binary' });
  } finally { geometry.dispose(); material.dispose(); }
}
