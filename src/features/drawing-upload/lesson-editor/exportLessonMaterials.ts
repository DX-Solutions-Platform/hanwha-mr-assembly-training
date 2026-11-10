import { Color, PropertyBinding } from 'three';
import { LESSON_PREVIEW_MATERIALS, type LessonMaterialOverride } from './lessonPreviewMaterials';

type Node = { name?: string; children?: number[]; mesh?: number };
type Primitive = { material?: number };
type Mesh = { primitives: Primitive[] };
type Material = {
  name?: string; alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND'; alphaCutoff?: number; doubleSided?: boolean;
  pbrMetallicRoughness?: { baseColorFactor?: number[]; baseColorTexture?: unknown; metallicFactor?: number; roughnessFactor?: number };
};
type Gltf = { scene?: number; scenes: { nodes?: number[] }[]; nodes: Node[]; meshes: Mesh[]; materials?: Material[] };
export type LessonMaterialEdits = ReadonlyMap<string, ReadonlyMap<string, LessonMaterialOverride>>;

function applyMaterials(gltf: Gltf, partNames: ReadonlySet<string>, edits: ReadonlyMap<string, LessonMaterialOverride>) {
  const nodeIndices: number[] = [];
  const visit = (index: number) => {
    nodeIndices.push(index);
    gltf.nodes[index].children?.forEach(visit);
  };
  const roots = gltf.scenes[gltf.scene ?? 0].nodes ?? [];
  roots.forEach(visit);

  const partNodes = new Set<number>();
  const editedNodes = new Map<number, LessonMaterialOverride>();
  for (const name of partNames) {
    const exact = nodeIndices.filter((index) => gltf.nodes[index].name === name);
    const matches = exact.length ? exact : nodeIndices.filter((index) => {
      const nodeName = gltf.nodes[index].name;
      return nodeName && PropertyBinding.sanitizeNodeName(nodeName) === name;
    });
    const preset = edits.get(name);
    if (preset && matches.length !== 1) throw new Error(`${name} 부품을 GLB에서 한 곳으로 지정할 수 없습니다.`);
    for (const index of matches) partNodes.add(index);
    if (preset) editedNodes.set(matches[0], preset);
  }

  const materials = gltf.materials ??= [];
  const meshCopies = new Map<string, number>();
  const materialCopies = new Map<string, number>();
  function materialIndex(index: number | undefined, preset: LessonMaterialOverride) {
    const key = `${index ?? 'default'}:${preset}`;
    const cached = materialCopies.get(key);
    if (cached !== undefined) return cached;
    const source = index === undefined ? undefined : materials[index];
    const sourcePbr = source?.pbrMetallicRoughness;
    const surface = LESSON_PREVIEW_MATERIALS[preset].surface;
    const { r, g, b } = new Color(surface.color);
    const useAlpha = source?.alphaMode === 'MASK' || source?.alphaMode === 'BLEND';
    const replacement = materials.push({
      name: LESSON_PREVIEW_MATERIALS[preset].label,
      doubleSided: source?.doubleSided, alphaMode: source?.alphaMode, alphaCutoff: source?.alphaCutoff,
      pbrMetallicRoughness: {
        baseColorFactor: [r, g, b, useAlpha ? sourcePbr?.baseColorFactor?.[3] ?? 1 : 1],
        baseColorTexture: useAlpha ? sourcePbr?.baseColorTexture : undefined,
        metallicFactor: surface.metalness, roughnessFactor: surface.roughness,
      },
    }) - 1;
    materialCopies.set(key, replacement);
    return replacement;
  }

  function updateMeshes(index: number, owner?: number) {
    const node = gltf.nodes[index];
    const part = partNodes.has(index) ? index : owner;
    const preset = part === undefined ? undefined : editedNodes.get(part);
    if (preset && part !== undefined && node.mesh !== undefined) {
      // A mesh may be instanced by another part with a different material.
      const key = `${node.mesh}:${preset}`;
      let replacement = meshCopies.get(key);
      if (replacement === undefined) {
        const source = gltf.meshes[node.mesh];
        replacement = gltf.meshes.push({ ...source, primitives: source.primitives.map((primitive) => ({
          ...primitive, material: materialIndex(primitive.material, preset),
        })) }) - 1;
        meshCopies.set(key, replacement);
      }
      node.mesh = replacement;
      updated.add(part);
    }
    node.children?.forEach((child) => updateMeshes(child, part));
  }
  const updated = new Set<number>();
  roots.forEach((root) => updateMeshes(root));
  for (const index of editedNodes.keys()) {
    if (!updated.has(index)) throw new Error(`${gltf.nodes[index].name} 부품에 재질을 적용할 형상이 없습니다.`);
  }
}

export function exportLessonMaterialGlb(bytes: Uint8Array<ArrayBuffer>, partNames: ReadonlySet<string>, edits: ReadonlyMap<string, LessonMaterialOverride>) {
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 20 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== bytes.length || header.getUint32(16, true) !== 0x4e4f534a) {
    throw new Error('재질을 적용할 GLB 형식을 확인해 주세요.');
  }
  const jsonEnd = 20 + header.getUint32(12, true);
  if (jsonEnd > bytes.length || jsonEnd % 4) throw new Error('GLB의 모델 정보를 읽을 수 없습니다.');
  const gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20, jsonEnd))) as Gltf;
  applyMaterials(gltf, partNames, edits);

  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const result = new Uint8Array(20 + paddedLength + bytes.length - jsonEnd);
  result.set(bytes.subarray(0, 20));
  result.set(json, 20);
  result.fill(0x20, 20 + json.length, 20 + paddedLength);
  result.set(bytes.subarray(jsonEnd), 20 + paddedLength);
  const resultHeader = new DataView(result.buffer);
  resultHeader.setUint32(8, result.length, true);
  resultHeader.setUint32(12, paddedLength, true);
  return result;
}
