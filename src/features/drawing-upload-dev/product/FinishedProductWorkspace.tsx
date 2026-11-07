'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { ReviewDocument as DrawingDocument } from '../review/reviewTypes';
import type { DrawingPage } from '../types';
import { ReviewDocument } from '../review/ReviewDocument';
import { ReviewBody, ReviewHeader, ReviewInput, ReviewLabel, ReviewPanel, ReviewTitle } from '../review/reviewStyles';
import { ActionButton, Muted } from '../ui/sharedStyles';
import { TaskFooter } from '../ui/TaskFooter';
import { downloadFlangeFile, flangeFilename } from '../generate/flangePersistence';
import type { FinishedProduct, FinishedProductInfo } from './finishedProductStore';

const ModelPreview = dynamic(() => import('@/features/part-library/LibraryModelPreview').then((module) => module.LibraryModelPreview), { ssr: false });

export function FinishedProductWorkspace({ document, pages, sourceUrl, record, candidate, partCount, onSave, onModel, onParts }: {
  document: DrawingDocument; pages: DrawingPage[]; sourceUrl: string | null; record: FinishedProduct | null;
  candidate: number | null; partCount: number; onSave: (record: FinishedProductInfo) => Promise<void>;
  onModel: () => void; onParts: () => void;
}) {
  const [name, setName] = useState(record?.name ?? document.name.replace(/\.pdf$/i, '').slice(0, 200));
  const [number, setNumber] = useState(record?.number ?? '');
  const [page, setPage] = useState(record ? record.pageNumber : candidate);
  const [viewedPage, setViewedPage] = useState(page ?? pages[0]?.pageNumber ?? 1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ message: '', error: false });
  const model = page !== null ? record?.model : null;
  const [modelUrl, setModelUrl] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!model) return;
    let active = true;
    let url: string | undefined;
    void Promise.resolve().then(() => {
      if (!active) return;
      url = URL.createObjectURL(model.blob);
      setModelUrl({ blob: model.blob, url });
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [model]);
  const save = async (editModel: boolean) => {
    setSaving(true); setNotice({ message: '', error: false });
    try {
      await onSave({ pageNumber: page, name: name.trim(), number: number.trim() });
      if (editModel) onModel();
      else setNotice({ message: page ? '완제품 정보를 저장했습니다.' : '완제품 도면 지정을 해제했습니다.', error: false });
    } catch {
      setNotice({ message: '완제품 정보를 저장하지 못했습니다. 다시 시도해 주세요.', error: true });
    } finally { setSaving(false); }
  };
  const isValid = page === null || !!name.trim();
  return <>
    <Workspace aria-label="완제품 관리 화면">
      <ReviewDocument pageList={pages} pageNumber={viewedPage} source={null} sourceUrl={sourceUrl} onPageChange={setViewedPage} emptyMessage="대표 도면의 원문을 확인하세요." />
      <ReviewPanel>
        <ReviewHeader><ReviewTitle>완제품 정보</ReviewTitle><Muted>{record?.pageNumber ? '저장됨' : candidate ? '후보 검토' : '도면 지정'}</Muted></ReviewHeader>
        <Fields>
          <ReviewLabel>대표 도면<PageSelect aria-label="완제품 대표 도면" value={page ?? ''} onChange={(event) => {
            const next = event.target.value ? Number(event.target.value) : null;
            setPage(next); setNotice({ message: '', error: false });
            if (next) setViewedPage(next);
          }}>
            <option value="">완제품 도면 없음</option>
            {pages.map(({ pageNumber }) => <option key={pageNumber} value={pageNumber}>{pageNumber}쪽</option>)}
          </PageSelect></ReviewLabel>
          <ReviewLabel>제품명<ReviewInput aria-label="완제품 이름" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></ReviewLabel>
          <ReviewLabel>제품번호<ReviewInput aria-label="완제품 번호" maxLength={200} value={number} placeholder="선택 입력" onChange={(event) => setNumber(event.target.value)} /></ReviewLabel>
          <Muted>부품표에서 읽은 {partCount}종은 부품 검토 화면에서 따로 관리합니다.</Muted>
        </Fields>
        <ReviewHeader><ReviewTitle>완제품 3D</ReviewTitle><Muted>{model ? (model.confirmedAt ? '치수 검토 완료' : '비율 초안') + ' · ' + model.pageNumber + '쪽에서 생성' : '저장된 모델 없음'}</Muted></ReviewHeader>
        <Preview aria-label="저장된 완제품 3D">
          {model && modelUrl && modelUrl.blob === model.blob ? <ModelPreview url={modelUrl.url} withinStage />
            : <Muted>{model ? '저장된 모델을 준비하는 중입니다.' : '대표 도면을 지정하고 완제품 3D를 만들 수 있습니다.'}</Muted>}
        </Preview>
      </ReviewPanel>
    </Workspace>
    <TaskFooter message={notice.message || '완제품 정보와 모델은 이 브라우저에서 같은 PDF를 열면 복원됩니다.'} isError={notice.error}
      items={model ? [{ label: '완제품 GLB 내려받기', onClick: () => downloadFlangeFile(model.blob, flangeFilename(number || name) + '-product.glb') }] : []}>
      <ActionButton disabled={!partCount || saving} onClick={onParts}>부품 검토·보정</ActionButton>
      <ActionButton disabled={!page || !isValid || saving} onClick={() => void save(true)}>{model ? '완제품 3D 편집' : '완제품 3D 만들기'}</ActionButton>
      <ActionButton $primary disabled={!isValid || saving} onClick={() => void save(false)}>{saving ? '저장 중' : '완제품 정보 저장'}</ActionButton>
    </TaskFooter>
  </>;
}

const Workspace = styled.div(({ theme }) => ({
  position: 'absolute', inset: '280px 64px 88px', display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: theme.space[4],
}));
const Fields = styled(ReviewBody)(({ theme }) => ({
  display: 'grid', flex: '0 0 auto', gridTemplateColumns: 'minmax(0,.65fr) minmax(0,1fr) minmax(0,1fr)',
  '& > span': { gridColumn: '1 / -1' }, gap: theme.space[3],
}));
const PageSelect = styled.select(({ theme }) => ({
  minHeight: theme.space[6] + theme.space[2], minWidth: 0, width: '100%', font: 'inherit', color: theme.color.ink,
  padding: theme.space[2], background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLine,
}));
const Preview = styled.div(({ theme }) => ({
  position: 'relative', minHeight: 0, flex: 1, display: 'grid', placeItems: 'center', padding: theme.space[4],
  background: `radial-gradient(ellipse at center, ${theme.color.bgCenter}, ${theme.color.bgEdge})`,
}));
