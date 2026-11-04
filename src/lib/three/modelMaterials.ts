import * as THREE from 'three';
import type { MaterialKey } from '@/types/model';

type MaterialRecipe = [color: number, metalness: number, roughness: number, opacity?: number];

const MATERIAL_RECIPE: Record<MaterialKey, MaterialRecipe> = {
  steel: [0xc9d1d8, 0.9, 0.25], darkSteel: [0x3a3f45, 0.7, 0.4], aluminum: [0xb8bec6, 0.75, 0.3],
  paintBlue: [0x2f5d9e, 0.35, 0.45], paintOrange: [0xf37321, 0.3, 0.5], paintWhite: [0xe8ebee, 0.2, 0.45],
  rubber: [0x16181a, 0, 0.9], copper: [0xc77a3a, 0.85, 0.3], glass: [0x1c2530, 0.2, 0.08, 0.55],
  wood: [0xdcc39a, 0, 0.75], woodDark: [0xc9ad80, 0, 0.8], plastic: [0x2a2d31, 0.1, 0.6],
  pcb: [0x1f4d3a, 0.2, 0.55], carbon: [0x1d2024, 0.4, 0.5], battery: [0x3b4248, 0.4, 0.5],
};

const materialCache = new Map<MaterialKey, THREE.MeshStandardMaterial>();

/** 같은 재질은 1개만 만들어 공유 (드로우 상태 변경·메모리 최소화) */
export function getModelMaterial(materialKey: MaterialKey): THREE.MeshStandardMaterial {
  const cached = materialCache.get(materialKey);
  if (cached) return cached;
  const [color, metalness, roughness, opacity = 1] = MATERIAL_RECIPE[materialKey];
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: opacity < 1, opacity });
  materialCache.set(materialKey, material);
  return material;
}

/** R 와이어프레임: 면을 숨기고 모서리 선만 남김 */
export function setSurfaceVisible(isVisible: boolean) {
  materialCache.forEach((material) => { material.visible = isVisible; });
}
