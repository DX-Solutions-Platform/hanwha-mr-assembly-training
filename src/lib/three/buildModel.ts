import * as THREE from 'three';
import type { ModelSpec, PartSpec } from '@/types/model';
import { getModelMaterial } from './modelMaterials';
import { createShapeGeometry } from './createShapeGeometry';
import { createRepeatMatrixList } from './repeatMatrixList';
import { attachHairlineEdges } from './hairlineEdges';

export interface BuiltPart {
  object: THREE.Object3D;
  name: string; spec: string; sectionIndex: number;
  basePosition: THREE.Vector3; baseRotationY: number;
  /** 1단계(구간) 펼침 방향 · 2단계(구간 안 부품) 펼침 방향 */
  sectionOffset: THREE.Vector3; partOffset: THREE.Vector3;
  spinSign: number; staggerSec: number;
}

export interface BuiltModel { root: THREE.Group; partList: BuiltPart[]; sectionCenterList: THREE.Vector3[]; size: THREE.Vector3; }

const DIAGONAL_AXIS = new THREE.Vector3(0.55, 1, 0.35).normalize();

function createPartObject(partSpec: PartSpec): THREE.Object3D {
  const geometry = createShapeGeometry(partSpec.shape, partSpec.size);
  const material = getModelMaterial(partSpec.material);
  if (partSpec.repeat) {
    const matrixList = createRepeatMatrixList(partSpec.repeat);
    const instanced = new THREE.InstancedMesh(geometry, material, matrixList.length);
    matrixList.forEach((matrix, itemIndex) => instanced.setMatrixAt(itemIndex, matrix));
    instanced.computeBoundingSphere();
    return instanced;
  }
  const mesh = new THREE.Mesh(geometry, material);
  attachHairlineEdges(mesh);
  return mesh;
}

/** 데이터(ModelSpec)로 모델을 만들고 부품별 펼침 방향을 계산합니다 */
export function buildModel(modelSpec: ModelSpec): BuiltModel {
  const root = new THREE.Group();
  const sectionCount = modelSpec.sectionList.length;
  const sectionSumList = Array.from({ length: sectionCount }, () => ({ sum: new THREE.Vector3(), count: 0 }));
  const partList: BuiltPart[] = modelSpec.partList.map((partSpec, partIndex) => {
    const object = createPartObject(partSpec);
    const holder = new THREE.Group();
    const inner = new THREE.Group();
    inner.add(object);
    if (partSpec.rotation) inner.rotation.set(...partSpec.rotation);
    if (partSpec.scale) inner.scale.set(...partSpec.scale);
    holder.add(inner);
    holder.position.set(...partSpec.position);
    holder.userData = { partIndex, sectionIndex: partSpec.sectionIndex };
    object.userData = holder.userData;
    root.add(holder);
    const sectionSum = sectionSumList[partSpec.sectionIndex];
    if (sectionSum) { sectionSum.sum.add(holder.position); sectionSum.count++; }
    return {
      object: holder, name: partSpec.name, spec: partSpec.spec ?? '', sectionIndex: partSpec.sectionIndex,
      basePosition: holder.position.clone(), baseRotationY: holder.rotation.y,
      sectionOffset: new THREE.Vector3(), partOffset: new THREE.Vector3(),
      spinSign: partIndex % 2 ? 1 : -1, staggerSec: 0,
    };
  });

  const bounds = new THREE.Box3().setFromObject(root);
  const modelCenter = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const sectionCenterList = sectionSumList.map((item) => (item.count ? item.sum.divideScalar(item.count) : modelCenter.clone()));
  const scale = modelSpec.explodeScale;

  partList.forEach((part, partIndex) => {
    const partSpec = modelSpec.partList[partIndex];
    const sectionSpec = modelSpec.sectionList[part.sectionIndex];
    const sectionCenter = sectionCenterList[part.sectionIndex];
    if (sectionSpec?.explode) part.sectionOffset.set(...sectionSpec.explode).multiplyScalar(scale);
    else if (modelSpec.explodeMode === 'diagonal') part.sectionOffset.copy(DIAGONAL_AXIS).multiplyScalar((part.sectionIndex - (sectionCount - 1) / 2) * scale);
    else part.sectionOffset.copy(sectionCenter).sub(modelCenter).setY((sectionCenter.y - modelCenter.y) * 0.6).normalize().multiplyScalar(scale);
    const withinSection = part.basePosition.clone().sub(sectionCenter);
    if (partSpec.explode) part.partOffset.set(...partSpec.explode);
    else part.partOffset.copy(withinSection.lengthSq() > 1e-6 ? withinSection.normalize() : new THREE.Vector3(0, 1, 0)).multiplyScalar(scale * 0.35);
    part.staggerSec = (modelSpec.explodeMode === 'diagonal' ? part.sectionIndex : partIndex % 6) * 0.045;
  });

  return { root, partList, sectionCenterList, size };
}
