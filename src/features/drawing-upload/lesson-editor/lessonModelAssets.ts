import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { previewAssets } from './lessonPreviewData';

export async function loadLessonModels(assetList: unknown, assets: Record<string, Uint8Array<ArrayBuffer>>) {
  const manager = new LoadingManager().setURLModifier((url) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    throw new Error('GLB 외부 리소스는 교육 ZIP에서 열 수 없습니다.');
  });
  const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const results = await Promise.allSettled(previewAssets(assetList).map(async ({ id, path }) => {
    if (!Object.hasOwn(assets, path)) throw new Error('교육 ZIP에 GLB가 없습니다.');
    const bytes = assets[path];
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const { scene: model } = await loader.parseAsync(buffer, '');
    return { id, model };
  }));
  const models = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  return { models, failed: results.length - models.length };
}
