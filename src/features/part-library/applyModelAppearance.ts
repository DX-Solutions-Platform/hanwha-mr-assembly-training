import { Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three';
import { appearanceSurface, type ModelAppearance } from './modelAppearance';

export function applyModelAppearance(scene: Object3D, appearance: ModelAppearance, cloneMaterials = false) {
  const surface = appearanceSurface(appearance);
  const copies = new Map<Material, Material>();
  const apply = (original: Material) => {
    const existing = copies.get(original);
    if (existing) return existing;
    const material = cloneMaterials ? original.clone() : original;
    if (material instanceof MeshStandardMaterial) {
      material.color.set(surface.color); material.roughness = surface.roughness; material.metalness = surface.metalness;
    } else if ('color' in material && material.color && typeof material.color === 'object' && 'set' in material.color) {
      (material.color as MeshStandardMaterial['color']).set(surface.color);
    }
    material.needsUpdate = true;
    copies.set(original, material);
    return material;
  };
  scene.traverse((object) => {
    if (object instanceof Mesh) object.material = Array.isArray(object.material) ? object.material.map(apply) : apply(object.material);
  });
  return () => { if (cloneMaterials) for (const material of copies.values()) material.dispose(); };
}
