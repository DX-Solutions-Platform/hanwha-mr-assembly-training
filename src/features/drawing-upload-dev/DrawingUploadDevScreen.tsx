'use client';
import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { Stage } from '@/components/common/Stage';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { BackButton } from '@/components/common/BackButton';
import { usePdfAnalysis } from './usePdfAnalysis';
import { usePartReview } from './review/usePartReview';
import { ReviewWorkspace } from './review/ReviewWorkspace';
import { useStepModel } from './model/useStepModel';
import { StepWorkspace } from './model/StepWorkspace';
import { UploadDevFooter } from './ui/UploadDevFooter';
import { PdfModelExample } from './generate/PdfModelExample';
import { PdfModelAvailability } from './generate/PdfModelAvailability';
import type { DrawingPage, Evidence, PdfAnalysisOptions, UploadMode } from './types';
import { UploadEmpty } from './ui/UploadEmpty';
import { PageGallery } from './ui/PageGallery';
import { TaskPanel } from './ui/TaskPanel';
import { ResultPanel } from './ui/ResultPanel';
import { SourceViewer } from './ui/SourceViewer';
import { ActionButton } from './ui/sharedStyles';
import { SHAPE_NAME_MODEL, type ShapeNameModel } from './shape-name/shapeNameTypes';
import { planLibraryAssembly } from './assembly/libraryAssemblyPlan';
import { planFlangeDrafts } from './generate/planFlangeDrafts';
import { useFlangeDrafts, type GeneratedFlangeDraft } from './generate/useFlangeDrafts';
import type { FlangeSource } from './generate/flangeTypes';
import type { LibraryMatch } from '@/features/part-library/libraryTypes';
import { useOutlineFlangeSources } from './generate/useOutlineFlangeSources';
import type { OutlineFlangeLink } from './generate/outlineFlangeLinks';
import { useDrawingShape } from './generate/drawing-draft/useDrawingShape';
import { drawingShapeKey } from './generate/drawing-draft/draftGeometry';
import { parseReviewQuantity } from './review/reviewModel';
import { useFinishedProduct } from './product/useFinishedProduct';
import { FinishedProductSummary } from './product/FinishedProductSummary';
import type { FinishedProductModel } from './product/finishedProductStore';

const STEP_LIST = ['도면 올리기', '실제 분석', '부품 검토·보정', '3D 부품 연결', '교육 생성'];
const NO_FLANGE_SOURCES: FlangeSource[] = [];
const AssemblyWorkspace = dynamic(() => import('./assembly/AssemblyWorkspace').then((module) => module.AssemblyWorkspace), { ssr: false, loading: () => <AssemblyLoading role="status">조립품 편집기를 준비하고 있습니다.</AssemblyLoading> });
const LibraryAssemblyWorkspace = dynamic(() => import('./assembly/LibraryAssemblyWorkspace').then((module) => module.LibraryAssemblyWorkspace), { ssr: false });
const DrawingDraftWorkspace = dynamic(() => import('./generate/drawing-draft/DrawingDraftWorkspace').then((module) => module.DrawingDraftWorkspace), { ssr: false, loading: () => <AssemblyLoading role="status">입체 모델을 준비합니다.</AssemblyLoading> });
const FinishedProductWorkspace = dynamic(() => import('./product/FinishedProductWorkspace').then((module) => module.FinishedProductWorkspace), { ssr: false, loading: () => <AssemblyLoading role="status">완제품 화면을 준비합니다.</AssemblyLoading> });
export function DrawingUploadDevScreen({ initialMode = 'analysis', shapeNameModel = SHAPE_NAME_MODEL }: { initialMode?: UploadMode; shapeNameModel?: ShapeNameModel | null }) {
  const analysis = usePdfAnalysis();
  const review = usePartReview(analysis.file, analysis.pageList, analysis.status, shapeNameModel);
  const current = review.current;
  const { document, groupList, partList, existingLibraryModels, outlineLinks } = current ?? {};
  const finished = useFinishedProduct(document?.sha256);
  const finishedPage = finished.record?.pageNumber ?? null;
  const candidatePage = finished.ready && !finished.record && (document?.pageCount ?? 0) > 1 ? analysis.pageList[0]?.pageNumber ?? null : null;
  const partPages = useMemo(() => finishedPage ? analysis.pageList.filter((page) => page.pageNumber !== finishedPage) : analysis.pageList, [analysis.pageList, finishedPage]);
  const productPages = useMemo(() => finishedPage ? analysis.pageList.filter((page) => page.pageNumber === finishedPage) : [], [analysis.pageList, finishedPage]);
  const partLinks = useMemo(() => finishedPage ? outlineLinks?.filter((item) => Number(item.key.split(':')[1]) !== finishedPage) : outlineLinks, [outlineLinks, finishedPage]);
  const labelledPlan = useMemo(() => finished.ready && document && groupList && partList && analysis.sourceUrl ? planFlangeDrafts({
    document, pages: partPages, sourceUrl: analysis.sourceUrl, groups: groupList, parts: partList, occupied: existingLibraryModels ?? null,
  }) : null, [finished.ready, document, groupList, partList, existingLibraryModels, partPages, analysis.sourceUrl]);
  const outlineInput = useMemo(() => finished.ready && document && groupList && partList && existingLibraryModels && partLinks && analysis.sourceUrl ? {
    document, pages: partPages, sourceUrl: analysis.sourceUrl, groups: groupList, parts: partList, occupied: existingLibraryModels, links: partLinks,
    labelled: new Set(labelledPlan?.candidates.map((candidate) => candidate.values.part.partNumber)),
  } : null, [finished.ready, document, groupList, partList, existingLibraryModels, partLinks, partPages, analysis.sourceUrl, labelledPlan]);
  const outlines = useOutlineFlangeSources(outlineInput);
  const flangePlan = useMemo(() => labelledPlan && outlines ? {
    candidates: outlines.candidates.length ? [...labelledPlan.candidates, ...outlines.candidates] : labelledPlan.candidates,
    reused: [...new Set([...labelledPlan.reused, ...outlines.reused])], issues: labelledPlan.issues,
  } : labelledPlan, [labelledPlan, outlines]);
  const flangeDrafts = useFlangeDrafts(flangePlan?.candidates ?? NO_FLANGE_SOURCES);
  const libraryPlan = useMemo(() => finished.ready && current ? planLibraryAssembly(current.groupList, current.partList, current.libraryMatches, partLinks) : null, [finished.ready, current, partLinks]);
  const libraryCount = libraryPlan && !libraryPlan.limitMessage ? libraryPlan.count : 0;
  const hasFlangeDraft = !!flangePlan?.candidates.length && (!flangeDrafts || [...flangeDrafts.values()].some((draft) => typeof draft !== 'string'));
  const hasKnownModels = hasFlangeDraft || !!flangePlan?.reused.length || !!libraryCount;
  const hasOtherParts = current?.groupList.some(({ partNumber }) => !current.libraryMatches.get(partNumber)?.model &&
    !flangePlan?.candidates.some((candidate) => candidate.values.part.partNumber === partNumber &&
      typeof flangeDrafts?.get(candidate.outline?.key ?? partNumber) !== 'string'));
  const canTryDraft = finished.ready && !!current && !!partPages.length && (!outlineInput || !!outlines) && (!hasKnownModels || !!hasOtherParts);
  const drawingDraft = useDrawingShape(partPages, canTryDraft && !hasKnownModels);
  const linkedDrawing = drawingDraft?.shape && partLinks?.some((link) => link.key === drawingShapeKey(drawingDraft.shape!) && current?.libraryMatches.get(link.partNumber)?.model);
  const step = useStepModel();
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>(initialMode);
  const productDraft = useDrawingShape(productPages, mode === 'product-draft' && !!finishedPage);
  const [isAssemblyOpened, setIsAssemblyOpened] = useState(initialMode === 'assembly');
  const [isDraftOpened, setIsDraftOpened] = useState(false);
  const [generationInput, setGenerationInput] = useState<{ file: File | null; version: number; draft?: GeneratedFlangeDraft }>({ file: null, version: 0 });
  const [selectedPartKey, setSelectedPartKey] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [source, setSource] = useState<Evidence | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const isBusy = analysis.status === 'running' || analysis.status === 'loading';
  const isAssemblyMode = mode === 'assembly' || mode === 'library-assembly';
  const isProductMode = mode === 'product' || mode === 'product-draft';
  const isGenerationMode = mode === 'generate' || mode === 'drawing-draft' || mode === 'product-draft';
  const activeStep = mode === 'model' || isGenerationMode || isAssemblyMode ? 3 : analysis.status === 'complete' ? 2 : analysis.status === 'idle' ? 0 : 1;
  const resetSelection = () => { setMode('analysis'); setSelectedPartKey(null); setSelectedPage(1); setSource(null); setIsViewerOpen(false); };
  const canReplace = () => !review.current?.isDirty || review.save();
  const handleFile = (file?: File, options: PdfAnalysisOptions = {}) => {
    if (file && canReplace()) {
      review.stopShapeNames();
      resetSelection();
      setIsDraftOpened(false);
      setGenerationInput((value) => ({ file: null, version: value.version + 1 }));
      analysis.start(file, options);
    }
  };
  const handleDrop = (file?: File) => { if (file && /\.(step|stp)$/i.test(file.name)) { void step.load(file); setMode('model'); } else handleFile(file); };
  const handleSelect = (page: DrawingPage) => { setSelectedPage(page.pageNumber); setSource(null); setIsViewerOpen(true); };
  const handleInspect = (evidence: Evidence) => { setSelectedPage(evidence.pageNumber); setSource(evidence); setIsViewerOpen(true); };
  const currentPage = analysis.pageList.find((page) => page.pageNumber === selectedPage) ?? null;
  const handleGenerate = (file: File | null, draft?: GeneratedFlangeDraft) => {
    setGenerationInput((value) => value.file === file && value.draft === draft ? value : { file, draft, version: value.version + 1 }); setMode('generate');
  };
  const openRegisteredModel = (match: LibraryMatch, link?: OutlineFlangeLink) => {
    if (!current) return;
    review.linkRegisteredModel(current.document, match, link);
    const links = link ? [...(partLinks ?? []).filter((item) => item.key !== link.key), link] : partLinks;
    const next = planLibraryAssembly(current.groupList, current.partList, new Map(current.libraryMatches).set(match.partNumber, match), links);
    setMode(next.count && !next.limitMessage ? 'library-assembly' : 'analysis');
    setGenerationInput((value) => ({ file: null, version: value.version + 1 }));
  };
  const handleRegistration = (match: LibraryMatch, link?: OutlineFlangeLink) => {
    const draft = generationInput.draft;
    if (!current || !draft || current.document.sha256 !== draft.source.document.sha256 ||
      (draft.source.values.part.partNumber && draft.source.values.part.partNumber !== match.partNumber)) return;
    openRegisteredModel(match, link);
  };
  const singlePart = current?.groupList.length === 1 ? current.partList[0] : null;
  const quantity = parseReviewQuantity(singlePart?.quantity ?? '');
  const shownFinishedPage = productPages[0] ?? analysis.pageList.find((page) => page.pageNumber === candidatePage);
  const saveProductModel = async (model: FinishedProductModel) => {
    const record = finished.record;
    if (!record || record.pageNumber !== model.pageNumber) throw new Error('완제품 대표 도면을 다시 확인해 주세요.');
    await finished.save({ model });
    setMode('product');
  };
  const handleMode = (next: UploadMode) => { if (next === 'assembly') setIsAssemblyOpened(true); if (next === 'generate') handleGenerate(null); else setMode(next); };
  return <Stage background={<Background />}>
    <ScreenHeader title={mode === 'product' ? '완제품 관리' : mode === 'product-draft' ? '완제품 3D 편집' : isAssemblyMode ? '조립품 편집' : mode === 'drawing-draft' ? '도면 입체 모델 초안' : mode === 'generate' ? 'PDF 기반 3D 생성' : mode === 'model' ? '3D 부품 연결' : mode === 'review' ? '부품 검토·보정' : '도면 분석'} subtitle={mode === 'product' ? '대표 도면과 완제품 모델을 관리합니다.' : mode === 'product-draft' ? '대표 도면의 모델을 확인하고 완제품에 저장하세요.' : mode === 'library-assembly' ? (analysis.file?.name ?? '') + ' · 위치와 결합을 편집한 뒤 조립품을 저장하세요.' : mode === 'assembly' ? '부품을 선택하고 수정하세요. 바뀐 위치를 3D로 확인한 뒤 저장합니다.' : mode === 'drawing-draft' ? '입체 모델을 회전해 확인하고 실제 치수와 외관을 보정하세요.' : mode === 'generate' ? (generationInput.draft?.source.outline ? '정면도 윤곽으로 만든 플랜지 · 실제 치수를 확인하세요' : '원문 치수로 만든 플랜지 · 입력값을 바꾸고 3D 결과를 확인하세요') : (analysis.file ? analysis.file.name + ' · ' : '') + (mode === 'model' ? 'STEP 형상을 선택해 검토한 부품번호에 연결하세요' : mode === 'review' ? '원문을 대조해 부품별 정보를 확정하세요' : isBusy ? '실제 처리 중' : analysis.status === 'complete' ? '추출 결과를 원문과 함께 확인하세요' : 'PDF 페이지 · 부품표 · 치수')} action={mode === 'analysis' ? <BackButton href="/training" label="교육 선택" /> : <ActionButton aria-label={mode === 'product-draft' ? '완제품 관리로' : '도면 분석으로'} onClick={() => setMode(mode === 'product-draft' ? 'product' : 'analysis')}>← {mode === 'product-draft' ? '완제품 관리' : '도면 분석'}</ActionButton>} />
    <Stepper aria-label="도면 분석 단계">{STEP_LIST.map((label, index) => <Step key={label} $active={index === activeStep} $done={index < activeStep && analysis.status === 'complete'} aria-current={index === activeStep ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')} · {label}</span>{index === 4 && <small>후속 단계</small>}</Step>)}</Stepper>
    {isGenerationMode || isAssemblyMode || isProductMode ? null : mode === 'model' ? <StepWorkspace step={step} review={review} selectedKey={selectedPartKey} onSelectPart={setSelectedPartKey} onReview={() => setMode('analysis')} /> : mode === 'review' && review.current ? <ReviewWorkspace key={review.current.document.sha256} groupList={review.current.groupList} partList={review.current.partList} pageList={analysis.pageList} sourceUrl={analysis.sourceUrl} onChange={review.updatePart} onConfirm={review.confirmPart} onBulkApply={review.applyBulk} onConfirmMany={review.confirmMany} shapeRun={review.shapeNameRun} onRetryWithAwq={review.retryWithAwq} onSuggestFromArea={review.suggestFromArea} selectedKey={selectedPartKey} onSelectPart={setSelectedPartKey} /> : <Workspace $dragOver={isDragOver} onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragOver(false); }} onDrop={(event) => { event.preventDefault(); setIsDragOver(false); handleDrop(event.dataTransfer.files[0]); }}>
      {analysis.pageList.length ? <PageGallery pageList={partPages} total={Math.max(0, analysis.progress.total - (finishedPage ? 1 : 0))} selectedPage={selectedPage}
        onSelect={handleSelect} hasFinishedPage={!!finishedPage} productSummary={finished.ready && (finished.error
          ? <StatusNote role="alert">{finished.error}</StatusNote>
          : <FinishedProductSummary record={finished.record} candidate={candidatePage} onManage={() => setMode('product')} imageUrl={shownFinishedPage?.imageUrl}
            onView={shownFinishedPage ? () => handleSelect(shownFinishedPage) : undefined} />)} />
        : <UploadEmpty isLoading={isBusy} onChoose={() => inputRef.current?.click()} onExample={() => handleGenerate(null)} onAssembly={() => handleMode('assembly')} />}
      <Side>
        <TaskPanel progress={analysis.progress} status={analysis.status} pageList={analysis.pageList} file={analysis.file} elapsedMs={analysis.elapsedMs} />
        {analysis.status === 'complete' && analysis.file && <PdfModelAvailability plan={flangePlan} results={flangeDrafts} isScanning={!!outlineInput && !outlines}
          fallback={!canTryDraft ? 'off' : hasKnownModels ? 'choose' : !drawingDraft ? 'preparing' : linkedDrawing ? 'linked' : drawingDraft.shape ? 'ready' : 'choose'} hasLibraryModels={libraryCount > 0}
          onGenerate={(draft) => handleGenerate(analysis.file, draft)} onFallback={() => { setIsDraftOpened(true); setMode('drawing-draft'); }} />}
        {libraryPlan && (libraryPlan.count > 0 || libraryPlan.issues.length > 0) && <LibraryNotice>
          <strong>라이브러리 3D · {libraryPlan.rows.length}종 {libraryPlan.count}개</strong>
          {libraryPlan.limitMessage && <p>{libraryPlan.limitMessage}</p>}
          {libraryPlan.issues.length > 0 && <details><summary>배치 제외 {libraryPlan.issues.length}종 보기</summary><ul>{libraryPlan.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></details>}
        </LibraryNotice>}
        {analysis.error && <ErrorBox role="alert">{analysis.error}<ActionButton onClick={() => analysis.file ? handleFile(analysis.file) : inputRef.current?.click()}>다시 시도</ActionButton></ErrorBox>}
        {analysis.status === 'cancelled' && <StatusNote role="status">분석을 중지했습니다. 완료된 페이지의 결과는 확인하거나 저장할 수 있습니다.</StatusNote>}
        <ResultPanel key={analysis.file?.name ?? 'empty'} pageList={analysis.pageList} selectedPage={selectedPage} onInspect={handleInspect} />
      </Side>
    </Workspace>}
    <PdfModelExample key={generationInput.version} isActive={mode === 'generate'} initialFile={generationInput.file} initialDraft={generationInput.draft}
      onRegistered={generationInput.draft && current ? handleRegistration : undefined} onFileLoaded={(file) => setGenerationInput((value) => value.version === generationInput.version ? { ...value, file } : value)} />
    {isDraftOpened && current && <DrawingDraftWorkspace key={current.document.sha256 + ':parts:' + (finishedPage ?? 'all')} active={mode === 'drawing-draft'} drawing={current.document} pages={partPages}
      sourceUrl={analysis.sourceUrl} initialShape={drawingDraft?.shape ?? null} initialPart={{
        partNumber: singlePart ? current.groupList[0].partNumber : '', name: (singlePart && !singlePart.hasTemporaryName ? singlePart.name : current.document.name.replace(/\.pdf$/i, '')).slice(0, 200),
        material: singlePart?.material ?? '', quantity: quantity && Number.isSafeInteger(quantity) ? String(quantity) : '',
      }} onRegistered={(match, key, quantity) => openRegisteredModel(match, { key, partNumber: match.partNumber, quantity })} onStep={() => handleMode('model')} />}
    {mode === 'product' && current && <FinishedProductWorkspace key={current.document.sha256} document={current.document} pages={analysis.pageList}
      sourceUrl={analysis.sourceUrl} record={finished.record} candidate={candidatePage} partCount={current.groupList.length}
      onSave={finished.save} onModel={() => setMode('product-draft')} onParts={() => setMode('review')} />}
    {mode === 'product-draft' && current && finished.record && finishedPage && (productDraft
      ? <DrawingDraftWorkspace key={current.document.sha256 + ':product:' + finishedPage} active drawing={current.document} pages={productPages}
        sourceUrl={analysis.sourceUrl} initialShape={productDraft.shape} initialPart={{ partNumber: finished.record.number, name: finished.record.name, material: '', quantity: '1' }}
        product={{ pageNumber: finishedPage, saved: finished.record.model?.pageNumber === finishedPage ? finished.record.model : undefined, onSaveModel: saveProductModel }} />
      : <AssemblyLoading role="status">완제품 도면에서 입체 구조를 찾고 있습니다.</AssemblyLoading>)}
    {isAssemblyOpened && <AssemblyWorkspace isActive={mode === 'assembly'} />}
    {current && libraryPlan && libraryCount > 0 && <LibraryAssemblyWorkspace key={current.document.sha256 + libraryPlan.key} isActive={mode === 'library-assembly'} drawing={current.document} plan={libraryPlan} saveReview={current.isDirty ? review.save : undefined} />}
    {!isGenerationMode && !isAssemblyMode && !isProductMode && <UploadDevFooter mode={mode} analysis={analysis} review={review} onMode={handleMode} onPdf={() => inputRef.current?.click()} onReviewJson={() => reviewInputRef.current?.click()} onRetry={() => analysis.file && handleFile(analysis.file, { ocrMode: analysis.ocrMode })} onOcrRetry={() => analysis.file && handleFile(analysis.file, { ocrMode: 'force' })} libraryCount={libraryCount} />}
    <input ref={inputRef} aria-label="분석할 PDF 선택" type="file" accept=".pdf,application/pdf" hidden onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ''; }} />
    <input ref={reviewInputRef} aria-label="검토 JSON 선택" type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void review.importFile(file); event.target.value = ''; }} />
    <SourceViewer page={isViewerOpen ? currentPage : null} source={source} sourceUrl={analysis.sourceUrl} onClose={() => setIsViewerOpen(false)} />
  </Stage>;
}
const Background = styled.div(({ theme }) => ({
  position: 'absolute', inset: 0, backgroundColor: theme.color.bgEdge,
  backgroundImage: 'radial-gradient(ellipse at 50% 40%,' + theme.color.bgCenter + ',transparent 70%)',
  '&::before': {
    content: '""', position: 'absolute', inset: 0, opacity: .25,
    backgroundImage: 'linear-gradient(' + theme.color.primaryLineWeak + ' 1px, transparent 1px),linear-gradient(90deg,' + theme.color.primaryLineWeak + ' 1px, transparent 1px)',
    backgroundSize: theme.space[8] + 'px ' + theme.space[8] + 'px',
  },
}));
const LibraryNotice = styled.div(({ theme }) => ({
  flexShrink: 0, border: '1px solid ' + theme.color.primaryLineWeak, padding: theme.space[3],
  fontSize: theme.size.sm, color: theme.color.inkMuted, overflowWrap: 'anywhere',
  strong: { color: theme.color.primarySoft }, summary: { cursor: 'pointer', marginTop: theme.space[2] },
  ul: { maxHeight: theme.space[8] * 2, overflow: 'auto', paddingLeft: theme.space[5], marginBottom: 0 },
}));
const Stepper = styled.ol(({ theme }) => ({
  position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 3 + theme.space[4],
  listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: theme.space[2],
}));
const Step = styled.li<{ $active: boolean; $done: boolean }>(({ theme, $active, $done }) => ({
  display: 'flex', alignItems: 'center', gap: theme.space[3], paddingTop: theme.space[3],
  borderTop: '2px solid ' + ($active || $done ? theme.color.primary : theme.color.primaryLineWeak),
  color: $active || $done ? theme.color.ink : theme.color.inkDisabled, fontSize: theme.size.md,
  small: { color: theme.color.inkDisabled, fontSize: theme.size.xs },
}));
const Workspace = styled.div<{ $dragOver: boolean }>(({ theme, $dragOver }) => ({
  position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 4 + theme.space[5],
  bottom: theme.space[8] + theme.space[5], display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: theme.space[6],
  outline: $dragOver ? '2px dashed ' + theme.color.primary : 'none', outlineOffset: theme.space[2],
}));
const Side = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', minHeight: 0, gap: theme.space[4] }));
const ErrorBox = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3], color: theme.color.danger, fontSize: theme.size.sm, lineHeight: 1.6 }));
const StatusNote = styled.p(({ theme }) => ({ margin: 0, color: theme.color.warning, fontSize: theme.size.sm, lineHeight: 1.6 }));
const AssemblyLoading = styled.div(({ theme }) => ({ position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 5 + theme.space[2], bottom: theme.space[8] + theme.space[5], display: 'grid', placeItems: 'center', border: '1px solid ' + theme.color.primaryLineWeak, fontSize: theme.size.lg }));
