import type { ReviewedPart } from '../review/reviewTypes';
import { sameStepModel } from './stepModel';
import type { ReviewModelData, StepManifest } from './stepTypes';

export function bindStepShape(data: ReviewModelData, partList: ReviewedPart[], partKey: string, shapeId: string, manifest: StepManifest): ReviewModelData {
  const part = partList.find((entry) => entry.key === partKey);
  if (!part || part.status !== 'confirmed') throw new Error('먼저 해당 부품의 검토를 확정해 주세요.');
  if (!manifest.shapeList.some((shape) => shape.id === shapeId)) throw new Error('선택한 3D 형상이 현재 STEP에 없습니다.');
  const matches = sameStepModel(data.model, manifest);
  if (!matches && data.modelLinks.length) throw new Error('저장된 연결과 다른 STEP입니다. 새 모델로 연결을 시작할지 먼저 선택해 주세요.');
  const links = matches ? data.modelLinks : [];
  const owner = links.find((link) => link.shapeId === shapeId);
  if (owner && owner.partKey !== partKey) throw new Error('이미 다른 부품번호에 연결된 형상입니다. 기존 연결을 먼저 해제해 주세요.');
  return { model: manifest, modelLinks: owner ? links : [...links, { partKey, shapeId }] };
}
export function unbindStepShape(data: ReviewModelData, manifest: StepManifest, shapeId: string): ReviewModelData {
  if (!sameStepModel(data.model, manifest)) throw new Error('저장된 연결과 같은 STEP을 먼저 올려 주세요.');
  return { model: data.model, modelLinks: data.modelLinks.filter((link) => link.shapeId !== shapeId) };
}
