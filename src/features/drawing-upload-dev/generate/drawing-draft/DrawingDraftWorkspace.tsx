'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { AppearanceEditor } from '@/features/part-library/AppearanceEditor';
import type { LibraryMatch } from '@/features/part-library/libraryTypes';
import type { ReviewDocument as DrawingDocument } from '../../review/reviewTypes';
import { ReviewDocument } from '../../review/ReviewDocument';
import { ReviewBody, ReviewHeader, ReviewInput, ReviewLabel, ReviewPanel, ReviewTitle } from '../../review/reviewStyles';
import { ActionButton, Muted, StateText } from '../../ui/sharedStyles';
import { TaskFooter } from '../../ui/TaskFooter';
import { StepPreviewBoundary } from '../../model/StepPreviewBoundary';
import type { DrawingPage, Evidence, SourceRect } from '../../types';
import { RegisterModelDialog } from '../RegisterFlangeDialog';
import { downloadFlangeFile, flangeFilename } from '../flangePersistence';
import type { FlangePart } from '../flangeTypes';
import { DraftDimensions, dimensionOptions, type DimensionOption } from './DraftDimensions';
import { readDrawingDraftSettings, saveDrawingDraftSettings, type DrawingDraftSettings } from './draftStorage';
import { draftDisplaySize, drawingShapeKey, readDraftSize, type DrawingShape, type DraftAxis } from './draftGeometry';
import { readDrawingSelection } from './readDrawingShape';
import { useSupplementDrawing } from './useSupplementDrawing';
import { DRAWING_VIEWS, VIEW_LABEL, type DrawingView, type ViewRegions } from './orthographicHull';
import { readOrthographicShape, readViewRegions } from './readOrthographicViews';
import { buildIsometricDraft, ISOMETRIC_BLOCK_LIMIT, type BoxAnchors, type DrawingPoint, type IsometricDraft } from './isometricDraft';
import type { FinishedProductModel } from '../../product/finishedProductStore';

const Scene = dynamic(() => import('./DrawingDraftScene'), { ssr: false, loading: () => <p>입체 모델을 준비합니다.</p> });
const partFields = [['partNumber', '부품번호'], ['name', '품명'], ['quantity', '수량']] as const;
const anchorInstructions = ['가장 가까운 윗모서리', '왼쪽 위 모서리의 끝점', '오른쪽 위 모서리의 끝점', '첫 점 바로 아래의 끝점'];

export function DrawingDraftWorkspace({ active, drawing, pages, sourceUrl, initialShape, initialPart, onRegistered, onStep, product }: {
  active: boolean; drawing: DrawingDocument; pages: DrawingPage[]; sourceUrl: string | null; initialShape: DrawingShape | null; initialPart: FlangePart;
  onRegistered?: (match: LibraryMatch, sourceKey: string, quantity: number) => void;
  onStep?: () => void;
  product?: { pageNumber: number; saved?: FinishedProductModel; onSaveModel: (model: FinishedProductModel) => Promise<void> };
}) {
  const [settings, setSettings] = useState<DrawingDraftSettings>(() => {
    const saved = product?.saved?.draft ?? readDrawingDraftSettings(product ? drawing.sha256 + ':product:' + product.pageNumber : drawing.sha256, initialPart, drawing.pageCount);
    const allowed = (pageNumber: number) => pages.some((page) => page.pageNumber === pageNumber);
    const viewRegions = saved.viewRegions && Object.fromEntries(Object.entries(saved.viewRegions).filter(([, region]) => allowed(region.pageNumber)));
    return { ...saved, viewRegions: viewRegions && Object.keys(viewRegions).length ? viewRegions : undefined,
      area: saved.area && allowed(saved.area.pageNumber) ? saved.area : undefined,
      isometric: saved.isometric && allowed(saved.isometric.pageNumber) ? saved.isometric : undefined };
  });
  const [shape, setShape] = useState(() => {
    const saved = settings.isometric, source = saved && pages.find((item) => item.pageNumber === saved.pageNumber);
    return source && saved ? buildIsometricDraft(source, saved) : settings.area || settings.viewRegions ? null : initialShape;
  });
  const [isReading, setIsReading] = useState(!!settings.area || !!(settings.viewRegions && readViewRegions(settings.viewRegions)));
  const [page, setPage] = useState(settings.isometric?.pageNumber ?? initialShape?.pageNumber ?? pages[0]?.pageNumber ?? 1);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [showSupplement, setShowSupplement] = useState(false);
  const [selecting, setSelecting] = useState<DrawingView | 'stool' | null>(null);
  const [showViews, setShowViews] = useState(initialShape?.kind === 'orthographic' || !!settings.viewRegions || (!initialShape && !settings.isometric));
  const [anchorPoints, setAnchorPoints] = useState<DrawingPoint[] | null>(null);
  const [selectedBlock, setSelectedBlock] = useState(0);
  const [sideLeft, setSideLeft] = useState(settings.viewRegions?.side?.leftSide ?? (initialShape?.kind === 'orthographic' && !!initialShape.regions.side.leftSide));
  const [tab, setTab] = useState<'dimensions' | 'appearance' | 'part'>('dimensions');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmedAt, setConfirmedAt] = useState<string | null>(product?.saved?.confirmedAt ?? null);
  const [register, setRegister] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [command, setCommand] = useState(0);
  const [view, setView] = useState<'oblique' | 'side'>('oblique');
  const [previewKey, setPreviewKey] = useState(0);
  const upload = useRef<HTMLInputElement>(null);
  const supplement = useSupplementDrawing();
  const area = settings.area;
  const manualViews = settings.viewRegions;
  useEffect(() => {
    const controller = new AbortController();
    const views = manualViews && readViewRegions(manualViews);
    const source = area && pages.find((item) => item.pageNumber === area.pageNumber);
    const task = views ? readOrthographicShape(pages, views, controller.signal)
      : area && source ? readDrawingSelection(source, area.rect, controller.signal) : null;
    if (!task) return;
    void task.then((result) => {
      if (controller.signal.aborted) return;
      if (result) { setShape(result); setPage(result.pageNumber); setEvidence(null); }
      else setError(views ? '세 도면의 외곽이나 비율을 맞출 수 없습니다. 같은 부품의 잘리지 않은 투상도를 지정해 주세요.'
        : '선택한 영역에서 부품의 입체 배치를 확인하지 못했습니다.');
    }).catch(() => { if (!controller.signal.aborted) setError('선택한 영역을 읽지 못했습니다.'); })
      .finally(() => { if (!controller.signal.aborted) setIsReading(false); });
    return () => controller.abort();
  }, [area, manualViews, pages]);
  const display = useMemo(() => draftDisplaySize(settings.size, shape), [settings.size, shape]);
  const complete = readDraftSize(settings.size);
  const part = product ? { ...settings.part, partNumber: initialPart.partNumber, name: initialPart.name } : settings.part;
  const canConfirm = !!(shape && complete && part.name.trim() &&
    (product || (part.partNumber.trim() && part.material.trim() && /^[1-9]\d{0,3}$|^10000$/.test(part.quantity.trim()))));
  const options = useMemo(() => [...dimensionOptions(pages, drawing.name, false), ...dimensionOptions(supplement.source?.pages ?? [], supplement.source?.name ?? '', true)], [pages, drawing.name, supplement.source]);
  if (!active) return null;
  const update = (next: DrawingDraftSettings) => { setSettings(next); setConfirmedAt(null); setError(''); setMessage(''); };
  const edit = (axis: DraftAxis, value: string, source?: string) => {
    update({ ...settings, size: { ...settings.size, [axis]: value }, sources: { ...settings.sources, [axis]: source } });
  };
  const useDimension = (axis: DraftAxis, option: DimensionOption) => {
    edit(axis, String(option.mm), (option.file + ' · ' + option.source.pageNumber + '쪽 · ' + option.source.text).slice(0, 250));
    setShowSupplement(option.auxiliary); setPage(option.source.pageNumber); setEvidence(option.source);
  };
  const exportGlb = async () => {
    if (!shape || (!product && !complete)) throw new Error('먼저 모델의 실제 가로·세로·깊이를 입력해 주세요.');
    const { exportDrawingDraft } = await import('./exportDrawingDraft');
    return exportDrawingDraft(shape, complete ?? display, { partNumber: part.partNumber.trim(), name: part.name.trim(), material: part.material.trim(), quantity: part.quantity.trim() },
      settings.appearance, drawing, confirmedAt, settings.sources, product ? complete ? 'provided' : 'proportional' : undefined);
  };
  const saveProduct = async () => {
    if (!product || !shape) return;
    setIsExporting(true); setError('');
    try { await product.onSaveModel({ blob: await exportGlb(), pageNumber: shape.pageNumber, confirmedAt, draft: { ...settings, part } }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '완제품 모델을 저장하지 못했습니다.'); }
    finally { setIsExporting(false); }
  };
  const save = () => {
    try { saveDrawingDraftSettings(drawing.sha256, settings); setMessage('이 브라우저에 도면 영역, 치수와 외관을 저장했습니다.'); setError(''); }
    catch { setError('브라우저에 초안을 저장하지 못했습니다.'); }
  };
  const visibleViews = manualViews ?? (shape?.kind === 'orthographic' ? shape.regions : {});
  const singleView = shape?.kind === 'isometric' ? shape.draft : null;
  const block = singleView?.blocks[selectedBlock];
  const applySingleView = (draft: IsometricDraft) => {
    const source = pages.find((item) => item.pageNumber === draft.pageNumber);
    const next = source && buildIsometricDraft(source, draft);
    if (!next && draft.blocks.length) return false;
    update({ ...settings, isometric: next ? draft : undefined, area: undefined, viewRegions: undefined });
    setShape(next || null); setIsReading(false); setEvidence(null);
    return true;
  };
  const addAnchor = (point: DrawingPoint) => {
    if (!anchorPoints) return;
    const points = [...anchorPoints, point];
    if (points.length < 4) { setAnchorPoints(points); return; }
    const blocks = [...(singleView?.blocks ?? []), { anchors: points as BoxAnchors, depthPercent: 100, liftPercent: 0 }];
    if (applySingleView({ pageNumber: page, blocks })) {
      setAnchorPoints(null); setSelectedBlock(blocks.length - 1);
    } else {
      setAnchorPoints([]);
      setError('세 모서리의 방향을 맞출 수 없습니다. 가까운 윗모서리에서 시작해 왼쪽·오른쪽·아래 끝점을 다시 지정해 주세요.');
    }
  };
  const chooseRegion = (pageNumber: number, rect: SourceRect) => {
    setSelecting(null); setShape(null); setEvidence(null);
    if (!selecting || selecting === 'stool') {
      setIsReading(true);
      update({ ...settings, isometric: undefined, viewRegions: undefined, area: { pageNumber, rect } });
      return;
    }
    const viewRegions: Partial<ViewRegions> = { ...visibleViews, [selecting]: { pageNumber, rect, leftSide: selecting === 'side' && sideLeft } };
    const ready = !!readViewRegions(viewRegions);
    setIsReading(ready);
    update({ ...settings, isometric: undefined, area: undefined, viewRegions });
    if (!ready && DRAWING_VIEWS.every((key) => viewRegions[key])) setError('서로 겹치지 않는 세 방향 도면 영역을 지정해 주세요.');
  };
  const sourceEvidence = showSupplement ? evidence : evidence ?? (shape ? { pageNumber: shape.pageNumber, rect: shape.rect,
    text: shape.kind === 'orthographic' ? '정면도 · 입체 모델 생성 근거'
      : shape.kind === 'isometric' ? '입체도 · ' + shape.solids.length + '개 부피를 추정한 영역' : '상판·발판·좌우 프레임 배치를 확인한 영역' } : null);
  return <>
    <Workspace aria-label="도면 입체 모델 편집">
      <DocumentPanel>
        <Controls>
          {initialShape?.kind === 'step-stool' && <ActionButton onClick={() => { setShowSupplement(false); setSelecting('stool'); setEvidence(null); setAnchorPoints(null); }}>도면 영역 선택</ActionButton>}
          <ActionButton aria-expanded={showViews} onClick={() => { setShowViews(!showViews); setSelecting(null); setAnchorPoints(null); }}>투상도 지정</ActionButton>
          <ActionButton disabled={!!anchorPoints || (singleView?.blocks.length ?? 0) >= ISOMETRIC_BLOCK_LIMIT} onClick={() => {
            setShowViews(false); setShowSupplement(false); setSelecting(null); setEvidence(null); setAnchorPoints([]);
            if (singleView) setPage(singleView.pageNumber);
          }}>입체도에서 부피 추가</ActionButton>
          {(area || manualViews || settings.isometric) && initialShape && <ActionButton onClick={() => {
            update({ ...settings, area: undefined, viewRegions: undefined, isometric: undefined }); setShape(initialShape); setPage(initialShape.pageNumber);
            setEvidence(null); setIsReading(false); setSelecting(null); setShowSupplement(false); setAnchorPoints(null); setSelectedBlock(0);
          }}>자동 감지 영역</ActionButton>}
          {supplement.source && <ActionButton onClick={() => { setShowSupplement(!showSupplement); setPage(showSupplement ? shape?.pageNumber ?? 1 : 1); setEvidence(null); setSelecting(null); setAnchorPoints(null); }}>{showSupplement ? '원본 도면 보기' : '보조 도면 보기'}</ActionButton>}
        </Controls>
        {showViews && <ViewControls aria-label="세 방향 투상도 지정">
          <Muted>같은 부품의 정면·평면·측면을 지정하면 3D 초안을 만듭니다.</Muted>
          {DRAWING_VIEWS.map((key) => {
            const region = visibleViews[key];
            return <ViewRow key={key} data-projection-view={key} data-selected={!!region}>
              <span>{VIEW_LABEL[key]}{region ? ' · ' + region.pageNumber + '쪽' : ''}</span>
              <div>
                {region && <SmallAction onClick={() => { setShowSupplement(false); setSelecting(null); setPage(region.pageNumber); setEvidence({ ...region, text: VIEW_LABEL[key] + ' · 입체 모델 생성 근거' }); }}>{VIEW_LABEL[key]} 보기</SmallAction>}
                <SmallAction aria-pressed={selecting === key} onClick={() => { setShowSupplement(false); setSelecting(key); setEvidence(null); }}>
                  {VIEW_LABEL[key]} {region ? '다시 지정' : '지정'}
                </SmallAction>
              </div>
            </ViewRow>;
          })}
          {selecting === 'side' && <label><input type="checkbox" checked={sideLeft} onChange={(event) => setSideLeft(event.target.checked)} /> 좌측에서 본 도면 (기본 우측)</label>}
        </ViewControls>}
        <ReviewDocument pageList={showSupplement ? supplement.source?.pages ?? [] : pages} pageNumber={page} source={sourceEvidence}
          sourceUrl={showSupplement ? supplement.source?.url ?? null : sourceUrl} onPageChange={(next) => { setPage(next); setEvidence(null); setAnchorPoints(null); }}
          pointSelection={anchorPoints && !showSupplement ? {
            points: anchorPoints, instruction: (anchorPoints.length + 1) + '/4 · ' + anchorInstructions[anchorPoints.length] + '를 선택하세요.',
            onPick: addAnchor, onCancel: () => setAnchorPoints(null),
          } : undefined}
          shapeSelection={selecting && !showSupplement ? {
            instruction: selecting === 'stool' ? '완성 형상이 보이는 영역을 선택하세요.' : VIEW_LABEL[selecting] + ' 하나의 외곽 전체를 지정하세요.',
            onCancel: () => setSelecting(null),
            onChoose: chooseRegion,
          } : undefined} />
      </DocumentPanel>
      <ReviewPanel aria-label="도면 입체 미리보기" data-drawing-draft-ready={!!shape} data-drawing-model-kind={shape?.kind}>
        <ReviewHeader><ReviewTitle>도면 입체 모델</ReviewTitle><StateText $tone={confirmedAt ? 'success' : 'warning'}>{confirmedAt ? '검토 확정' : shape ? complete ? '치수 입력됨' : singleView ? '입체도 추정 초안' : '비율 초안' : isReading ? '도면 확인 중' : '입체 근거 필요'}</StateText></ReviewHeader>
        <Viewport>{shape ? <StepPreviewBoundary key={previewKey} onRetry={() => setPreviewKey((value) => value + 1)}>
          <Scene shape={shape} size={display} appearance={settings.appearance} command={command} view={view} />
        </StepPreviewBoundary> : isReading ? <Muted role="status">입체 구조를 확인하는 중입니다.</Muted> :
          <EmptyPreview><Muted>입체도에서 모서리를 지정하거나 세 방향 투상도를 연결해 주세요.</Muted>
            {!showViews && <ActionButton onClick={() => setShowViews(true)}>세 방향 도면 지정</ActionButton>}{onStep && <ActionButton onClick={onStep}>STEP 파일 연결</ActionButton>}</EmptyPreview>}</Viewport>
        {shape && <Controls>
          <ActionButton onClick={() => { setView('oblique'); setCommand((value) => value + 1); }}>{singleView ? '도면 시점' : '시점 초기화'}</ActionButton>
          <ActionButton onClick={() => { setView('side'); setCommand((value) => value + 1); }}>측면 보기</ActionButton>
          <Muted>{shape.kind === 'orthographic' ? '세 방향 외곽으로 재구성 · 드래그 회전' : singleView ? singleView.blocks.length + '개 입체 부피 · 드래그 회전' : '상판·발판·지지 프레임 · 드래그 회전'}</Muted>
        </Controls>}
      </ReviewPanel>
      <ReviewPanel>
        <ReviewHeader><ReviewTitle>치수·외관 검토</ReviewTitle></ReviewHeader>
        <Controls>{([{ key: 'dimensions', label: '치수' }, { key: 'appearance', label: '외관' }, { key: 'part', label: '부품 정보' }] as const).filter((item) => !product || item.key !== 'part').map((item) =>
          <ActionButton key={item.key} $primary={tab === item.key} aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>{item.label}</ActionButton>)}</Controls>
        <ReviewBody>
          {tab === 'dimensions' && <>
            {shape?.kind === 'orthographic' && <Muted>뷰에 드러난 외곽과 개구부로 만든 초안입니다. 가려진 내부 형상과 조립품의 부품 경계는 별도 검토가 필요합니다.</Muted>}
            {singleView && block && <>
              <Muted>보이는 모서리로 만든 부피 초안입니다. 가려진 면, 구멍과 결합부는 별도 근거로 확인하세요.</Muted>
              <ReviewLabel>조정할 부피
                <BlockSelect aria-label="조정할 입체도 부피" value={selectedBlock} onChange={(event) => setSelectedBlock(Number(event.target.value))}>
                  {singleView.blocks.map((_, index) => <option key={index} value={index}>부피 {index + 1}</option>)}
                </BlockSelect>
              </ReviewLabel>
              <ReviewLabel>깊이 비율 · {block.depthPercent}%
                <RangeInput type="range" aria-label="부피 깊이 비율" min={10} max={300} value={block.depthPercent} onChange={(event) => {
                  const depthPercent = Number(event.target.value);
                  applySingleView({ ...singleView, blocks: singleView.blocks.map((item, index) => index === selectedBlock ? { ...item, depthPercent } : item) });
                }} />
              </ReviewLabel>
              {singleView.blocks.length > 1 && <ReviewLabel>바닥 높이 · {block.liftPercent}%
                <RangeInput type="range" aria-label="부피 바닥 높이" min={-300} max={300} value={block.liftPercent} onChange={(event) => {
                  const liftPercent = Number(event.target.value);
                  applySingleView({ ...singleView, blocks: singleView.blocks.map((item, index) => index === selectedBlock ? { ...item, liftPercent } : item) });
                }} />
              </ReviewLabel>}
              <SmallAction onClick={() => {
                if (applySingleView({ ...singleView, blocks: singleView.blocks.filter((_, index) => index !== selectedBlock) })) setSelectedBlock(0);
              }}>선택 부피 제거</SmallAction>
            </>}
            <DraftDimensions values={settings.size} sources={settings.sources} options={options} isLoading={supplement.loading} supplementName={supplement.source?.name} onAttach={() => upload.current?.click()} onEdit={edit} onUse={useDimension} />
          </>}
          {tab === 'appearance' && <AppearanceEditor appearance={settings.appearance} material={part.material} onChange={(appearance, material) => update({ ...settings, appearance, part: { ...part, material } })} />}
          {tab === 'part' && <>{partFields.map(([key, label]) => <ReviewLabel key={key}>{label}<ReviewInput aria-label={'초안 ' + label} maxLength={200} value={part[key]} onChange={(event) => update({ ...settings, part: { ...part, [key]: event.target.value } })} /></ReviewLabel>)}<Muted>실제 재질은 외관 탭에서 입력할 수 있습니다.</Muted></>}
        </ReviewBody>
        <Controls><ActionButton disabled={!canConfirm || !!confirmedAt} onClick={() => { setConfirmedAt(new Date().toISOString()); setMessage('치수와 외관을 검토 확정했습니다.'); }}>이 모델 검토 확정</ActionButton></Controls>
      </ReviewPanel>
    </Workspace>
    <TaskFooter isError={!!(error || supplement.error)} message={error || supplement.error || message || (product
      ? '비율 초안은 바로 저장할 수 있습니다. 실제 치수로 보정한 뒤 검토를 확정하세요.' : '실제 치수와 부품 정보를 확인한 뒤 라이브러리에 등록하세요.')} items={product ? [] : [
      { label: '3D 내보내기 · GLB', onClick: () => {
        setIsExporting(true);
        void exportGlb().then((blob) => downloadFlangeFile(blob, flangeFilename(part.partNumber) + '-drawing.glb')).catch((reason) => setError(reason.message)).finally(() => setIsExporting(false));
      }, disabled: !shape || !complete || isExporting },
    ]}>{product ? <ActionButton $primary disabled={!shape || isExporting} onClick={() => void saveProduct()}>{isExporting ? '완제품 저장 중' : '완제품 모델 저장'}</ActionButton> : <>
      <ActionButton disabled={!shape && !manualViews} onClick={save}>초안 저장</ActionButton><ActionButton $primary disabled={!confirmedAt || !canConfirm} onClick={() => setRegister(true)}>라이브러리에 GLB 등록</ActionButton>
    </>}</TaskFooter>
    {register && shape && onRegistered && <RegisterModelDialog endpoint="drawing" name={part.partNumber + ' · ' + part.name} createGlb={exportGlb} onClose={() => setRegister(false)}
      onRegistered={(match) => { setRegister(false); onRegistered(match, drawingShapeKey(shape), Number(part.quantity)); }} />}
    <input ref={upload} hidden type="file" accept=".pdf,application/pdf" aria-label="보조 치수 도면 PDF 선택" onChange={(event) => {
      const file = event.target.files?.[0]; if (file) void supplement.load(file); event.target.value = '';
    }} />
  </>;
}

const Workspace = styled.div(({ theme }) => ({ position: 'absolute', inset: '280px 64px 88px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr) minmax(0,.95fr)', gap: theme.space[4] }));
const DocumentPanel = styled.div({ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, '& > section': { flex: 1 } });
const Controls = styled.div(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2], padding: theme.space[3], flexShrink: 0 }));
const Viewport = styled.div(({ theme }) => ({ flex: 1, position: 'relative', display: 'grid', placeItems: 'center', background: `radial-gradient(ellipse at center, ${theme.color.bgCenter}, ${theme.color.bgEdge})` }));
const EmptyPreview = styled.div(({ theme }) => ({ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: theme.space[3], padding: theme.space[4] }));
const ViewControls = styled.div(({ theme }) => ({ flexShrink: 0, display: 'grid', gap: theme.space[1], padding: theme.space[2], fontSize: theme.size.sm }));
const ViewRow = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[2], '& > div': { display: 'flex', gap: theme.space[1] } }));
const SmallAction = styled(ActionButton)(({ theme }) => ({ minHeight: theme.space[5], padding: theme.space[1], fontSize: theme.size.sm }));
const BlockSelect = styled.select(({ theme }) => ({
  width: '100%', color: theme.color.ink, background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLine, padding: theme.space[1],
}));
const RangeInput = styled(ReviewInput)(({ theme }) => ({ accentColor: theme.color.primary, minHeight: theme.space[5], padding: 0 }));
