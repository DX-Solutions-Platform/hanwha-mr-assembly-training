import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ActionButton } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { PracticeCardContent } from './PracticeCardContent';
import { getPracticeCardImageSource, type PracticeCardFigures } from './practiceCardFigures';
import { getPracticeCardThemeStyle, PRACTICE_CARD_THEMES } from './practiceCardThemes';
import { PRACTICE_CAPTION_LIMIT, PRACTICE_CARD_IMAGE_LIMIT, PRACTICE_CARD_IMAGE_SHARE, PRACTICE_CARD_TITLE_LIMIT, readPracticeSceneCard,
  type PracticeCardLayout, type PracticeSceneCard } from './practiceTrayLayout';

const layouts: { value: PracticeCardLayout; label: string }[] = [
  { value: 'image', label: '이미지만' }, { value: 'text', label: '텍스트만' }, { value: 'combined', label: '이미지 + 텍스트' },
];
const imageSources = [
  { value: 'during', label: '조립 중인 부품' }, { value: 'after', label: '조립한 후의 모습' },
] as const;

async function prepareImage(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    for (const maxSide of [960, 720, 480, 320]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL('image/webp', 0.8);
      if (src.length <= PRACTICE_CARD_IMAGE_LIMIT) return src;
    }
    return null;
  } finally { bitmap.close(); }
}

export function PracticeCardEditor({ initial, figures, existing, onSave, onClose }: {
  initial: PracticeSceneCard; figures: PracticeCardFigures; existing: boolean;
  onSave: (card: PracticeSceneCard | null) => Promise<boolean>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const pending = busy || uploading;
  const validated = readPracticeSceneCard(draft);
  const canSave = !!validated && (draft.layout === 'text' || !!getPracticeCardImageSource(draft.image, figures));
  const previewAspect = draft.size.width / draft.size.height;

  useEffect(() => {
    const current = dialog.current;
    current?.showModal();
    return () => { current?.close(); };
  }, []);

  function patch(fields: Partial<PracticeSceneCard>) {
    setError('');
    setDraft((current) => ({ ...current, ...fields }));
  }

  async function upload(file: File) {
    setUploading(true);
    setError('');
    try {
      const src = await prepareImage(file);
      if (!src) throw new Error('Image is too large or unsupported');
      patch({ image: { kind: 'upload', src } });
    } catch {
      setError('12MB 이하의 PNG, JPG 또는 WebP 이미지를 선택해 주세요.');
    } finally { setUploading(false); }
  }

  async function save(card: PracticeSceneCard | null) {
    if (pending) return;
    setBusy(true);
    setError('');
    if (await onSave(card)) onClose();
    else { setBusy(false); setError('카드를 저장하지 못했습니다. 다시 시도해 주세요.'); }
  }

  return <EditorDialog ref={dialog} aria-label={existing ? '설명 카드 편집' : '설명 카드 만들기'} onCancel={(event) => {
    event.preventDefault();
    if (!pending) onClose();
  }}>
    <EditorForm onSubmit={(event) => { event.preventDefault(); if (canSave) void save(validated); }}>
      <Heading>
        <h2>{existing ? '설명 카드 편집' : '설명 카드 만들기'}</h2>
        <span>카드 구성을 고르고 오른쪽에서 미리 확인하세요.</span>
      </Heading>
      <EditorGrid>
        <Fields disabled={pending}>
          <Field>
            <strong>카드 구성</strong>
            <Options role="group" aria-label="카드 구성">
              {layouts.map(({ value, label }) => <ActionButton key={value} type="button" $primary={draft.layout === value}
                aria-pressed={draft.layout === value} onClick={() => patch({ layout: value })}>{label}</ActionButton>)}
            </Options>
          </Field>
          <Field>
            <strong>설명창 테마</strong>
            <ThemePalette role="group" aria-label="설명창 테마">
              {PRACTICE_CARD_THEMES.map(({ id, label, color }) => <ThemeOption key={id} type="button"
                aria-pressed={draft.theme === id} title={`${label} ${color}`} onClick={() => patch({ theme: id })}>
                <Swatch style={{ backgroundColor: color }} aria-hidden="true" />
                {label}
              </ThemeOption>)}
            </ThemePalette>
          </Field>
          {draft.layout !== 'text' && <Field>
            <strong>이미지 출처</strong>
            <Options role="group" aria-label="이미지 출처">
              <ActionButton type="button" $primary={draft.image?.kind === 'upload'} aria-pressed={draft.image?.kind === 'upload'}
                onClick={() => fileInput.current?.click()}>{draft.image?.kind === 'upload' ? '이미지 바꾸기' : '이미지 추가'}</ActionButton>
              {imageSources.map(({ value, label }) => <ActionButton key={value} type="button" $primary={draft.image?.kind === value}
                aria-pressed={draft.image?.kind === value} onClick={() => patch({ image: { kind: value } })}>{label}</ActionButton>)}
            </Options>
            <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void upload(file);
            }} />
            {uploading && <span role="status">이미지 준비 중</span>}
          </Field>}
          {draft.layout !== 'image' && <>
            <Field as="label">
              <strong>제목</strong>
              <TitleInput value={draft.title} onChange={(event) => patch({ title: event.target.value })} maxLength={PRACTICE_CARD_TITLE_LIMIT}
                placeholder="예: 체결 방향 확인" />
            </Field>
            <Field as="label">
              <strong>내용</strong>
              <TitleInput as="textarea" value={draft.text} onChange={(event) => patch({ text: event.target.value })} maxLength={PRACTICE_CAPTION_LIMIT}
                placeholder="이 단계에서 확인할 내용을 입력하세요." rows={6} style={{ resize: 'none' }} />
            </Field>
          </>}
        </Fields>
        <Preview>
          <strong>미리보기</strong>
          <PreviewCard $imageOnly={draft.layout === 'image'} style={{
            ...getPracticeCardThemeStyle(draft.theme), aspectRatio: previewAspect, maxWidth: previewAspect * 390,
          }}>
            <PracticeCardContent card={draft} figures={figures} preview />
          </PreviewCard>
          {draft.layout === 'combined' && <RatioField>
            <RatioLabel><span>이미지 영역 <strong>{draft.imageShare}%</strong></span><span>텍스트 {100 - draft.imageShare}%</span></RatioLabel>
            <RatioInput type="range" aria-label="이미지 영역 비율" min={PRACTICE_CARD_IMAGE_SHARE.min} max={PRACTICE_CARD_IMAGE_SHARE.max}
              value={draft.imageShare} disabled={pending} onChange={(event) => patch({ imageShare: Number(event.target.value) })} />
          </RatioField>}
        </Preview>
      </EditorGrid>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      <Footer>
        {existing && <ActionButton type="button" disabled={pending} onClick={() => void save(null)}>삭제</ActionButton>}
        <ActionButton type="button" disabled={pending} onClick={onClose}>취소</ActionButton>
        <ActionButton type="submit" $primary disabled={pending || !canSave}>{busy ? '저장 중' : '카드 저장'}</ActionButton>
      </Footer>
    </EditorForm>
  </EditorDialog>;
}

const EditorDialog = styled.dialog(({ theme }) => ({
  width: 'min(1180px, calc(100% - 32px))', maxHeight: '88dvh', boxSizing: 'border-box', padding: 0, overflowY: 'auto',
  color: theme.color.ink, background: theme.color.bgMid, border: '1px solid ' + theme.color.primaryLine,
  borderRadius: 10, boxShadow: '0 18px 64px #000a', '&::backdrop': { background: '#090705c9' },
}));
const EditorForm = styled.form(({ theme }) => ({ display: 'grid', gap: theme.space[4], padding: theme.space[5] }));
const Heading = styled.header(({ theme }) => ({
  display: 'grid', gap: theme.space[1], '& h2': { margin: 0, fontSize: 24 }, '& span': { color: theme.color.inkMuted },
}));
const EditorGrid = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: theme.space[4],
  '@media (max-width: 820px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
}));
const Fields = styled.fieldset(({ theme }) => ({
  display: 'grid', gap: theme.space[3], alignContent: 'start', border: 0, padding: 0, margin: 0, minWidth: 0,
}));
const Field = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[2], minWidth: 0 }));
const Options = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', gap: theme.space[2], '& button': { paddingInline: theme.space[2], fontSize: theme.size.sm },
}));
const ThemePalette = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', gap: theme.space[2],
}));
const ThemeOption = styled.button(({ theme }) => ({
  display: 'inline-flex', flex: '0 0 auto', alignItems: 'center', gap: 6, padding: '5px 9px', minHeight: 30, whiteSpace: 'nowrap',
  background: theme.color.panel, color: theme.color.ink, font: 'inherit', fontSize: theme.size.sm,
  textAlign: 'left', border: '1px solid ' + theme.color.primaryLineWeak, borderRadius: 5, cursor: 'pointer',
  '&[aria-pressed=true]': { borderColor: theme.color.primarySoft, background: theme.color.primaryFill },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
const Swatch = styled.span({
  width: 13, height: 13, border: '1px solid #ffffff40', borderRadius: 3, flexShrink: 0, boxSizing: 'border-box',
});
const TitleInput = styled.input(({ theme }) => ({
  boxSizing: 'border-box', width: '100%', minWidth: 0, color: theme.color.ink, background: theme.color.panel,
  border: '1px solid ' + theme.color.primaryLine, borderRadius: 5, padding: theme.space[2], font: 'inherit',
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
const Preview = styled.section(({ theme }) => ({ display: 'grid', gap: theme.space[2], alignContent: 'start', minWidth: 0 }));
const PreviewCard = styled.div<{ $imageOnly: boolean }>(({ $imageOnly }) => ({
  width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column',
  padding: $imageOnly ? 0 : 12, overflow: $imageOnly ? 'hidden' : undefined,
  background: 'var(--card-surface)', color: 'var(--card-text)', border: '1px solid var(--card-edge)',
  borderInlineStart: '3px solid var(--card-accent)', borderRadius: 6, boxSizing: 'border-box',
}));
const ErrorText = styled.p(({ theme }) => ({ color: theme.color.danger, margin: 0 }));
const RatioField = styled.label(({ theme }) => ({ display: 'grid', gap: theme.space[2], color: theme.color.inkMuted, fontSize: theme.size.sm }));
const RatioLabel = styled.span(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', gap: theme.space[2], '& strong': { color: theme.color.primarySoft },
}));
const RatioInput = styled.input(({ theme }) => ({ width: '100%', margin: 0, accentColor: theme.color.primary }));
const Footer = styled.footer(({ theme }) => ({ display: 'flex', justifyContent: 'flex-end', gap: theme.space[2], flexWrap: 'wrap' }));
