import { STEP_IMPORTER, type ModelLink, type ReviewModelData, type StepBounds, type StepManifest, type VectorTuple } from './stepTypes';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('STEP 연결 정보의 형식이 올바르지 않습니다.');
  return value as Record<string, unknown>;
}
function text(value: unknown, limit = 10000) {
  if (typeof value !== 'string' || value.length > limit) throw new Error('STEP 이름 또는 식별자가 올바르지 않습니다.');
  return value;
}
function integer(value: unknown, max: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) throw new Error('STEP 형상 정보가 올바르지 않습니다.');
  return value;
}
function bounds(value: unknown): StepBounds {
  const data = record(value);
  const vector = (value: unknown): VectorTuple => {
    if (!Array.isArray(value) || value.length !== 3 || !value.every((item) => typeof item === 'number' && Number.isFinite(item))) throw new Error('STEP 좌표가 올바르지 않습니다.');
    return value as VectorTuple;
  };
  const min = vector(data.min), max = vector(data.max);
  if (min.some((value, axis) => value > max[axis])) throw new Error('STEP 범위가 올바르지 않습니다.');
  return { min, max };
}
export function decodeModelData(value: unknown, linksValue: unknown, knownParts: Set<string>): ReviewModelData {
  if (value === null) {
    if (!Array.isArray(linksValue) || linksValue.length) throw new Error('STEP 원본 정보 없이 연결만 저장할 수 없습니다.');
    return { model: null, modelLinks: [] };
  }
  const data = record(value), sha256 = text(data.sha256, 64);
  if (!/^[a-f0-9]{64}$/.test(sha256) || data.importer !== STEP_IMPORTER || data.unit !== 'mm') throw new Error('지원하지 않거나 다른 버전의 STEP 연결 정보입니다.');
  if (!Array.isArray(data.shapeList) || !data.shapeList.length || data.shapeList.length > 1000) throw new Error('STEP 형상 목록이 올바르지 않습니다.');
  const shapeList = data.shapeList.map((value, index) => {
    const shape = record(value);
    if (shape.id !== 'shape-' + index || shape.meshIndex !== index) throw new Error('STEP 형상 식별자가 일치하지 않습니다.');
    const triangleCount = integer(shape.triangleCount, 1_000_000);
    if (!triangleCount) throw new Error('STEP에 비어 있는 형상이 있습니다.');
    return { id: shape.id as string, name: text(shape.name), path: text(shape.path), meshIndex: index, triangleCount, bounds: bounds(shape.bounds) };
  });
  if (shapeList.reduce((sum, shape) => sum + shape.triangleCount, 0) > 1_000_000) throw new Error('STEP 형상 수가 지원 범위를 초과합니다.');
  const model: StepManifest = { sha256, name: text(data.name), size: integer(data.size, 25 * 1024 * 1024), importer: STEP_IMPORTER, unit: 'mm', shapeList };
  if (!Array.isArray(linksValue) || linksValue.length > shapeList.length) throw new Error('STEP 연결 목록이 올바르지 않습니다.');
  const seen = new Set<string>(), knownShapes = new Set(shapeList.map((shape) => shape.id));
  const modelLinks = linksValue.map((value): ModelLink => {
    const link = record(value), partKey = text(link.partKey), shapeId = text(link.shapeId);
    if (!knownParts.has(partKey) || !knownShapes.has(shapeId) || seen.has(shapeId)) throw new Error('부품번호 또는 3D 형상 연결이 중복되거나 일치하지 않습니다.');
    seen.add(shapeId); return { partKey, shapeId };
  });
  return { model, modelLinks };
}
