'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { BackButton } from '@/components/common/BackButton';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Stage } from '@/components/common/Stage';
import { TrainingToolNavigation } from '@/components/common/TrainingToolNavigation';
import { NURI_MANUAL_ID, NURI_MANUAL_ZIP, registerNuriManual, useRegisteredNuriManual } from '@/store/demoManualRegistration';
import { ReviewBody, ReviewHeader, ReviewInput, ReviewLabel, ReviewPanel, ReviewTextArea, ReviewTitle } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted, StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { encodeVrLesson, packVrLesson, readVrLessonArchive, VR_LESSON_MAX_MB } from '../practice/vrLessonArchive';
import { completionText, lessonRecord, lessonText as displayText, previewActions, previewAssets, previewParts } from './lessonPreviewData';
import { LessonStepPreview } from './LessonStepPreview';
import type { LessonMaterialId, LessonMaterialOverride } from './lessonPreviewMaterials';
import type { LessonMaterialEdits } from './exportLessonMaterials';
import { LessonActionEditor } from './LessonActionEditor';
import { applyLessonActionChange, synchronizeTurnText, type LessonActionChange } from './lessonActionEdit';
import { LessonDrawingProgress } from './LessonDrawingProgress';
import { LessonDrawingPreview } from './LessonDrawingPreview';
import { LessonImportProgress } from './LessonImportProgress';
import { QuestExportDialog } from './QuestExportDialog';
import { saveFile } from './trainingMaterialsArchive';
import { drawingStepKey } from './preparedLessonFigures';
import { demoLessonCopy } from './demoLessonCopy';
import { paceDemoProgress } from './demoProgressTiming';
import type { DrawingProgress, LessonDrawingSection } from './lessonDrawingPdf';

type Localized = string | Record<string, string>;
type EditableManual = { title?: Localized; instruction?: Localized; caution?: Localized };
type Manual = EditableManual & { checkpoints?: unknown };
type LessonStep = { id: string; manual?: Manual; actions?: unknown[]; prerequisiteStepIds?: string[]; completedWhen?: string };
type StepArea = { steps?: LessonStep[]; stepOrder?: string[]; assets?: unknown; parts?: unknown };
type Lesson = StepArea & {
  trainingId: string;
  contentVersion: string;
  title?: Localized;
  summary?: Localized;
  defaultLocale?: string;
  modes?: unknown;
  modules?: { id: string; name?: Localized; detail?: StepArea }[];
};
type Package = Awaited<ReturnType<typeof readVrLessonArchive>>;
type LoadedLesson = { sourceZip: File; archive: Package; lesson: Lesson };
type LessonSelection = { moduleId?: string; stepId?: string };
type PackedLesson = { lesson: Lesson; zip: Blob; zipName: string };
type WorkspaceMode = 'editor' | 'demo-edit' | 'demo-create';

let demoEditHandoff: LoadedLesson | undefined;

function stepSequence(area: StepArea) {
  const byId = new Map(area.steps?.map((step) => [step.id, step]));
  const order = [...new Set([...(area.stepOrder ?? []), ...byId.keys()])].filter((id) => byId.has(id));
  return { byId, order };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasEditableSteps(value: unknown): boolean {
  return isRecord(value) && (value.steps === undefined || (Array.isArray(value.steps)
    && value.steps.every((step) => isRecord(step) && typeof step.id === 'string' && (step.manual === undefined || isRecord(step.manual)))
    && new Set(value.steps.map((step) => step.id)).size === value.steps.length))
    && (value.stepOrder === undefined || (Array.isArray(value.stepOrder)
      && value.stepOrder.every((id) => typeof id === 'string') && new Set(value.stepOrder).size === value.stepOrder.length));
}

function readLesson({ lesson, manifest }: Package): Lesson {
  if (!isRecord(lesson) || lesson.trainingId !== manifest.trainingId || lesson.contentVersion !== manifest.contentVersion ||
    !hasEditableSteps(lesson) || (lesson.modules !== undefined && (!Array.isArray(lesson.modules) ||
      !lesson.modules.every((module) => isRecord(module) && typeof module.id === 'string'
        && (module.detail === undefined || hasEditableSteps(module.detail)))))) {
    throw new Error('교육 ZIP의 식별 정보 또는 단계 구성을 확인해 주세요.');
  }
  return lesson as Lesson;
}

function writeText(previous: Localized | undefined, locale: string, value: string) {
  return typeof previous === 'string' ? value : { ...previous, [locale]: value };
}

function nextVersion(version: string) {
  const [major, minor, patch] = version.split('.');
  return `${major}.${minor}.${BigInt(patch) + 1n}`;
}

export function TrainingLessonEditor({ mode = 'editor', openRegistered = false, openCreated = false, initialSelection }: {
  mode?: WorkspaceMode;
  openRegistered?: boolean;
  openCreated?: boolean;
  initialSelection?: LessonSelection;
}) {
  const input = useRef<HTMLInputElement>(null);
  const loading = useRef<AbortController | null>(null);
  const openedLesson = useRef<LoadedLesson>(undefined);
  const [loaded, setLoaded] = useState<LoadedLesson & { initialSelection?: LessonSelection }>();
  const [loadId, setLoadId] = useState(0);
  const [pendingFile, setPendingFile] = useState<File>();
  const [importPercent, setImportPercent] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const busy = !!pendingFile;
  const creating = mode === 'demo-create';
  const demo = mode !== 'editor';
  const registered = useRegisteredNuriManual();
  const openDemoManual = mode === 'demo-edit' ? openCreated : creating && openRegistered && registered;

  const load = useCallback(async (file: File, skipPacing = false) => {
    if (openCreated && skipPacing) {
      openedLesson.current ??= demoEditHandoff;
      demoEditHandoff = undefined;
      if (openedLesson.current) {
        setLoaded({ ...openedLesson.current, initialSelection });
        return;
      }
    }
    const controller = new AbortController();
    const { signal } = controller;
    loading.current = controller;
    setPendingFile(file);
    setImportPercent(skipPacing ? 24 : 3);
    setError('');
    const presentation = demo && !skipPacing ? paceDemoProgress(8_000, signal, setImportPercent) : undefined;
    try {
      let sourceZip = file;
      if (demo) {
        presentation?.report(23);
        const response = await fetch(`/examples/training-demo/${NURI_MANUAL_ZIP}`, { signal });
        if (!response.ok) throw new Error('교범을 불러오지 못했습니다. 다시 시도해 주세요.');
        sourceZip = new File([await response.blob()], NURI_MANUAL_ZIP, { type: 'application/zip' });
        presentation?.report(59);
      }
      const archive = await readVrLessonArchive(sourceZip);
      signal.throwIfAborted();
      const lesson = readLesson(archive);
      if (presentation) {
        presentation.report(100);
        await presentation.wait();
      }
      signal.throwIfAborted();
      setLoaded({ sourceZip, archive, lesson, initialSelection: openCreated && skipPacing ? initialSelection : undefined });
      setLoadId((id) => id + 1);
    } catch (cause) {
      if (!signal.aborted) {
        const message = cause instanceof SyntaxError ? '교육 ZIP의 JSON 내용을 읽을 수 없습니다.'
          : cause instanceof Error ? cause.message : '교육 ZIP을 열 수 없습니다.';
        setError(demo ? demoLessonCopy(message) : message);
      }
    } finally {
      presentation?.dispose();
      if (loading.current === controller) loading.current = null;
      if (!signal.aborted) setPendingFile(undefined);
    }
  }, [demo, openCreated, initialSelection]);

  useEffect(() => () => {
    loading.current?.abort();
    loading.current = null;
  }, []);
  useEffect(() => {
    if (!openDemoManual || loading.current) return;
    void load(new File([], NURI_MANUAL_ZIP), true);
  }, [load, openDemoManual]);

  function loadFiles(files: FileList | null) {
    if (!files?.length || loading.current) return;
    if (files.length !== 1) {
      setError('파일을 한 번에 하나씩 선택해 주세요.');
      return;
    }
    const file = files[0];
    if (mode === 'demo-edit' && !/\.zip$/i.test(file.name)) {
      setError('교범 ZIP을 선택해 주세요.');
      return;
    }
    void load(file);
  }

  const chooseFile = () => input.current?.click();
  const importStatus = demo && pendingFile && <LessonImportProgress file={pendingFile} percent={importPercent}
    kind={creating ? 'manual' : 'zip'} />;
  return <Stage>
    <ScreenHeader title={creating ? '교범 생성' : demo ? '교범 편집' : '기존 교육 수정'}
      subtitle={creating ? 'STEP, PDF 또는 CAD 파일을 선택해 3D 교범의 조립 단계를 확인하세요.'
        : `3D 동작과 작업 안내를 수정하고 ${demo ? '교범' : '교육'} ZIP과 조립 도면을 만드세요.`}
      action={demo ? <BackButton href="/training/demo" label="교범 관리" />
        : <TrainingToolNavigation active="edit"><BackButton href="/?view=start" label="시작 화면" /></TrainingToolNavigation>} />
    <Workspace aria-busy={!demo && busy && !!loaded}>
      <input ref={input} type="file" accept={creating ? undefined : '.zip'} hidden disabled={busy}
        aria-label={creating ? '가져올 STEP, PDF 또는 CAD 파일' : demo ? '가져올 교범 ZIP' : '가져올 교육 ZIP'}
        onChange={(event) => { loadFiles(event.currentTarget.files); event.currentTarget.value = ''; }} />
      {error && <StateText role="alert" $tone="danger">{error}</StateText>}
      {loaded && importStatus}
      {loaded ? <LessonWorkspace key={loadId} {...loaded} busy={busy} mode={mode} onChooseFile={chooseFile} registered={registered} />
        : demo ?
        <ImportDropArea aria-label={creating ? '교범 원본 가져오기' : '교범 ZIP 가져오기'} $isDragging={isDragging}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
            setIsDragging(!busy);
          }}
          onDragLeave={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            loadFiles(event.dataTransfer.files);
          }}>
          {!(creating && busy) && <FolderIcon viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H8a2 2 0 0 0-1.8 1.1L2 19V6Z" />
            <path fill="currentColor" opacity=".72" d="M8 11h14l-3.4 7.3a2 2 0 0 1-1.8 1.2H4L8 11Z" />
          </FolderIcon>}
          <ReviewTitle as="h2">{isDragging ? '파일을 놓으세요' : creating ? '교범 원본 가져오기' : '교범 ZIP 가져오기'}</ReviewTitle>
          {!busy && <Muted>{creating ? 'STEP, PDF 또는 CAD' : 'ZIP'} 파일을 끌어 놓거나 선택하세요.</Muted>}
          <ActionButton type="button" $primary disabled={busy} onClick={chooseFile}>
            파일 선택
          </ActionButton>
          {importStatus}
        </ImportDropArea> : <Empty>
        <ReviewTitle as="h2">교육 ZIP을 불러오세요</ReviewTitle>
        <Muted>Quest 교육 내보내기로 만든 .vrlesson.zip · 최대 {VR_LESSON_MAX_MB}MB</Muted>
        <ActionButton $primary disabled={busy} onClick={chooseFile}>{busy ? '교육 확인 중…' : '교육 ZIP 선택'}</ActionButton>
      </Empty>}
    </Workspace>
  </Stage>;
}

function LessonWorkspace({ sourceZip, archive, lesson: initialLesson, busy, mode, onChooseFile, registered, initialSelection }:
  LoadedLesson & { busy: boolean; mode: WorkspaceMode; onChooseFile: () => void; registered: boolean; initialSelection?: LessonSelection }) {
  const [lesson, setLesson] = useState(initialLesson);
  const [materialEdits, setMaterialEdits] = useState<LessonMaterialEdits>(() => new Map());
  const [moduleIndex, setModuleIndex] = useState<number | null>(() => {
    const index = initialLesson.modules?.findIndex((module) => module.detail && module.id === initialSelection?.moduleId) ?? -1;
    return index === -1 ? null : index;
  });
  const [stepId, setStepId] = useState(initialSelection?.stepId ?? '');
  const [actionSelection, setActionSelection] = useState({ stepId: '', index: 0 });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const [editRevision, setEditRevision] = useState(0);
  const [drawing, setDrawing] = useState<DrawingProgress>();
  const [drawingFile, setDrawingFile] = useState<{ blob: Blob; name: string; version: string }>();
  const [drawingPreviewOpen, setDrawingPreviewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const job = useRef<AbortController | null>(null);
  const cachedPackage = useRef<PackedLesson | null>(null);
  const [zipPrepared, setZipPrepared] = useState(false);
  const updatedDrawingSteps = useRef(new Set<string>());
  const creating = mode === 'demo-create';
  const demo = mode !== 'editor';
  const lessonTerm = demo ? '교범' : '교육';
  const copy = demo ? demoLessonCopy : (value: string) => value;
  useEffect(() => () => job.current?.abort(), []);
  const locale = typeof lesson.defaultLocale === 'string' && lesson.defaultLocale ? lesson.defaultLocale : 'ko';
  const selectedModule = moduleIndex === null ? undefined : lesson.modules?.[moduleIndex];
  const area = selectedModule?.detail ?? lesson;
  const { byId, order } = stepSequence(area);
  const drawingAreas = useMemo(() => [
    { id: 'overview', name: '제품 전체', area: lesson, ...stepSequence(lesson) },
    ...(lesson.modules ?? []).flatMap((module) => module.detail ? [{
      id: module.id, name: displayText(module.name, locale) || module.id, area: module.detail, ...stepSequence(module.detail),
    }] : []),
  ].filter(({ order }) => order.length), [lesson, locale]);
  const drawingStepCount = drawingAreas.reduce((count, section) => count + section.order.length, 0);
  const selected = byId.get(stepId) ?? byId.get(order[0]);
  const selectedIndex = selected ? order.indexOf(selected.id) : -1;
  const parts = useMemo(() => previewParts(area.parts, locale), [area.parts, locale]);
  const pathsByAsset = useMemo(() => new Map(previewAssets(area.assets).map(({ id, path }) => [id, path])), [area.assets]);
  const materialsByPart = useMemo(() => {
    const materials = new Map<string, LessonMaterialOverride>();
    for (const { id, assetId, nodeName } of parts) {
      const path = pathsByAsset.get(assetId);
      const preset = path && materialEdits.get(path)?.get(nodeName);
      if (preset) materials.set(id, preset);
    }
    return materials;
  }, [materialEdits, parts, pathsByAsset]);
  const actions = previewActions(selected, area, lesson.modes, parts, locale);
  const actionIndex = actionSelection.stepId === selected?.id ? actionSelection.index : 0;
  const action = actions[actionIndex] ?? actions[0];
  const checkpoints = Array.isArray(selected?.manual?.checkpoints)
    ? selected.manual.checkpoints.map((item) => displayText(item, locale)).filter(Boolean) : [];
  const prerequisites = Array.isArray(selected?.prerequisiteStepIds) ? selected.prerequisiteStepIds.map((id) => {
    return displayText(byId.get(id)?.manual?.title, locale) || id;
  }) : [];
  const completedWhen = completionText(selected?.completedWhen);
  const editDisabled = busy || saving || !!drawing || drawingPreviewOpen;
  const fieldsDisabled = creating || editDisabled;
  const hasCurrentDrawing = drawingFile?.version === lesson.contentVersion && !dirty;
  const lessonTitle = copy(displayText(lesson.title, locale).trim());
  const canExport = demo || ((dirty || zipPrepared) && !!lessonTitle);

  function selectStep(id: string) {
    setStepId(id);
    setActionSelection({ stepId: '', index: 0 });
  }

  function changeInfo(field: 'title' | 'summary', value: string) {
    setLesson((previous) => ({ ...previous, [field]: writeText(previous[field], locale, value) }));
    setDirty(true);
    setFeedback(undefined);
  }

  function changeManual(field: keyof EditableManual, value: string) {
    if (!selected) return;
    const steps = area.steps?.map((step) => step.id === selected.id
      ? { ...step, manual: { ...step.manual, [field]: writeText(step.manual?.[field], locale, value) } }
      : step);
    setLesson((previous) => moduleIndex === null ? { ...previous, steps }
      : { ...previous, modules: previous.modules?.map((item, index) => index === moduleIndex
        ? { ...item, detail: { ...item.detail, steps } } : item) });
    setDirty(true);
    setFeedback(undefined);
  }

  function changeMaterial(partIds: string[], material: LessonMaterialId) {
    if (editDisabled) return;
    const next = new Map(materialEdits);
    let changed = false;
    for (const id of partIds) {
      const part = parts.find((item) => item.id === id);
      const path = part && pathsByAsset.get(part.assetId);
      if (!path || !part) continue;
      if ((next.get(path)?.get(part.nodeName) ?? 'original') === material) continue;
      const modelEdits = new Map(next.get(path));
      if (material === 'original') modelEdits.delete(part.nodeName);
      else modelEdits.set(part.nodeName, material);
      if (modelEdits.size) next.set(path, modelEdits);
      else next.delete(path);
      changed = true;
    }
    if (!changed) return;
    setMaterialEdits(next);
    setDirty(true);
    setFeedback(undefined);
  }

  function changeAction(change: LessonActionChange) {
    if (!selected || !action || !Array.isArray(selected.actions)) return;
    const result = applyLessonActionChange(action, parts, change);
    if (!result) return;
    if ('approach' in change) updatedDrawingSteps.current.add(drawingStepKey(selectedModule?.id ?? 'overview', selected.id));
    const steps = area.steps?.map((step) => {
      if (step.id !== selected.id) return step;
      let manual = step.manual;
      if ('turns' in change && result.requiredRotationDeg !== undefined && manual &&
        actions.filter((item) => item.kind === 'fasten' || item.kind === 'thread').length === 1) {
        const rotation = result.requiredRotationDeg;
        manual = {
          ...manual,
          title: synchronizeTurnText(manual.title, action, rotation, change.clockwise) as Localized | undefined,
          instruction: synchronizeTurnText(manual.instruction, action, rotation, change.clockwise) as Localized | undefined,
          checkpoints: synchronizeTurnText(manual.checkpoints, action, rotation, change.clockwise),
        };
      }
      return { ...step, manual, actions: step.actions?.map((item, index) => index === actionIndex ? result.data : item) };
    });
    let updatedParts = area.parts;
    if (result.pose && Array.isArray(area.parts) && action.movingId) {
      const rawArea = lessonRecord(area);
      const movingPortIds = new Set(Array.isArray(rawArea.ports) ? rawArea.ports.map(lessonRecord)
        .filter((item) => item.partId === action.movingId).map((item) => item.id) : []);
      const connectedIds = new Set(Array.isArray(rawArea.connections) ? rawArea.connections.map(lessonRecord)
        .filter((item) => movingPortIds.has(item.sourcePortId)).map((item) => item.id) : []);
      const linkedActions = area.steps?.flatMap((step) => Array.isArray(step.actions) ? step.actions.map(lessonRecord) : [])
        .filter((item) => item.kind === 'attach' && (connectedIds.has(item.connectionId) || item.partId === action.movingId));
      const pose = result.pose;
      if (!linkedActions || linkedActions.length <= 1) updatedParts = area.parts.map((item) => {
        const raw = lessonRecord(item);
        return raw.id === action.movingId ? { ...raw, initialPose: { ...lessonRecord(raw.initialPose), positionM: pose.position, rotationXyzw: pose.rotation } } : item;
      });
    }
    const patch = { steps, parts: updatedParts };
    setLesson((previous) => moduleIndex === null ? { ...previous, ...patch }
      : { ...previous, modules: previous.modules?.map((item, index) => index === moduleIndex
        ? { ...item, detail: { ...item.detail, ...patch } } : item) });
    setDirty(true);
    setEditRevision((current) => current + 1);
    setFeedback({ text: '동작 설정을 적용했습니다. 미리보기에서 움직임을 확인할 수 있습니다.', error: false });
  }

  async function buildPackage(): Promise<PackedLesson> {
    if (!dirty && cachedPackage.current?.lesson === lesson) return cachedPackage.current;
    if (!dirty && demo) return { lesson, zip: sourceZip, zipName: `${lesson.trainingId}_${lesson.contentVersion}.vrlesson.zip` };
    const contentVersion = dirty ? nextVersion(lesson.contentVersion) : lesson.contentVersion;
    const updated = dirty ? { ...lesson, contentVersion } : lesson;
    const entries: Record<string, Uint8Array<ArrayBuffer>> = { ...archive.assets, 'lesson.json': encodeVrLesson(updated) };
    if (materialEdits.size) {
      const { exportLessonMaterialGlb } = await import('./exportLessonMaterials');
      const partNamesByPath = new Map<string, Set<string>>();
      for (const scope of [lesson, ...(lesson.modules ?? []).flatMap((module) => module.detail ?? [])]) {
        const paths = new Map(previewAssets(scope.assets).map(({ id, path }) => [id, path]));
        for (const { assetId, nodeName } of previewParts(scope.parts, locale)) {
          const path = paths.get(assetId);
          if (!path || !materialEdits.has(path)) continue;
          let names = partNamesByPath.get(path);
          if (!names) partNamesByPath.set(path, names = new Set());
          names.add(nodeName);
        }
      }
      for (const [path, edits] of materialEdits) {
        const bytes = entries[path];
        const names = partNamesByPath.get(path);
        if (!bytes || !names) throw new Error(`${path} 모델을 ${lessonTerm} ZIP에서 찾을 수 없습니다.`);
        entries[path] = exportLessonMaterialGlb(bytes, names, edits);
      }
    }
    const zip = await packVrLesson(entries, { ...archive.manifest, contentVersion });
    return { lesson: updated, zip, zipName: `${lesson.trainingId}_${contentVersion}.vrlesson.zip` };
  }

  function commitPackage(result: PackedLesson) {
    cachedPackage.current = result;
    setZipPrepared(true);
    setLesson(result.lesson);
    setDirty(false);
  }

  async function download() {
    if (editDisabled || !canExport) return;
    setSaving(true);
    setFeedback(undefined);
    try {
      const result = await buildPackage();
      saveFile(result.zip, result.zipName);
      commitPackage(result);
      setFeedback({ text: creating ? '3D 교범 ZIP의 다운로드를 시작했습니다.'
        : `${result.lesson.contentVersion} 버전의 다운로드를 시작했습니다.`, error: false });
    } catch (error) {
      setFeedback({ text: copy(error instanceof Error ? error.message : '교육 ZIP을 만들 수 없습니다. 잠시 후 다시 시도해 주세요.'), error: true });
    } finally {
      setSaving(false);
    }
  }

  async function makeDrawing() {
    if (!drawingStepCount || job.current) return;
    const controller = new AbortController();
    job.current = controller;
    setDrawing({ percent: 3, phase: 'prepare' });
    setFeedback(undefined);
    const presentation = mode === 'demo-edit' ? paceDemoProgress(14_000, controller.signal, (percent) => {
      setDrawing({ percent, phase: percent < 22 ? 'prepare' : percent < 82 ? 'draw' : 'bind' });
    }) : undefined;
    function report(progress: DrawingProgress) {
      if (presentation) presentation.report(progress.percent);
      else setDrawing(progress);
    }
    try {
      const { generateLessonDrawing } = await import('./lessonDrawingPdf');
      controller.signal.throwIfAborted();
      const result = await buildPackage();
      controller.signal.throwIfAborted();
      report({ percent: 16, phase: 'prepare' });
      const sections: LessonDrawingSection[] = drawingAreas.map((section) => {
        const sectionParts = previewParts(section.area.parts, locale);
        return {
          id: section.id, name: section.name, parts: sectionParts, assetList: section.area.assets,
          steps: section.order.map((id) => {
            const step = section.byId.get(id)!;
            return {
              id, title: displayText(step.manual?.title, locale) || id, instruction: displayText(step.manual?.instruction, locale),
              caution: displayText(step.manual?.caution, locale),
              checkpoints: Array.isArray(step.manual?.checkpoints) ? step.manual.checkpoints.map((item) => displayText(item, locale)).filter(Boolean) : [],
              prerequisites: Array.isArray(step.prerequisiteStepIds) ? step.prerequisiteStepIds.map((key) =>
                displayText(section.byId.get(key)?.manual?.title, locale) || key) : [],
              completion: completionText(step.completedWhen), actions: previewActions(step, section.area, lesson.modes, sectionParts, locale),
            };
          }),
        };
      });
      const file = await generateLessonDrawing({ trainingId: lesson.trainingId, version: result.lesson.contentVersion,
        title: displayText(lesson.title, locale) || lesson.trainingId, sections, assets: archive.assets, demo,
        zip: result.zip, zipName: result.zipName, signal: controller.signal,
        preparedFigures: demo ? { sourceFiles: archive.manifest.files, changedSteps: updatedDrawingSteps.current,
          usePreparedDocument: !dirty && lesson === initialLesson } : undefined,
        onProgress: report });
      if (presentation) await presentation.wait();
      controller.signal.throwIfAborted();
      commitPackage(result);
      setDrawingFile({ blob: file.blob, name: `${lesson.trainingId}_${result.lesson.contentVersion}_all-assembly.pdf`, version: result.lesson.contentVersion });
      setDrawing(undefined);
      setDrawingPreviewOpen(true);
      if (file.missing || file.failedModels) {
        setFeedback({ text: `도면을 만들었습니다. 부품 상세를 표시하지 못한 단계 ${file.missing}개, 열지 못한 GLB ${file.failedModels}개입니다.`, error: false });
      }
    } catch (error) {
      if (!controller.signal.aborted) setFeedback({ text: error instanceof Error ? error.message : '도면을 만들 수 없습니다. 다시 시도해 주세요.', error: true });
      setDrawing(undefined);
    } finally {
      presentation?.dispose();
      job.current = null;
      setCancelling(false);
    }
  }

  function closeDrawing() {
    if (job.current) {
      job.current.abort();
      setCancelling(true);
      return;
    }
    setDrawing(undefined);
  }

  return <>
    <FileBar>
      <div><strong>{demo ? lessonTitle || sourceZip.name : sourceZip.name}{creating && ' · 3D 교범'}</strong>
        <Muted>{demo && lessonTitle && `${sourceZip.name} · `}{creating ? '교범' : '편집'} 버전 {lesson.contentVersion}{dirty ? ' · 수정 중' : ''} · 전체 {drawingStepCount}단계</Muted>
        {creating && <Muted>내보내기 · 3D 교범 ZIP</Muted>}
      </div>
      <ActionButton disabled={editDisabled} onClick={onChooseFile}>{creating ? '다른 파일 열기' : `다른 ${lessonTerm} 열기`}</ActionButton>
      {creating && lesson.trainingId === NURI_MANUAL_ID && (registered
        ? <ActionButton as={Link} href="/training" prefetch={false}>교범 목록 보기</ActionButton>
        : <ActionButton type="button" disabled={editDisabled} onClick={() => {
          registerNuriManual();
          setFeedback({ text: '누리호 교범을 목록에 등록했습니다.', error: false });
        }}>교범 등록</ActionButton>)}
      <ActionButton $primary={creating || (demo && hasCurrentDrawing)} disabled={editDisabled || !canExport} onClick={() => setExportOpen(true)}>
        {saving ? 'ZIP 만드는 중…' : `${lessonTerm} 내보내기`}
      </ActionButton>
      {creating && <ActionButton as={Link}
        href={{ pathname: '/training/demo/edit', query: { from: 'create', module: selectedModule?.id, step: selected?.id } }}
        prefetch={false} aria-disabled={editDisabled} tabIndex={editDisabled ? -1 : undefined}
        onClick={(event) => { if (editDisabled) event.preventDefault(); }}
        onNavigate={() => { demoEditHandoff = { sourceZip, archive, lesson }; }}>교범 편집</ActionButton>}
      {!creating && drawingFile && (!demo || hasCurrentDrawing) && <ActionButton disabled={editDisabled} onClick={() => setDrawingPreviewOpen(true)}>
        최근 생성 도면 보기</ActionButton>}
      {!creating && <ActionButton $primary={!demo || !hasCurrentDrawing} disabled={editDisabled || !drawingStepCount}
        onClick={() => void makeDrawing()}>전체 도면 PDF 만들기</ActionButton>}
    </FileBar>
    {feedback && <StateText role={feedback.error ? 'alert' : 'status'} $tone={feedback.error ? 'danger' : 'success'}>{feedback.text}</StateText>}
    <EditorGrid>
      <ReviewPanel>
        <ReviewHeader><ReviewTitle>실습 단계</ReviewTitle><Muted>{order.length}개</Muted></ReviewHeader>
        <ReviewBody>
          <DetailBox>
            <summary>{lessonTerm} 정보</summary>
            <Muted>기본 언어 · {locale}</Muted>
            <ReviewLabel>{lessonTerm} 제목<ReviewInput disabled={fieldsDisabled} value={copy(displayText(lesson.title, locale))} onChange={(event) => changeInfo('title', event.target.value)} /></ReviewLabel>
            <ReviewLabel>{lessonTerm} 소개<ReviewTextArea disabled={fieldsDisabled} rows={4} value={copy(displayText(lesson.summary, locale))} onChange={(event) => changeInfo('summary', event.target.value)} /></ReviewLabel>
          </DetailBox>
          <Scopes aria-label={`${lessonTerm} 구간`}>
            <ActionButton $primary={moduleIndex === null} aria-pressed={moduleIndex === null} onClick={() => { setModuleIndex(null); selectStep(''); }}>제품 전체</ActionButton>
            {lesson.modules?.map((item, index) => item.detail && <ActionButton key={index} $primary={moduleIndex === index}
              aria-pressed={moduleIndex === index} onClick={() => { setModuleIndex(index); selectStep(''); }}>
              {displayText(item.name, locale) || item.id}
            </ActionButton>)}
          </Scopes>
          {order.map((id, index) => <StepButton key={id} aria-pressed={selected?.id === id} onClick={() => selectStep(id)}>
            <Muted>{String(index + 1).padStart(2, '0')}</Muted>
            <span>{displayText(byId.get(id)?.manual?.title, locale) || id}</span>
          </StepButton>)}
          {!order.length && <Muted>이 구간에 등록된 단계가 없습니다.</Muted>}
        </ReviewBody>
      </ReviewPanel>
      <LessonStepPreview key={moduleIndex ?? 'overview'} assets={archive.assets} assetList={area.assets} parts={parts} action={action} lightweight={demo}
        motionKey={(selected?.id ?? '') + ':' + actionIndex + ':' + editRevision} title={displayText(selected?.manual?.title, locale)}
        subtitle={displayText(selected?.manual?.instruction, locale)} caution={displayText(selected?.manual?.caution, locale)}
        checkpoints={checkpoints} stepNumber={selectedIndex + 1} stepCount={order.length}
        materialsByPart={materialsByPart} onMaterialChange={changeMaterial} editDisabled={fieldsDisabled} packageLabel={`${lessonTerm} ZIP`}
        onPrevious={() => selectStep(order[selectedIndex - 1])} onNext={() => selectStep(order[selectedIndex + 1])} />
      <ReviewPanel>
        <ReviewHeader><ReviewTitle>동작 · 단계 안내</ReviewTitle><Muted>{actions.length}개 동작</Muted></ReviewHeader>
        <ReviewBody>
          {selected ? <>
            {!!actions.length && <Scopes aria-label="단계 동작">
              {actions.map((item, index) => <ActionButton key={item.key + index} aria-pressed={item === action} $primary={item === action}
                onClick={() => setActionSelection({ stepId: selected.id, index })}>{index + 1}. {item.label}</ActionButton>)}
            </Scopes>}
            {action && !creating && <LessonActionEditor key={(moduleIndex ?? 'overview') + ':' + selected.id + ':' + actionIndex + ':' + editRevision}
              action={action} parts={parts} disabled={editDisabled} onApply={changeAction} />}
            {!!action?.fields.length && <Fields aria-label="동작 상세">
              {action.fields.map(([label, value]) => <div key={label}><dt>{copy(label)}</dt><dd>{copy(value)}</dd></div>)}
            </Fields>}
            {prerequisites.length > 0 && <Muted>선행 단계 · {prerequisites.join(' · ')}</Muted>}
            {completedWhen && <Muted>단계 완료 조건 · {completedWhen}</Muted>}
            {checkpoints.length > 0 && <DetailBox open>
              <summary>확인 알림 {checkpoints.length}건</summary>
              <ul>{checkpoints.map((text, index) => <li key={index}>{text}</li>)}</ul>
            </DetailBox>}
            <ReviewLabel>단계 제목<ReviewInput disabled={fieldsDisabled} value={displayText(selected.manual?.title, locale)} onChange={(event) => changeManual('title', event.target.value)} /></ReviewLabel>
            <ReviewLabel>작업 안내 자막<ReviewTextArea disabled={fieldsDisabled} rows={3} value={displayText(selected.manual?.instruction, locale)} onChange={(event) => changeManual('instruction', event.target.value)} /></ReviewLabel>
            <ReviewLabel>주의 사항<ReviewTextArea disabled={fieldsDisabled} rows={2} value={displayText(selected.manual?.caution, locale)} onChange={(event) => changeManual('caution', event.target.value)} /></ReviewLabel>
            {action && <DetailBox><summary>동작 데이터 (ZIP)</summary><pre>{JSON.stringify(action.raw, null, 2)}</pre></DetailBox>}
          </> : <Muted>왼쪽에서 실습 단계가 있는 구간을 선택하세요.</Muted>}
        </ReviewBody>
      </ReviewPanel>
    </EditorGrid>
    {drawing && <LessonDrawingProgress progress={drawing} scope={`${lessonTerm} 전체 · ${drawingStepCount}단계`} paced={mode === 'demo-edit'}
      cancelling={cancelling} onCancel={closeDrawing} />}
    {drawingPreviewOpen && drawingFile && <LessonDrawingPreview file={drawingFile}
      onClose={() => setDrawingPreviewOpen(false)}
      onDownload={() => saveFile(drawingFile.blob, drawingFile.name)} />}
    {exportOpen && <QuestExportDialog onClose={() => setExportOpen(false)}
      onDownload={() => { setExportOpen(false); void download(); }}
      onPublish={async (deliver) => {
        const result = await buildPackage();
        const entry = await deliver(result.zip);
        commitPackage(result);
        return entry;
      }} />}
  </>;
}

const Workspace = styled.main(({ theme }) => ({
  position: 'absolute', inset: `208px ${theme.space[8]}px ${theme.space[8]}px`,
  display: 'flex', flexDirection: 'column', gap: theme.space[3],
}));
const Empty = styled(ReviewPanel)(({ theme }) => ({
  flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space[4],
  borderStyle: 'dashed',
}));
const ImportDropArea = styled(Empty)<{ $isDragging: boolean }>(({ theme, $isDragging }) => ({
  background: $isDragging ? theme.color.primaryFill : theme.color.panel,
  borderColor: $isDragging ? theme.color.primary : theme.color.primaryLine,
}));
const FolderIcon = styled.svg(({ theme }) => ({ width: 60, height: 60, color: theme.color.primarySoft }));
const FileBar = styled(ReviewHeader)(({ theme }) => ({
  border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.panel,
  flexWrap: 'wrap',
  '& > div': { flex: 1, minWidth: 0, display: 'grid', gap: theme.space[1], overflowWrap: 'anywhere' },
}));
const EditorGrid = styled.div(({ theme }) => ({
  flex: 1, minHeight: 0, display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2.4fr) minmax(0, 1.25fr)', gap: theme.space[3],
}));
const Scopes = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: theme.space[2],
  '& button': { minWidth: 0, minHeight: theme.space[6], paddingInline: theme.space[2], overflowWrap: 'anywhere' },
}));
const DetailBox = styled.details(({ theme }) => ({
  flexShrink: 0, padding: theme.space[3], background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLineWeak,
  '& summary': { cursor: 'pointer', color: theme.color.primarySoft, fontSize: theme.size.md },
  '& > :not(summary)': { marginTop: theme.space[2] },
  '& ul': { marginBottom: 0, paddingInlineStart: theme.space[4], fontSize: theme.size.sm, lineHeight: 1.5 },
  '& pre': { maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: theme.size.xs },
}));
const Fields = styled.dl(({ theme }) => ({
  margin: 0, flexShrink: 0, background: theme.color.bgEdge, padding: theme.space[2], fontSize: theme.size.sm,
  '& > div': { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: theme.space[2], padding: theme.space[2] },
  '& > div + div': { borderTop: '1px solid ' + theme.color.primaryLineWeak },
  '& dt': { color: theme.color.inkMuted }, '& dd': { margin: 0, overflowWrap: 'anywhere' },
}));
const StepButton = styled.button(({ theme }) => ({
  flexShrink: 0, display: 'flex', alignItems: 'baseline', textAlign: 'left', gap: theme.space[3],
  padding: theme.space[3], border: '1px solid ' + theme.color.primaryLineWeak, overflowWrap: 'anywhere',
  '&:hover, &[aria-pressed="true"]': { borderColor: theme.color.primary, background: theme.color.primaryFill },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
