import { Box3, Group, Mesh, Texture, Vector3, type Material } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LIBRARY_MODEL_KEY, libraryAssetUrl } from '@/features/part-library/libraryTypes';
import type { Triple } from './assemblyTypes';
import type { ModelAppearance } from '@/features/part-library/modelAppearance';
import { applyModelAppearance } from '@/features/part-library/applyModelAppearance';

export interface LibraryAssemblyModel { scene: Group; size: Triple; }

export async function loadLibraryAssemblyModel(key: string, signal: AbortSignal, appearance?: ModelAppearance): Promise<LibraryAssemblyModel> {
  if (!LIBRARY_MODEL_KEY.test(key)) throw new Error('GLB 식별자가 올바르지 않습니다.');
  const response = await fetch(libraryAssetUrl({ key, name: '' }) + '?use=assembly', { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) });
  if (!response.ok) throw new Error('승인된 GLB 파일을 불러올 수 없습니다.');
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const { scene } = await loader.parseAsync(await response.arrayBuffer(), '');
  if (appearance) applyModelAppearance(scene, appearance);
  const oriented = new Group();
  oriented.rotation.x = Math.PI / 2;
  oriented.scale.setScalar(1000); // glTF: meters and Y-up. The editor: mm and Z-up.
  oriented.add(scene);
  const bounds = new Box3().setFromObject(oriented);
  const size = bounds.getSize(new Vector3()).toArray();
  if (signal.aborted || bounds.isEmpty() || size.some((value) => !Number.isFinite(value) || value > 10000)) {
    disposeLibraryAssemblyModel(oriented);
    signal.throwIfAborted();
    throw new Error('GLB 형상 또는 모델 단위를 확인해 주세요.');
  }
  oriented.position.copy(bounds.getCenter(new Vector3()).negate());
  return { scene: oriented, size };
}

export function disposeLibraryAssemblyModel(scene: Group) {
  const materials = new Set<Material>(), textures = new Set<Texture>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) {
    texture.dispose();
    if (texture.image instanceof ImageBitmap) texture.image.close();
  }
}
