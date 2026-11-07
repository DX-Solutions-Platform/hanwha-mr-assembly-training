'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Matrix4 } from 'three';
import { createAssemblyExample } from './assemblyTemplate';
import { isAssemblyDraftChanged, previewAssemblyDraft, sameAssemblyParts, toAssemblyDraft } from './assemblyModel';
import { freeAssemblyPart, resolveAssembly } from './assemblyTransforms';
import { assemblyStorageKey, decodeAssembly } from './assemblyPersistence';
import { downloadFlangeFile } from '../generate/flangePersistence';
import type { AssemblyDocument, AssemblyDraft, ConnectionType } from './assemblyTypes';

interface EditorState { document: AssemblyDocument; baseline: AssemblyDocument; drafts: Record<string, AssemblyDraft>; selectedId: string; hasSaved: boolean; }
function createState(document: AssemblyDocument, baseline = document, hasSaved = false, selectedId = 'flange'): EditorState {
  return { document, baseline, drafts: Object.fromEntries(document.partList.map((part) => [part.id, toAssemblyDraft(part)])), selectedId: document.partList.some((part) => part.id === selectedId) ? selectedId : document.partList[0].id, hasSaved };
}
export function useAssemblyEditor(isActive: boolean, seed?: AssemblyDocument, saveReview?: () => boolean) {
  const [state, setState] = useState<EditorState | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const initialized = useRef(false), loadVersion = useRef(0);
  const storageKey = assemblyStorageKey(seed);
  useEffect(() => {
    if (!isActive || initialized.current) return;
    initialized.current = true; const version = ++loadVersion.current;
    void Promise.resolve().then(() => {
      if (version !== loadVersion.current) return;
      let document = seed ?? createAssemblyExample(), hasSaved = false, feedback = '부품을 선택하고 값을 바꿔 보세요. 3D에 바로 반영됩니다.';
      try { const raw = localStorage.getItem(storageKey); if (raw) { document = decodeAssembly(raw, seed, true); hasSaved = true; feedback = '저장한 조립품을 복원했습니다.'; } }
      catch (reason) {
        feedback = seed ? (reason instanceof Error ? reason.message + ' ' : '') + '현재 모델로 배치했습니다. 기존 저장값은 유지됩니다.' : '저장값을 읽지 못해 기본 예시를 열었습니다. 기존 저장값은 유지됩니다.';
      }
      setState(createState(document, document, hasSaved)); setMessage(feedback);
    });
  }, [isActive, seed, storageKey]);
  useEffect(() => () => { initialized.current = false; loadVersion.current++; }, []);
  const document = state?.document;
  const matrices = useMemo(() => document ? resolveAssembly(document) : new Map<string, Matrix4>(), [document]);
  const selected = document?.partList.find((part) => part.id === state?.selectedId);
  const draft = state && selected ? state.drafts[selected.id] : null;
  const preview = document && selected && draft ? previewAssemblyDraft(document, selected.id, draft) : { document: null, issues: [] };
  const pendingIds = state ? state.document.partList.filter((part) => isAssemblyDraftChanged(part, state.drafts[part.id])).map((part) => part.id) : [];
  const isDirty = !!state && (!!pendingIds.length || !sameAssemblyParts(state.document.partList, state.baseline.partList));
  const update = (next: AssemblyDraft) => {
    setState((value) => {
      if (!value) return value;
      const result = previewAssemblyDraft(value.document, value.selectedId, next);
      return { ...value, document: result.document ? { ...result.document, updatedAt: new Date().toISOString() } : value.document, drafts: { ...value.drafts, [value.selectedId]: next } };
    }); setError(''); setMessage('');
  };
  const select = (id: string) => { setState((value) => value?.document.partList.some((part) => part.id === id) ? { ...value, selectedId: id } : value); setError(''); };
  const changeType = (type: ConnectionType) => {
    if (!state || !selected || !draft) return;
    if (type === 'free') { update(toAssemblyDraft(freeAssemblyPart(selected, matrices.get(selected.id)!))); return; }
    if (selected.model) {
      const isDescendant = (id: string): boolean => {
        const parent = state.document.partList.find((part) => part.id === id)?.relation.parentId;
        return !!parent && (parent === selected.id || isDescendant(parent));
      };
      const parent = state.document.partList.find((part) => part.id !== selected.id && !isDescendant(part.id));
      if (parent) update({ position: ['0', '0', '0'], rotation: ['0', '0', '0'], relation: { type: 'fixed', parentId: parent.id, targetAnchorId: 'top', ownAnchorId: 'bottom' } });
      else setError('먼저 다른 부품의 결합을 풀고 기준 부품을 선택해 주세요.');
      return;
    }
    const parentId = type === 'thread' ? 'bolt-1' : type === 'insert' ? 'flange' : 'base';
    update({ position: ['0', '0', '0'], rotation: ['0', '0', '0'], relation: { type, parentId, targetAnchorId: type === 'thread' ? 'nut-seat' : type === 'insert' ? 'hole-1-top' : 'top', ownAnchorId: selected.kind === 'flange' ? 'bottom' : selected.kind === 'bolt' ? 'seat' : selected.kind === 'nut' ? 'top' : 'origin' } });
  };
  const undo = () => { if (selected && state) { setState({ ...state, drafts: { ...state.drafts, [selected.id]: toAssemblyDraft(selected) } }); setError(''); setMessage('마지막 정상 입력값으로 되돌렸습니다.'); } };
  const snap = () => { if (draft && draft.relation.type !== 'free') update({ ...draft, position: ['0', '0', '0'], rotation: ['0', '0', '0'] }); };
  const save = () => {
    if (!state || pendingIds.length) return;
    if (saveReview && !saveReview()) {
      setError('도면의 검토값을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');
      return;
    }
    try {
      const saved = { ...state.document, updatedAt: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify(saved));
      setState({ ...state, document: saved, baseline: saved, hasSaved: true }); setError(''); setMessage('조립품을 이 브라우저에 저장했습니다.');
    } catch { setError('저장하지 못했습니다. 더보기에서 파일로 내보내 보관할 수 있습니다.'); }
  };
  const restore = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) { setMessage('아직 저장한 조립품이 없습니다.'); setError(''); return; }
      const saved = decodeAssembly(raw, seed, true);
      setState(createState(saved, saved, true, state?.selectedId)); setError(''); setMessage('마지막 저장 상태로 되돌렸습니다.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '저장값을 읽지 못했습니다.'); }
  };
  const reset = () => { const initial = seed ?? createAssemblyExample(); setState(createState(initial, state?.baseline ?? initial, state?.hasSaved)); setError(''); setMessage(seed ? '처음 배치로 되돌렸습니다. 저장하면 이 상태로 보관됩니다.' : '기본 예시로 되돌렸습니다. 저장하면 이 상태로 보관됩니다.'); };
  const exportJson = () => {
    if (!document || pendingIds.length) return;
    downloadFlangeFile(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }), seed ? seed.name.replace(/\.pdf$/i, '') + '-assembly.json' : 'flange-base-assembly.json');
  };
  const importJson = async (file: File) => {
    try {
      if (file.size > 1024 * 1024) throw new Error('1 MB 이하의 조립품 JSON을 선택하세요.');
      const imported = decodeAssembly(await file.text(), seed);
      setState((value) => createState(imported, value?.baseline ?? seed ?? createAssemblyExample(), value?.hasSaved)); setError(''); setMessage('파일을 불러왔습니다. 저장하면 다음에도 이어서 사용할 수 있습니다.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '조립품 JSON을 읽지 못했습니다.'); }
  };
  return { state: state ? { ...state, isDirty } : null, document, selected, draft, matrices, pendingIds, isDirty, issues: preview.issues, message, error, update, select, changeType, undo, snap, save, restore, reset, exportJson, importJson };
}
