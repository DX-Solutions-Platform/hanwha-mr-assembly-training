import styled, { keyframes } from 'styled-components';
import { Muted } from '@/features/drawing-upload-dev/ui/sharedStyles';

const messages = {
  zip: ['교범을 불러오는 중입니다.', '조립 단계와 3D 부품 정보를 읽는 중입니다.', '교범 화면을 준비하는 중입니다.'],
  manual: ['선택한 파일을 확인했습니다.', '3D 모델과 조립 단계를 불러오는 중입니다.', '3D 교범을 준비하는 중입니다.'],
};

export function LessonImportProgress({ file, percent, kind = 'zip' }: {
  file: File; percent: number; kind?: 'zip' | 'manual';
}) {
  const message = messages[kind][percent < 24 ? 0 : percent < 60 ? 1 : 2];
  return <FileStatus>
    {kind === 'manual' && <ReadingIcon viewBox="0 0 56 64" aria-hidden="true">
      <path fill="currentColor" opacity=".22" d="M12 4h23l12 12v37a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5Z" />
      <path fill="currentColor" opacity=".7" d="M35 4v9a3 3 0 0 0 3 3h9L35 4ZM16 22h23v3H16zm0 8h23v3H16zm0 8h15v3H16z" />
      <rect className="reading-line" x="4" y="17" width="46" height="3" rx="1.5" fill="currentColor" />
    </ReadingIcon>}
    <strong title={file.name}>{file.name}</strong>
    <Muted role="status">{message}</Muted>
    <ProgressRow>
      <ProgressTrack role="progressbar" aria-label={kind === 'manual' ? '3D 교범 준비 진행률' : '교범 ZIP 가져오기 진행률'}
        aria-valuenow={percent}>
        <div style={{ transform: `scaleX(${percent / 100})` }} />
      </ProgressTrack>
      <span aria-hidden="true">{percent}%</span>
    </ProgressRow>
  </FileStatus>;
}

const scanPage = keyframes`0%, 100% { transform: translateY(0); } 50% { transform: translateY(31px); }`;
const ReadingIcon = styled.svg`
  justify-self: center;
  width: 56px;
  height: 64px;
  color: ${({ theme }) => theme.color.primarySoft};
  .reading-line { animation: ${scanPage} 2s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .reading-line { animation: none; } }
`;
const FileStatus = styled.div(({ theme }) => ({
  alignSelf: 'center', flexShrink: 0, width: 'min(90%, 440px)', display: 'grid',
  gap: theme.space[2], padding: theme.space[3], background: theme.color.bgEdge, textAlign: 'center',
  '& strong': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}));
const ProgressRow = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 3ch', alignItems: 'center', gap: theme.space[2],
  color: theme.color.primarySoft, fontSize: theme.size.sm, fontVariantNumeric: 'tabular-nums',
}));
const ProgressTrack = styled.div(({ theme }) => ({
  height: 8, borderRadius: 8, overflow: 'hidden', background: theme.color.primaryLineWeak,
  '& > div': { height: '100%', background: theme.color.primary, transformOrigin: 'left', transition: 'transform 180ms ease-out' },
  '@media (prefers-reduced-motion: reduce)': { '& > div': { transition: 'none' } },
}));
