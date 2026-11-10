import { useState, type ComponentProps } from 'react';
import styled, { keyframes } from 'styled-components';
import { ActionButton } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { PracticeHelp } from './PracticeHelp';
import { PRACTICE_CAPTION_LIMIT } from './practiceTrayLayout';

export function PracticeSubtitle({ text, help, onSave }: {
  text: string; help?: ComponentProps<typeof PracticeHelp>['topic'];
  onSave?: (text: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const caption = text.replace(/\s+/g, ' ').trim();
  const trimmed = draft?.trim() ?? '';
  const canSave = !saving && trimmed.length > 0 && trimmed.length <= PRACTICE_CAPTION_LIMIT;
  const steps = Math.max(1, Array.from(caption).length);
  const line = <SubtitleText title={caption}><TypingText key={caption} $steps={steps}>{caption}</TypingText></SubtitleText>;

  async function save() {
    if (!canSave || !onSave) return;
    setSaving(true);
    setError(false);
    const saved = await onSave(trimmed);
    setSaving(false);
    if (saved) setDraft(null);
    else setError(true);
  }

  return <SubtitleBar aria-label="조립 안내 자막">
    {draft === null ? <SubtitleDisplay>
      <SubtitleBody aria-live="polite">
        {help ? <PracticeHelp topic={help} above>{line}</PracticeHelp> : line}
      </SubtitleBody>
      {onSave && <SubtitleButton type="button" onClick={() => { setError(false); setDraft(caption); }}>자막 수정</SubtitleButton>}
    </SubtitleDisplay> : <SubtitleEditor onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <SubtitleInput autoFocus aria-label="조립 안내 자막 문구" maxLength={PRACTICE_CAPTION_LIMIT}
        value={draft} onChange={(event) => setDraft(event.target.value)} disabled={saving} />
      {error && <SubtitleNote role="alert">자막을 저장하지 못했습니다. 다시 저장해 주세요.</SubtitleNote>}
      <SubtitleActions>
        <SubtitleButton type="button" disabled={saving} onClick={() => setDraft(null)}>취소</SubtitleButton>
        <SubtitleButton type="submit" $primary disabled={!canSave}>{saving ? '저장 중' : '저장'}</SubtitleButton>
      </SubtitleActions>
    </SubtitleEditor>}
  </SubtitleBar>;
}

const SubtitleBar = styled.section(({ theme }) => ({
  position: 'absolute', left: '50%', bottom: theme.space[3], zIndex: 5, transform: 'translateX(-50%)',
  width: 'min(1160px, calc(100% - 24px))',
  boxSizing: 'border-box', padding: `clamp(11px, 1.6dvh, 16px) ${theme.space[3]}px`,
  color: '#fff', background: 'rgba(41, 24, 17, 0.91)', backdropFilter: 'blur(6px)',
  border: '1px solid rgba(255, 168, 105, 0.32)', borderRadius: 6,
  boxShadow: '0 6px 20px #0006', pointerEvents: 'none',
  '& button': { pointerEvents: 'auto' },
}));
const SubtitleDisplay = styled.div(({ theme }) => ({
  display: 'flex', gap: theme.space[2], alignItems: 'center',
}));
const SubtitleBody = styled.div({ flex: '1 1 0', minWidth: 0 });
const SubtitleText = styled.p({
  margin: 0, flex: '1 1 auto', minWidth: 0, color: '#fff', fontWeight: 600,
  fontSize: 'clamp(16px, 1.15vw, 21px)', lineHeight: 1.35, whiteSpace: 'nowrap',
  overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'auto', textShadow: '0 1px 4px #000b',
});
const revealText = keyframes`
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
`;
const TypingText = styled.span<{ $steps: number }>`
  display: inline-block;
  vertical-align: top;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: ${revealText} ${({ $steps }) => Math.min(1400, Math.max(220, $steps * 21))}ms steps(${({ $steps }) => $steps}, end) both;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
const SubtitleNote = styled.span(({ theme }) => ({
  color: '#fff4e9', fontSize: theme.size.sm, lineHeight: 1.45, overflowWrap: 'anywhere',
}));
const SubtitleEditor = styled.form({ display: 'grid', gap: 8, pointerEvents: 'auto' });
const SubtitleInput = styled.input(({ theme }) => ({
  width: '100%', minWidth: 0, boxSizing: 'border-box',
  color: '#fff', background: 'rgba(24, 15, 10, 0.9)', border: '1px solid #bc815f',
  borderRadius: 4, padding: theme.space[2], font: 'inherit', fontSize: 'clamp(16px, 1.15vw, 21px)', fontWeight: 600, lineHeight: 1.35,
  '&:focus-visible': { outline: '2px solid #ffb17e' },
}));
const SubtitleActions = styled.div({ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 6 });
const SubtitleButton = styled(ActionButton)(({ theme }) => ({
  flexShrink: 0, minHeight: 30, paddingInline: theme.space[2], fontSize: theme.size.sm, whiteSpace: 'nowrap',
}));
