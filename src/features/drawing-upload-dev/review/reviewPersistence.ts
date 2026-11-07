import type { DimensionRecord, DrawingPage } from '../types';
import { createPartReview, getFieldCandidates, getReviewIssues, getTemporaryPartName } from './reviewModel';
import type { ReviewDocument, ReviewedDimension, ReviewedPart, ReviewGroup, ReviewPackage } from './reviewTypes';
import { decodeModelData } from '../model/modelPersistence';
import type { ReviewModelData } from '../model/stepTypes';
import { isShapeNameKind, isShapeNameModel, SHAPE_NAME_LABEL, type ShapeNameSuggestion } from '../shape-name/shapeNameTypes';

export const REVIEW_STORAGE_PREFIX = 'hanwha.part-review.v1.';
export function createReviewPackage(document: ReviewDocument, groupList: ReviewGroup[], partList: ReviewedPart[], pageList: DrawingPage[], modelData: ReviewModelData = { model: null, modelLinks: [] }): ReviewPackage {
  return {
    format: 'hanwha-part-review', schemaVersion: 2, document, savedAt: new Date().toISOString(),
    model: modelData.model, modelLinks: modelData.modelLinks,
    parts: partList.map((part) => {
      const group = groupList.find((item) => item.key === part.key)!;
      return { ...part, partNumber: group.partNumber, sourceRecordIdList: group.recordList.map((record) => record.id) };
    }),
    evidence: { partList: pageList.flatMap((page) => page.partList), dimensionList: pageList.flatMap((page) => page.dimensionList), ...(pageList.some((page) => page.ocr) ? { ocrPageList: pageList.flatMap((page) => page.ocr ? [{ ...page.ocr, pageNumber: page.pageNumber }] : []) } : {}) },
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('검토 파일의 형식이 올바르지 않습니다.');
  return value as Record<string, unknown>;
}
function text(value: unknown, limit = 2000): string {
  if (typeof value !== 'string' || value.length > limit) throw new Error('검토 파일의 입력값이 올바르지 않습니다.');
  return value;
}
function date(value: unknown) {
  const result = text(value, 64);
  if (!Number.isFinite(Date.parse(result))) throw new Error('검토 파일의 날짜가 올바르지 않습니다.');
  return result;
}
function readShapeSuggestion(value: unknown, group: ReviewGroup, name: string, pageCount: number): ShapeNameSuggestion {
  const item = object(value), source = object(item.source), rect = object(source.rect);
  const reason = text(item.reason, 240).trim();
  if (!isShapeNameKind(item.kind) || SHAPE_NAME_LABEL[item.kind] !== name || !isShapeNameModel(item.model) || !reason) throw new Error('형상 추정 품명이 올바르지 않습니다.');
  const { x, y, width, height } = rect;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number' || ![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.000001 || y + height > 1.000001) throw new Error('형상 추정의 도면 위치가 올바르지 않습니다.');
  const pageNumber = source.pageNumber;
  if (item.selectedArea !== undefined && item.selectedArea !== true) throw new Error('형상 추정의 영역 선택 정보가 올바르지 않습니다.');
  if (typeof pageNumber !== 'number' || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount ||
    (!item.selectedArea && !group.recordList.some((record) => record.source.pageNumber === pageNumber))) throw new Error('형상 추정의 원문 페이지가 일치하지 않습니다.');
  return { kind: item.kind, model: item.model, reason, ...(item.selectedArea ? { selectedArea: true } : {}), source: { pageNumber, rect: { x, y, width, height }, text: 'Qwen 판단 · ' + name + ' · ' + reason } };
}
export function decodeReview(raw: string, document: ReviewDocument, groupList: ReviewGroup[], dimensionList: DimensionRecord[]) {
  const data = object(JSON.parse(raw));
  if (data.format !== 'hanwha-part-review' || ![1, 2].includes(data.schemaVersion as number)) throw new Error('지원하는 부품 검토 파일이 아닙니다.');
  const source = object(data.document);
  if (source.sha256 !== document.sha256 || source.size !== document.size || source.pageCount !== document.pageCount) throw new Error('현재 PDF와 다른 문서의 검토 결과입니다. 같은 원본 PDF를 선택해 주세요.');
  if (!Array.isArray(data.parts) || data.parts.length !== groupList.length) throw new Error('현재 추출된 부품 구성과 검토 파일이 다릅니다.');
  const knownDimensions = new Set(dimensionList.map((item) => item.id));
  const seenKeys = new Set<string>();
  const partList = data.parts.map((value): ReviewedPart => {
    const item = object(value), key = text(item.key);
    const group = groupList.find((entry) => entry.key === key);
    if (!group || seenKeys.has(key) || item.partNumber !== group.partNumber) throw new Error('부품번호 또는 부품 구성이 일치하지 않습니다.');
    seenKeys.add(key);
    if (!Array.isArray(item.sourceRecordIdList) || item.sourceRecordIdList.length !== group.recordList.length || !group.recordList.every((record) => (item.sourceRecordIdList as unknown[]).includes(record.id))) throw new Error('원문 출처가 현재 추출 결과와 다릅니다.');
    if (!Array.isArray(item.dimensionList) || item.dimensionList.length > 1000) throw new Error('치수 목록이 올바르지 않습니다.');
    const seenDimensions = new Set<string>(), seenSources = new Set<string>();
    const dimensions = item.dimensionList.map((value): ReviewedDimension => {
      const dimension = object(value), id = text(dimension.id, 200);
      if (!id || seenDimensions.has(id)) throw new Error('중복되거나 비어 있는 치수 식별자입니다.');
      seenDimensions.add(id);
      if (dimension.sourceId !== null && (typeof dimension.sourceId !== 'string' || !knownDimensions.has(dimension.sourceId) || seenSources.has(dimension.sourceId))) throw new Error('치수의 원문 출처가 일치하지 않습니다.');
      if (typeof dimension.sourceId === 'string') seenSources.add(dimension.sourceId);
      return { id, sourceId: dimension.sourceId as string | null, value: text(dimension.value, 300), unit: text(dimension.unit, 40) };
    });
    if (typeof item.hasNoDimensions !== 'boolean' || !['draft', 'confirmed'].includes(item.status as string)) throw new Error('검토 상태가 올바르지 않습니다.');
    if (item.hasTemporaryName !== undefined && typeof item.hasTemporaryName !== 'boolean') throw new Error('임시 품명 표시가 올바르지 않습니다.');
    if (item.hasTemporaryName && (getFieldCandidates(group, 'name').length || item.name !== getTemporaryPartName(group))) throw new Error('임시 품명이 현재 부품의 자동 이름과 다릅니다.');
    const name = text(item.name);
    const shapeNameSuggestion = item.shapeNameSuggestion === undefined ? undefined : readShapeSuggestion(item.shapeNameSuggestion, group, name, document.pageCount);
    if (shapeNameSuggestion && item.hasTemporaryName) throw new Error('품명의 출처 표시가 올바르지 않습니다.');
    const part: ReviewedPart = {
      key, name, quantity: text(item.quantity, 100), material: text(item.material),
      ...(item.hasTemporaryName ? { hasTemporaryName: true } : {}),
      ...(shapeNameSuggestion ? { shapeNameSuggestion } : {}),
      ...(item.librarySource === undefined ? {} : { librarySource: text(item.librarySource, 400) }),
      specification: text(item.specification), note: text(item.note, 6000), dimensionList: dimensions,
      hasNoDimensions: item.hasNoDimensions, status: item.status as ReviewedPart['status'],
      confirmedAt: item.confirmedAt === null ? null : date(item.confirmedAt),
    };
    if (part.status === 'confirmed' && (!part.confirmedAt || getReviewIssues(part).length)) throw new Error('확정된 부품에 미완성 검토값이 있습니다.');
    if (part.status === 'draft' && !part.name.trim() && !getFieldCandidates(group, 'name').length) {
      part.name = createPartReview(group).name; part.hasTemporaryName = true;
    }
    if (part.status === 'draft') part.confirmedAt = null;
    return part;
  });
  const modelData = data.schemaVersion === 1 ? { model: null, modelLinks: [] } : decodeModelData(data.model, data.modelLinks, seenKeys);
  return { partList, savedAt: date(data.savedAt), ...modelData };
}
export function downloadReview(payload: ReviewPackage) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url;
  anchor.download = payload.document.name.replace(/\.pdf$/i, '') + '-part-review.json'; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
