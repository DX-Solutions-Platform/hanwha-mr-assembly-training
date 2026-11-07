import styled from 'styled-components';
import Image from 'next/image';
import type { FinishedProduct } from './finishedProductStore';
import { ActionButton, Muted } from '../ui/sharedStyles';

export function FinishedProductSummary({ record, candidate, onManage, onView, imageUrl }: {
  record: FinishedProduct | null; candidate: number | null; onManage: () => void; onView?: () => void; imageUrl?: string;
}) {
  const page = record?.pageNumber ?? candidate;
  return <Root aria-label="완제품 도면 요약" data-finished-page={record?.pageNumber ?? undefined}>
    <Identity>
      {imageUrl && <Thumbnail><Image src={imageUrl} fill sizes="96px" alt="완제품 대표 도면" unoptimized /></Thumbnail>}
      <div><strong>완제품</strong><Muted>{record?.pageNumber ? (record.name || '제품명 미지정') + ' · ' + record.pageNumber + '쪽' + (record.model ? ' · 3D 저장됨' : '')
        : page ? page + '쪽 · 완제품 후보' : record ? '대표 도면 없음' : '완제품 도면 지정 가능'}</Muted></div>
    </Identity>
    <Actions>
      {onView && <ActionButton onClick={onView}>완제품 원문</ActionButton>}
      <ActionButton onClick={onManage}>완제품 관리</ActionButton>
    </Actions>
  </Root>;
}

const Root = styled.section(({ theme }) => ({
  flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.space[3],
  padding: theme.space[3], border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.panel,
  strong: { color: theme.color.primarySoft, fontSize: theme.size.md },
}));
const Identity = styled.div(({ theme }) => ({
  minWidth: 0, display: 'flex', alignItems: 'center', gap: theme.space[3],
  '& > div:last-child': { minWidth: 0, display: 'grid', gap: theme.space[1], overflowWrap: 'anywhere' },
}));
const Thumbnail = styled.div(({ theme }) => ({
  position: 'relative', flexShrink: 0, width: theme.space[8] + theme.space[6], height: theme.space[7],
  background: theme.color.ink, img: { objectFit: 'contain' },
}));
const Actions = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], flexShrink: 0 }));
