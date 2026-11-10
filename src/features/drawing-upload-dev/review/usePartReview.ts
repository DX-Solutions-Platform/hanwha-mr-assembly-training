'use client';
import { useCallback, useEffect, useState } from 'react';
import type { AnalysisStatus, DrawingPage } from '../types';
import { createPartReview, getReviewIssues, groupParts, revisePart } from './reviewModel';
import { createReviewPackage, decodeReview, downloadReview, REVIEW_STORAGE_PREFIX } from './reviewPersistence';
import type { ReviewDocument, ReviewedPart, ReviewGroup } from './reviewTypes';
import { bindStepShape, unbindStepShape } from '../model/modelBindings';
import type { ReviewModelData, StepManifest } from '../model/stepTypes';
import { buildBulkReviewPlan, confirmReadyParts, type BulkReviewOptions } from './bulk/bulkReviewModel';
import { canSuggestName, useShapeNames } from '../shape-name/useShapeNames';
import { AWQ_SHAPE_NAME_MODEL, DEFAULT_SHAPE_NAME_MODEL, SHAPE_NAME_LABEL, type ShapeArea, type ShapeNameModel, type ShapeNameSuggestion } from '../shape-name/shapeNameTypes';
import { applyLibraryMatch, lookupLibrary } from './libraryReview';
import type { LibraryMatch } from '@/features/part-library/libraryTypes';
import { readOutlineFlangeLinks, storeOutlineFlangeLink, type OutlineFlangeLink } from '../generate/outlineFlangeLinks';

interface ReviewState extends ReviewModelData {
  file: File; document: ReviewDocument; groupList: ReviewGroup[]; partList: ReviewedPart[];
  isDirty: boolean; savedAt: string | null; message: string; isError: boolean;
  libraryMatches: Map<string, LibraryMatch>;
  existingLibraryModels: Set<string> | null;
  outlineLinks: OutlineFlangeLink[];
}
export function usePartReview(file: File | null, pageList: DrawingPage[], status: AnalysisStatus, model: ShapeNameModel | null = DEFAULT_SHAPE_NAME_MODEL) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [loadError, setLoadError] = useState<{ file: File; message: string } | null>(null);
  const acceptShapeName = useCallback((groups: ReviewGroup[], key: string, suggestion: ShapeNameSuggestion) => {
    setState((value) => {
      if (!value || value.groupList !== groups) return value;
      const group = groups.find((entry) => entry.key === key);
      const part = value.partList.find((entry) => entry.key === key);
      if (!group || !part || !canSuggestName(group, part)) return value;
      const next = { ...revisePart(part, { name: SHAPE_NAME_LABEL[suggestion.kind] }), shapeNameSuggestion: suggestion };
      return { ...value, isDirty: true, partList: value.partList.map((entry) => entry.key === key ? next : entry) };
    });
  }, []);
  const { run, start: startShapeNames, stop: stopShapeNames } = useShapeNames(acceptShapeName);
  useEffect(() => {
    if (!file || status !== 'complete') return;
    let isCurrent = true;
    const lookup = new AbortController();
    void (async () => {
      try {
        const bytes = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        if (!isCurrent) return;
        const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        const document = { sha256, name: file.name, size: file.size, pageCount: pageList.length };
        const groupList = groupParts(pageList);
        const outlineLinks = readOutlineFlangeLinks(sha256);
        let partList = groupList.map(createPartReview), savedAt = null, message = '', isError = false;
        let modelData: ReviewModelData = { model: null, modelLinks: [] };
        try {
          const raw = localStorage.getItem(REVIEW_STORAGE_PREFIX + sha256);
          if (raw) {
            const saved = decodeReview(raw, document, groupList, pageList.flatMap((page) => page.dimensionList));
            partList = saved.partList; savedAt = saved.savedAt; message = '같은 PDF에 저장된 검토 결과를 복원했습니다.';
            modelData = { model: saved.model, modelLinks: saved.modelLinks };
          }
        } catch { message = '이전에 저장된 검토를 읽지 못했습니다. 새 검토를 진행하거나 JSON 파일을 불러와 주세요.'; isError = true; }
        let filled = 0;
        let libraryMatches = new Map<string, LibraryMatch>();
        let existingLibraryModels: Set<string> | null = null;
        if (isCurrent) {
          try {
            const library = await lookupLibrary(groupList, lookup.signal, outlineLinks.map(({ partNumber }) => partNumber));
            libraryMatches = library.matches;
            existingLibraryModels = library.existingModelNumbers;
            if (!savedAt) partList = partList.map((part, index) => {
              const group = groupList[index];
              const next = applyLibraryMatch(part, group, libraryMatches.get(group.partNumber));
              if (next !== part) filled++;
              return next;
            });
            if (filled && !message) message = '라이브러리에서 ' + filled + '종의 빈 항목을 채웠습니다. 새 도면과 대조해 주세요.';
          } catch {
            if (!lookup.signal.aborted && !message) message = '라이브러리를 조회하지 못했습니다. 도면 추출값으로 검토할 수 있습니다.';
          }
        }
        if (isCurrent) {
          setState({ file, document, groupList, partList, savedAt, isDirty: filled > 0, message, isError, libraryMatches, existingLibraryModels, outlineLinks, ...modelData });
          setLoadError(null);
          if (model) startShapeNames(groupList, partList, pageList, model);
        }
      } catch {
        if (isCurrent) setLoadError({ file, message: '문서 식별에 실패했습니다. PDF를 다시 분석해 주세요. HTTPS 또는 localhost에서 사용할 수 있습니다.' });
      }
    })();
    return () => { isCurrent = false; lookup.abort(); stopShapeNames(); };
  }, [file, pageList, status, model, startShapeNames, stopShapeNames]);
  const current = state?.file === file && status === 'complete' ? state : null;
  const linkRegisteredModel = (document: ReviewDocument, match: LibraryMatch, link?: OutlineFlangeLink) => {
    let savedLink = true;
    try { if (link) storeOutlineFlangeLink(document.sha256, link); }
    catch { savedLink = false; }
    setState((value) => value?.document.sha256 === document.sha256 ? {
      ...value, libraryMatches: new Map(value.libraryMatches).set(match.partNumber, match),
      existingLibraryModels: new Set(value.existingLibraryModels).add(match.partNumber),
      outlineLinks: link ? [...value.outlineLinks.filter((entry) => entry.key !== link.key), link] : value.outlineLinks,
      message: savedLink ? match.partNumber + ' GLB를 라이브러리에 등록하고 현재 도면에 연결했습니다.' : 'GLB를 등록했습니다. 이 브라우저에는 도면 연결을 저장하지 못했습니다.',
      isError: !savedLink,
    } : value);
  };
  const updatePart = useCallback((key: string, patch: Partial<ReviewedPart>) => {
    setState((value) => value ? { ...value, isDirty: true, message: '', isError: false, partList: value.partList.map((part) => part.key === key ? revisePart(part, patch) : part) } : value);
  }, []);
  const confirmPart = useCallback((key: string) => {
    setState((value) => value ? {
      ...value, isDirty: true, message: '', isError: false,
      partList: value.partList.map((part) => part.key === key && !getReviewIssues(part).length ? { ...part, status: 'confirmed', confirmedAt: new Date().toISOString() } : part),
    } : value);
  }, []);
  const applyBulk = useCallback((options: BulkReviewOptions) => {
    setState((value) => {
      if (!value) return value;
      const plan = buildBulkReviewPlan(value.groupList, value.partList, options);
      if (plan.warnings.length) return { ...value, message: plan.warnings.join(' '), isError: true };
      if (!plan.changes.length) return value;
      return { ...value, isDirty: true, isError: false, message: plan.changes.length + '종의 부품 정보를 일괄 적용했습니다. 원문과 대조한 후 확정하세요.', partList: value.partList.map((part) => plan.changes.find((change) => change.key === part.key)?.after ?? part) };
    });
  }, []);
  const confirmMany = useCallback((keys: string[]) => {
    setState((value) => {
      if (!value) return value;
      const partList = confirmReadyParts(value.partList, keys, new Date().toISOString());
      const count = partList.filter((part, index) => part !== value.partList[index]).length;
      return count ? { ...value, partList, isDirty: true, isError: false, message: count + '종을 일괄 검토 확정했습니다. 검토 결과 저장으로 보관하세요.' } : value;
    });
  }, []);
  const save = useCallback(() => {
    if (!current) return false;
    try {
      const payload = createReviewPackage(current.document, current.groupList, current.partList, pageList, current);
      localStorage.setItem(REVIEW_STORAGE_PREFIX + current.document.sha256, JSON.stringify(payload));
      setState((value) => value === current ? { ...value, isDirty: false, savedAt: payload.savedAt, message: '이 브라우저에 저장했습니다. 같은 PDF를 다시 올리면 복원됩니다.', isError: false } : value);
      return true;
    } catch {
      setState((value) => value === current ? { ...value, message: '브라우저에 저장하지 못했습니다. JSON 내보내기로 파일을 저장해 주세요.', isError: true } : value);
      return false;
    }
  }, [current, pageList]);
  const exportFile = useCallback(() => {
    if (current) downloadReview(createReviewPackage(current.document, current.groupList, current.partList, pageList, current));
  }, [current, pageList]);
  const importFile = useCallback(async (source: File) => {
    if (!current) return;
    try {
      if (source.size > 10 * 1024 * 1024) throw new Error('10 MB 이하의 검토 JSON을 선택해 주세요.');
      const restored = decodeReview(await source.text(), current.document, current.groupList, pageList.flatMap((page) => page.dimensionList));
      stopShapeNames(current.groupList);
      setState((value) => value?.groupList === current.groupList ? { ...value, partList: restored.partList, model: restored.model, modelLinks: restored.modelLinks, isDirty: true, message: '검토 JSON을 불러왔습니다. 저장 버튼으로 이 브라우저에도 저장하세요.', isError: false } : value);
    } catch (reason) {
      setState((value) => value?.file === current.file ? { ...value, message: reason instanceof Error ? reason.message : '검토 JSON을 불러오지 못했습니다.', isError: true } : value);
    }
  }, [current, pageList, stopShapeNames]);
  const bind = useCallback((partKey: string, shapeId: string, manifest: StepManifest) => {
    setState((value) => {
      if (!value) return value;
      try { return { ...value, ...bindStepShape(value, value.partList, partKey, shapeId, manifest), isDirty: true, message: '', isError: false }; }
      catch (reason) { return { ...value, message: reason instanceof Error ? reason.message : '연결하지 못했습니다.', isError: true }; }
    });
  }, []);
  const unbind = useCallback((shapeId: string, manifest: StepManifest) => {
    setState((value) => {
      if (!value) return value;
      try { return { ...value, ...unbindStepShape(value, manifest, shapeId), isDirty: true, message: '', isError: false }; }
      catch (reason) { return { ...value, message: reason instanceof Error ? reason.message : '연결을 해제하지 못했습니다.', isError: true }; }
    });
  }, []);
  const replaceModel = useCallback((manifest: StepManifest) => {
    setState((value) => value ? { ...value, model: manifest, modelLinks: [], isDirty: true, message: '새 STEP으로 연결을 시작합니다. 기존 모델의 연결을 초기화했습니다.', isError: false } : value);
  }, []);
  const shapeNameRun = run && run.groupList === current?.groupList ? run : null;
  const retryShapeNames = () => {
    if (current && shapeNameRun) startShapeNames(current.groupList, current.partList, pageList, shapeNameRun.model, shapeNameRun.target, shapeNameRun.heldAreas);
  };
  const retryWithAwq = (key: string) => {
    if (current && shapeNameRun?.status !== 'running' && shapeNameRun?.heldKeys.includes(key)) {
      startShapeNames(current.groupList, current.partList, pageList, AWQ_SHAPE_NAME_MODEL, { key, area: shapeNameRun.heldAreas.get(key) }, shapeNameRun.heldAreas);
    }
  };
  const suggestFromArea = (key: string, area: ShapeArea) => {
    if (current && model && shapeNameRun?.status !== 'running') {
      startShapeNames(current.groupList, current.partList, pageList, model, { key, area }, shapeNameRun?.heldAreas);
    }
  };
  return { current, isPreparing: !!file && status === 'complete' && !current && loadError?.file !== file, loadError: loadError?.file === file ? loadError.message : '', updatePart, confirmPart, applyBulk, confirmMany, save, exportFile, importFile, bind, unbind, replaceModel, shapeNameRun, stopShapeNames, retryShapeNames, retryWithAwq, suggestFromArea: model ? suggestFromArea : undefined, linkRegisteredModel };
}
