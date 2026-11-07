'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasFlangeChanges, initialFlangeDraft, parseFlangeDraft, parseFlangeParameters, toFlangeDraft } from './flangeModel';
import { createFlangeRecipe, decodeFlangeRecipe, downloadFlangeFile, flangeFilename, FLANGE_STORAGE_PREFIX } from './flangePersistence';
import { readFlangePdf, releaseFlangeSource } from './readFlangeSource';
import type { FlangeDraft, FlangeSource, FlangeState } from './flangeTypes';
import type { GeneratedFlangeDraft } from './useFlangeDrafts';
import type { ModelAppearance } from '@/features/part-library/modelAppearance';

function storageKey(source: FlangeSource, fromDrawing: boolean) {
  const key = FLANGE_STORAGE_PREFIX + source.document.sha256;
  return fromDrawing ? key + '.' + (source.outline?.key ?? source.values.part.partNumber) : key;
}

export function useFlangeExample(isActive: boolean, initialFile: File | null = null, initialDraft?: GeneratedFlangeDraft) {
  const [state, setState] = useState<FlangeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sourceKind, setSourceKind] = useState<'example' | 'uploaded'>(initialFile || initialDraft ? 'uploaded' : 'example');
  const controllerRef = useRef<AbortController | null>(null);
  const sourceRef = useRef<{ value: FlangeSource; borrowed: boolean } | null>(null);
  const initializedRef = useRef(false);
  const load = useCallback(async (file?: File, supplied?: FlangeSource) => {
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    setIsLoading(true); setError(''); setMessage('PDF 치수를 읽어 3D 모델을 생성하고 있습니다.');
    try {
      let input = file;
      if (!input && !supplied) {
        const response = await fetch('/examples/pdf-model/flange-model-example.pdf', { signal: controller.signal });
        if (!response.ok) throw new Error('예시 PDF를 불러오지 못했습니다. 다시 시도해 주세요.');
        input = new File([await response.blob()], 'flange-model-example.pdf', { type: 'application/pdf' });
      }
      const source = supplied ?? await readFlangePdf(input!, controller.signal);
      if (controller.signal.aborted) { if (!supplied) releaseFlangeSource(source); return false; }
      let applied = source.values, draft = initialFlangeDraft(source), status: FlangeState['status'] = 'draft', confirmedAt = null;
      let appearance: ModelAppearance | undefined;
      let isProportional = !!(source.outline && (!source.outline.hasDiameter || !source.outline.hasThickness));
      let feedback = source.outline ? '정면도 윤곽으로 플랜지를 만들었습니다. 빈 치수를 채운 뒤 원문과 대조해 주세요.' : 'PDF 치수 7개로 3D 모델을 생성했습니다. 원문을 대조하고 수정할 수 있습니다.';
      try {
        const raw = localStorage.getItem(storageKey(source, !!supplied)) ?? (supplied && !source.outline ? localStorage.getItem(storageKey(source, false)) : null);
        if (raw) {
          const restored = decodeFlangeRecipe(raw, source);
          if (!supplied || !source.values.part.partNumber || restored.values.part.partNumber === source.values.part.partNumber) {
            applied = supplied && source.values.part.quantity ? { ...restored.values, part: { ...restored.values.part, quantity: source.values.part.quantity } } : restored.values;
            draft = toFlangeDraft(applied);
            isProportional = false;
            status = restored.status; confirmedAt = restored.confirmedAt; feedback = '이 PDF에 저장한 치수와 3D 생성 결과를 복원했습니다.';
            appearance = restored.appearance;
          }
        }
      } catch { feedback = '저장된 결과를 읽지 못해 PDF 원문 값으로 생성했습니다. JSON을 다시 불러올 수 있습니다.'; }
      if (sourceRef.current && !sourceRef.current.borrowed) releaseFlangeSource(sourceRef.current.value);
      sourceRef.current = { value: source, borrowed: !!supplied };
      setSourceKind(file || supplied ? 'uploaded' : 'example');
      setState({ source, applied, draft, status, confirmedAt, isDirty: false, isProportional, appearance }); setMessage(feedback);
      return true;
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'PDF 모델을 불러오지 못했습니다.'); return false; }
    finally { if (!controller.signal.aborted) setIsLoading(false); }
  }, []);
  useEffect(() => { if (isActive && !initializedRef.current) { initializedRef.current = true; void load(initialFile ?? undefined, initialDraft?.source); } }, [isActive, initialFile, initialDraft, load]);
  useEffect(() => () => {
    initializedRef.current = false; controllerRef.current?.abort();
    if (sourceRef.current && !sourceRef.current.borrowed) releaseFlangeSource(sourceRef.current.value);
    sourceRef.current = null;
  }, []);
  const validation = state ? parseFlangeDraft(state.draft) : { values: null, issues: [] };
  const hasUnapplied = !!state && hasFlangeChanges(state.draft, state.applied);
  const shape = state?.source.outline ? parseFlangeParameters(state.draft.parameters) : null;
  const canApply = !!(shape ? !shape.issues.length : validation.values);
  const update = (draft: FlangeDraft) => {
    setState((value) => value ? { ...value, draft, status: 'draft', confirmedAt: null, isDirty: true } : value);
    setError(''); setMessage('입력값을 수정했습니다. 3D 다시 생성으로 형상에 적용하세요.');
  };
  const updateAppearance = (appearance: ModelAppearance, material: string) => {
    setState((value) => {
      if (!value) return value;
      const part = { ...value.draft.part, material };
      return { ...value, appearance, draft: { ...value.draft, part }, applied: { ...value.applied, part: { ...value.applied.part, material: material.trim() } }, status: 'draft', confirmedAt: null, isDirty: true };
    });
    setError(''); setMessage('외관을 미리보기에 적용했습니다.');
  };
  const apply = () => {
    if (!state || !canApply) return;
    const applied = validation.values ?? (shape ? { parameters: shape.parameters, part: { ...state.draft.part } } : null);
    if (!applied) return;
    setState({ ...state, applied, status: 'draft', confirmedAt: null, isDirty: true, isProportional: false }); setError(''); setMessage('수정한 입력값으로 3D를 다시 생성했습니다. 원문을 대조한 뒤 검토 확정하세요.');
  };
  const reset = () => {
    if (!state) return;
    const outline = state.source.outline;
    setState({ ...state, applied: state.source.values, draft: initialFlangeDraft(state.source), status: 'draft', confirmedAt: null, isDirty: true, isProportional: !!(outline && (!outline.hasDiameter || !outline.hasThickness)) }); setError(''); setMessage(outline ? '처음 인식한 윤곽으로 되돌렸습니다.' : 'PDF 원문 값으로 되돌렸습니다. 저장하면 이전 보정값도 교체됩니다.');
  };
  const confirm = () => {
    if (!state || hasUnapplied || !validation.values) return;
    setState({ ...state, status: 'confirmed', confirmedAt: new Date().toISOString(), isDirty: true }); setError(''); setMessage('모델의 입력값과 형상 검토를 확정했습니다. 저장 버튼으로 보관하세요.');
  };
  const save = () => {
    if (!state) return;
    try {
      localStorage.setItem(storageKey(state.source, !!sourceRef.current?.borrowed), JSON.stringify(createFlangeRecipe(state)));
      setState({ ...state, isDirty: false }); setError(''); setMessage('이 브라우저에 저장했습니다. 같은 PDF를 다시 열면 복원됩니다.');
    } catch { setError('저장하지 못했습니다. 3D에 변경값을 적용했는지 확인하고 JSON 내보내기를 이용해 주세요.'); }
  };
  const exportJson = () => {
    if (!state) return;
    try { downloadFlangeFile(new Blob([JSON.stringify(createFlangeRecipe(state), null, 2)], { type: 'application/json' }), flangeFilename(state.applied.part.partNumber) + '-pdf-model.json'); setError(''); }
    catch (reason) { setError((reason as Error).message); }
  };
  const importJson = async (file: File) => {
    if (!state) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('1 MB 이하의 생성 JSON을 선택해 주세요.');
      const restored = decodeFlangeRecipe(await file.text(), state.source);
      if (sourceRef.current?.value !== state.source) return;
      if (sourceRef.current.borrowed && ((state.source.values.part.partNumber && restored.values.part.partNumber !== state.source.values.part.partNumber) ||
        (state.source.values.part.quantity && restored.values.part.quantity !== state.source.values.part.quantity))) throw new Error('현재 도면의 부품번호와 수량에 맞는 생성 JSON을 선택하세요.');
      setState((value) => value?.source === state.source ? { ...value, applied: restored.values, draft: toFlangeDraft(restored.values), status: restored.status, confirmedAt: restored.confirmedAt, appearance: restored.appearance, isDirty: true, isProportional: false } : value);
      setError(''); setMessage('입력 데이터와 3D 모델을 JSON에서 복원했습니다. 저장 버튼으로 보관하세요.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'JSON을 읽지 못했습니다.'); }
  };
  const exportGlb = async () => {
    if (!state || isExporting) return;
    setIsExporting(true);
    try {
      const recipe = createFlangeRecipe(state);
      const { exportFlangeGlb } = await import('./exportFlangeGlb');
      const unchanged = initialDraft?.source === state.source && recipe.status === 'draft' && !recipe.appearance && !hasFlangeChanges(state.draft, state.source.values);
      downloadFlangeFile(unchanged && initialDraft.glb ? initialDraft.glb : await exportFlangeGlb(recipe), flangeFilename(state.applied.part.partNumber) + '-pdf-model.glb');
      setError(''); setMessage('3D 모델을 GLB로 내보냈습니다. 파일의 길이 단위는 m, 입력 치수는 mm로 기록됩니다.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '3D 내보내기에 실패했습니다.'); }
    finally { setIsExporting(false); }
  };
  return { state, sourceKind, isLoading, isExporting, hasUnapplied, canApply, issues: validation.issues, message, error, load, update, updateAppearance, apply, reset, confirm, save, exportJson, importJson, exportGlb };
}
