'use client';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import styled from 'styled-components';
import { StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { CATEGORY_LABEL, LIBRARY_URL, libraryAssetUrl, type LibraryPart, type LibraryRole } from './libraryTypes';
import { LibraryControls, LibraryPanel, LibraryPanelTitle, LibraryStatus, LibraryToggle } from './libraryStyles';
import { LibraryAppearanceDialog } from './LibraryAppearanceDialog';
import { FINISH_LIST } from './modelAppearance';

const ModelPreview = dynamic(() => import('./LibraryModelPreview').then((module) => module.LibraryModelPreview), { ssr: false });
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function formatHistoryTime(iso: string) {
  const values = Object.fromEntries(dateFormat.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return values.year + '-' + values.month + '-' + values.day + ' ' + values.hour + ':' + values.minute;
}

export function LibraryDetail({ part, role, onEdit, onRefresh }: { part?: LibraryPart; role: LibraryRole; onEdit: () => void; onRefresh: () => void }) {
  const model = useRef<HTMLInputElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  async function upload(kind: 'model' | 'photo', file?: File) {
    if (!file || !part) return;
    setIsBusy(true); setError('');
    try {
      const response = await fetch(LIBRARY_URL + '/asset/' + kind + '?' + new URLSearchParams({ number: part.partNumber, role, name: file.name }), { method: 'PUT', body: file });
      if (!response.ok) throw new Error((await response.json()).error);
      onRefresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '파일을 업로드하지 못했습니다.'); }
    finally { setIsBusy(false); }
  }
  return <LibraryPanel aria-label="선택 부품 상세">
    <LibraryPanelTitle>3D 미리보기{part?.model && <LibraryStatus $approved>GLB 모델 있음</LibraryStatus>}</LibraryPanelTitle>
    <Preview>
      {part?.model ? <><ModelPreview url={libraryAssetUrl(part.model)} appearance={part.appearance} /><figcaption>드래그 회전 · 휠 확대</figcaption></>
        : part?.photo ? <Image src={libraryAssetUrl(part.photo)} alt={part.name + ' 사진'} fill unoptimized />
        : <span>{part ? '등록된 3D 모델이나 사진이 없습니다.' : '목록에서 부품을 선택하면 미리보기가 표시됩니다.'}</span>}
    </Preview>
    {part && <>
      <DetailBody>
        <Heading><div><h2>{part.partNumber}</h2><h3>{part.name}</h3></div><LibraryStatus $approved={part.status === 'approved'}>{part.status === 'approved' ? '승인' : '승인 대기'}</LibraryStatus></Heading>
        <Metadata>{[
          ['분류', CATEGORY_LABEL[part.category]], ['규격', part.specification], ['재질', part.material],
          ['개정', part.revision], ['근거', part.source], ['치수', part.dimensionList.map(({ value, unit }) => value + ' ' + unit).join(' · ')],
          ...(part.appearance ? [['외관', [part.appearance.colorCode || part.appearance.color, FINISH_LIST[part.appearance.finish].label, part.appearance.treatment].filter(Boolean).join(' · ')]] : []),
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</Metadata>
        <SectionTitle>사용처</SectionTitle><HistoryRow>{part.usage || '미지정'}</HistoryRow>
        <SectionTitle>변경 이력</SectionTitle>
        {part.history.map((item, index) => <HistoryRow key={item.date + index}><b>{item.revision}</b><time dateTime={item.date} title="한국 표준시">{formatHistoryTime(item.date)}</time><span>{item.role}</span><span>{item.action}</span></HistoryRow>)}
      </DetailBody>
      <Actions>
        <input hidden ref={model} aria-label="GLB 모델 선택" type="file" accept=".glb" onChange={(event) => { void upload('model', event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
        <input hidden ref={photo} aria-label="부품 사진 선택" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void upload('photo', event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
        <LibraryToggle $active disabled={isBusy} onClick={() => model.current?.click()}>{part.model ? '3D 모델(GLB) 교체' : '3D 모델(GLB) 등록'}</LibraryToggle>
        <LibraryToggle $active disabled={isBusy} onClick={() => photo.current?.click()}>부품 사진 올리기</LibraryToggle>
        <LibraryToggle disabled={isBusy} onClick={onEdit}>부품 정보 수정</LibraryToggle>
        <LibraryToggle disabled={isBusy} onClick={() => setIsAppearanceOpen(true)}>외관 설정</LibraryToggle>
        {isBusy && <StateText role="status">파일 저장 중</StateText>}
        {error && <StateText role="alert" $tone="danger">{error}</StateText>}
      </Actions>
      {isAppearanceOpen && <LibraryAppearanceDialog part={part} role={role} onClose={() => setIsAppearanceOpen(false)} onSaved={onRefresh} />}
    </>}
  </LibraryPanel>;
}

const Preview = styled.figure(({ theme }) => ({
  margin: 0, position: 'relative', flexShrink: 0, height: 'clamp(190px,29dvh,345px)', display: 'grid', placeItems: 'center',
  background: 'radial-gradient(ellipse at 55% 70%, ' + theme.color.primaryFill + ', transparent 66%)',
  borderBottom: '1px solid ' + theme.color.bgCenter, color: theme.color.inkMuted, textAlign: 'center', fontSize: theme.size.sm,
  img: { objectFit: 'contain', padding: theme.space[4] },
  figcaption: { position: 'absolute', bottom: theme.space[3], left: theme.space[4], pointerEvents: 'none' },
}));
const DetailBody = styled.div(({ theme }) => ({ flex: 1, minHeight: 0, overflow: 'auto', padding: theme.space[4], fontSize: theme.size.sm, overflowWrap: 'anywhere' }));
const Heading = styled.div(({ theme }) => ({
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.space[2],
  h2: { margin: 0, fontFamily: theme.font.mono, fontSize: theme.size.xl }, h3: { margin: theme.space[2] + 'px 0 0', fontSize: theme.size.lg },
}));
const Metadata = styled.dl(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: theme.space[3], marginBlock: theme.space[4],
  div: { display: 'grid', gridTemplateColumns: '65px minmax(0,1fr)', gap: theme.space[2] },
  dt: { color: theme.color.inkMuted }, dd: { margin: 0 },
  '@media (max-width: 540px)': { gridTemplateColumns: 'minmax(0,1fr)' },
}));
const SectionTitle = styled.h4(({ theme }) => ({ color: theme.color.primary, font: '500 ' + theme.size.sm + 'px ' + theme.font.mono, margin: theme.space[4] + 'px 0 0' }));
const HistoryRow = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[3], paddingBlock: theme.space[2],
  borderBottom: '1px solid ' + theme.color.bgCenter, b: { color: theme.color.primary }, time: { color: theme.color.inkMuted, fontFamily: theme.font.mono },
}));
const Actions = styled(LibraryControls)(({ theme }) => ({ padding: theme.space[4], flexShrink: 0 }));
