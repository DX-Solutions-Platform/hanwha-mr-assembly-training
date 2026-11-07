import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawingPage } from '../types';
import type { ReviewedPart, ReviewGroup } from '../review/reviewTypes';
import { getFieldCandidates } from '../review/reviewModel';
import { cropShapeSource } from './cropShapeSource';
import { OCR_CONFIDENCE_THRESHOLD } from '../ocr/ocrModel';
import {
  readShapeNameResult, SHAPE_NAME_API, SHAPE_NAME_LABEL, SHAPE_NAME_MODEL, type ShapeArea, type ShapeNameModel, type ShapeNameSuggestion,
} from './shapeNameTypes';

type ShapeTarget = { key: string; area?: ShapeArea };
export interface ShapeNameRun {
  groupList: ReviewGroup[];
  model: ShapeNameModel;
  status: 'running' | 'complete' | 'cancelled' | 'error';
  total: number;
  completed: number;
  suggested: number;
  heldKeys: string[];
  heldAreas: ReadonlyMap<string, ShapeArea | undefined>;
  target?: ShapeTarget;
  elapsedMs: number;
  message?: string;
}

export function canSuggestName(group: ReviewGroup, part: ReviewedPart) {
  return part.status === 'draft' && !getFieldCandidates(group, 'name').length && (!part.name.trim() || part.hasTemporaryName);
}

function getDetailPages(group: ReviewGroup, pages: DrawingPage[]) {
  if (!group.partNumber) return [];
  const sourcePages = new Set(group.recordList.filter((record) =>
    record.kind === 'table' || /-label-\d+$/.test(record.id) ||
    (/^\d{5,12}$/.test(group.partNumber) && (!record.source.method || (record.source.confidence ?? 0) >= OCR_CONFIDENCE_THRESHOLD)),
  ).map((record) => record.source.pageNumber));
  return pages.filter((page) => sourcePages.has(page.pageNumber) && page.partList.every((record) => record.partNumber.normalize('NFKC').replace(/\s+/g, ' ').trim() === group.partNumber));
}

type ApplySuggestion = (groupList: ReviewGroup[], key: string, suggestion: ShapeNameSuggestion) => void;

export function useShapeNames(onSuggest: ApplySuggestion) {
  const [run, setRun] = useState<ShapeNameRun | null>(null);
  const currentJob = useRef<{ controller: AbortController; groupList: ReviewGroup[] } | null>(null);
  const stop = useCallback((groups?: ReviewGroup[]) => {
    if (!groups || currentJob.current?.groupList === groups) currentJob.current?.controller.abort();
  }, []);
  useEffect(() => () => stop(), [stop]);

  const start = useCallback((groupList: ReviewGroup[], partList: ReviewedPart[], pages: DrawingPage[], model: ShapeNameModel, target?: ShapeTarget, heldAreas?: ShapeNameRun['heldAreas']) => {
    stop();
    const parts = new Map(partList.map((part) => [part.key, part]));
    const targets = groupList.filter((group) => {
      const part = parts.get(group.key);
      return (!target || target.key === group.key) && part && canSuggestName(group, part);
    });
    if (!targets.length) return;
    const job = { controller: new AbortController(), groupList };
    currentJob.current = job;
    const { signal } = job.controller;
    const started = performance.now();
    const held = new Map(heldAreas);
    let completed = 0, suggested = 0;
    const report = (status: ShapeNameRun['status'], message?: string) => {
      if (currentJob.current === job) setRun({ groupList, model, status, total: targets.length, completed, suggested, heldKeys: [...held.keys()], heldAreas: new Map(held), target, elapsedMs: performance.now() - started, message });
    };
    report('running');
    void (async () => {
      try {
        for (const group of targets) {
          signal.throwIfAborted();
          let wasAnalyzed = false, hasSuggestion = false;
          const area = target?.area;
          const detailPages = area ? pages.filter((page) => page.pageNumber === area.pageNumber) : getDetailPages(group, pages);
          for (const page of detailPages) {
            const crop = await cropShapeSource(page, signal, area?.rect);
            if (!crop) continue;
            const response = await fetch(SHAPE_NAME_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: crop.image, model }),
              signal,
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : '로컬 형상 분석에 실패했습니다.');
            const result = readShapeNameResult(data);
            if (!result || data.model !== model) throw new Error('로컬 형상 분석 응답과 선택한 모델이 일치하지 않습니다.');
            signal.throwIfAborted();
            wasAnalyzed = true;
            if (result.kind === 'plate' && !crop.hasPlateEvidence) continue;
            if (result.kind !== 'unknown') {
              onSuggest(groupList, group.key, {
                kind: result.kind, reason: result.reason, model,
                ...(area ? { selectedArea: true } : {}),
                source: { pageNumber: page.pageNumber, rect: crop.rect, text: 'Qwen 판단 · ' + SHAPE_NAME_LABEL[result.kind] + ' · ' + result.reason },
              });
              suggested++;
              hasSuggestion = true;
              break;
            }
          }
          if (hasSuggestion) held.delete(group.key);
          else if (wasAnalyzed && model === SHAPE_NAME_MODEL) held.set(group.key, area);
          if (area && !wasAnalyzed) throw new Error('선택한 영역에서 형상을 읽지 못했습니다. 부품 윤곽이 보이는 영역을 다시 선택해 주세요.');
          completed++;
          report('running');
        }
        report('complete');
      } catch (reason) {
        if (signal.aborted) report('cancelled');
        else report('error', reason instanceof Error ? reason.message : '로컬 형상 분석에 실패했습니다.');
      }
    })();
  }, [onSuggest, stop]);
  return { run, start, stop };
}
