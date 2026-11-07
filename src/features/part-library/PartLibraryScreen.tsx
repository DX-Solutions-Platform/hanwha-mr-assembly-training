'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styled from 'styled-components';
import { ReviewInput } from '@/features/drawing-upload-dev/review/reviewStyles';
import { StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { LibraryPinForm } from './LibraryPinForm';
import { LibraryTable } from './LibraryTable';
import { LibraryDetail } from './LibraryDetail';
import { LibraryPartForm } from './LibraryPartForm';
import { CATEGORY_LABEL, LIBRARY_URL, ROLE_LIST, type LibraryPart, type LibraryRole, type PartCategory } from './libraryTypes';
import { LibraryControls, LibraryHeader, LibraryPanel, LibraryRoot, LibraryToggle } from './libraryStyles';

type Filter = 'all' | PartCategory | 'pending';

export function PartLibraryScreen({ initialParts, isUnlocked }: { initialParts: LibraryPart[]; isUnlocked: boolean }) {
  const router = useRouter();
  const [parts, setParts] = useState(initialParts);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [usage, setUsage] = useState('');
  const [role, setRole] = useState<LibraryRole>(ROLE_LIST[0]);
  const [selection, setSelection] = useState('');
  const [isGallery, setIsGallery] = useState(false);
  const [form, setForm] = useState<'create' | 'edit' | null>(null);
  const [error, setError] = useState('');
  const refresh = async (number?: string) => {
    setError('');
    try {
      const response = await fetch(LIBRARY_URL, { cache: 'no-store' });
      if (response.status === 401) { router.refresh(); return; }
      if (!response.ok) throw new Error('부품 목록을 불러오지 못했습니다.');
      const { parts } = await response.json() as { parts: LibraryPart[] };
      setParts(parts);
      if (number) { setSelection(number); setFilter('all'); setUsage(''); setQuery(''); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : '부품 목록을 불러오지 못했습니다.'); }
  };
  const lock = async () => {
    try {
      const response = await fetch(LIBRARY_URL + '/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('잠금에 실패했습니다.');
      router.refresh();
    } catch { setError('잠금에 실패했습니다. 다시 시도해 주세요.'); }
  };
  const count = (key: Filter) => key === 'all' ? parts.length : parts.filter((part) => key === 'pending' ? part.status === 'pending' : part.category === key).length;
  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'custom', label: CATEGORY_LABEL.custom }, { key: 'standard', label: CATEGORY_LABEL.standard },
    { key: 'purchased', label: CATEGORY_LABEL.purchased }, { key: 'pending', label: '승인 대기' },
  ];
  const usages = Array.from(new Set(parts.map((part) => part.usage).filter(Boolean))).sort();
  const search = query.normalize('NFKC').toLocaleLowerCase().trim();
  const visible = parts.filter((part) => (filter === 'all' || (filter === 'pending' ? part.status === 'pending' : part.category === filter))
    && (!usage || part.usage === usage) && [part.partNumber, part.name, part.source].some((value) => value.normalize('NFKC').toLocaleLowerCase().includes(search)))
    .sort((a, b) => a.partNumber.localeCompare(b.partNumber));
  const selected = visible.find((part) => part.partNumber === selection) ?? visible[0];
  return <LibraryRoot>
    <LibraryHeader>
      <div><small>HANWHA · MR ASSEMBLY TRAINING</small><h1>부품 라이브러리</h1>
        <p>{isUnlocked ? '등록 ' + parts.length + '종 · 맞춤 ' + count('custom') + ' · 표준품 ' + count('standard') + ' · 구매품 ' + count('purchased') + ' · 승인 대기 ' + count('pending') : '등록 부품을 보려면 관리자 코드를 입력하세요.'}</p>
      </div>
      <LibraryControls>
        {isUnlocked && <><RoleLabel>이력 역할</RoleLabel><Group aria-label="변경 이력 역할">{ROLE_LIST.map((item) => <LibraryToggle key={item} $active={role === item} aria-pressed={role === item} onClick={() => setRole(item)}>{item}</LibraryToggle>)}</Group><LibraryToggle onClick={() => void lock()}>잠금</LibraryToggle></>}
        <LibraryToggle as={Link} href="/?view=start" $active>← 메인 메뉴</LibraryToggle>
      </LibraryControls>
    </LibraryHeader>
    {isUnlocked ? <>
      <Toolbar>
        <Search aria-label="코드·이름·도면 품번 검색" placeholder="코드 · 이름 · 도면 품번 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Group aria-label="분류 필터">{filters.map(({ key, label }) => <LibraryToggle key={key} $active={filter === key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} {count(key)}</LibraryToggle>)}</Group>
        {usages.length > 0 && <Group aria-label="사용처 필터"><LibraryToggle $active={!usage} aria-pressed={!usage} onClick={() => setUsage('')}>전체 사용처</LibraryToggle>{usages.map((item) => <LibraryToggle key={item} $active={usage === item} aria-pressed={usage === item} title={item} onClick={() => setUsage(item)}>{item}</LibraryToggle>)}</Group>}
        <ViewControls>
          <Group aria-label="보기 방식"><LibraryToggle $primary={!isGallery} aria-pressed={!isGallery} onClick={() => setIsGallery(false)}>목록</LibraryToggle><LibraryToggle $primary={isGallery} aria-pressed={isGallery} onClick={() => setIsGallery(true)}>3D 진열</LibraryToggle></Group>
          <LibraryToggle $primary onClick={() => setForm('create')}>+ 부품 등록</LibraryToggle>
        </ViewControls>
      </Toolbar>
      {error && <StateText role="alert" $tone="danger">{error}</StateText>}
      <Workspace>
        <LibraryTable parts={visible} selected={selected?.partNumber} isGallery={isGallery} onSelect={setSelection} />
        <LibraryDetail key={selected?.partNumber} part={selected} role={role} onEdit={() => setForm('edit')} onRefresh={() => void refresh()} />
      </Workspace>
      {form && <LibraryPartForm part={form === 'edit' ? selected : undefined} role={role} onClose={() => setForm(null)} onSaved={(number) => { setForm(null); void refresh(number); }} />}
    </> : <PinPanel><LibraryPinForm onUnlocked={() => router.refresh()} /></PinPanel>}
  </LibraryRoot>;
}

const Workspace = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 58fr) minmax(0, 42fr)', flex: 1, minHeight: 360, gap: theme.space[5],
  '@media (max-width: 1000px)': { gridTemplateColumns: 'minmax(0,1fr)', flex: 'initial', gridTemplateRows: 'minmax(220px,45dvh) auto', gap: theme.space[4] },
}));
const Group = styled(LibraryControls)({ gap: 4, '& > button': { maxWidth: 185, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis' } });
const Toolbar = styled(LibraryControls)(({ theme }) => ({ gap: theme.space[3] }));
const ViewControls = styled(LibraryControls)({ marginLeft: 'auto' });
const Search = styled(ReviewInput)({ width: 'min(292px,100%)', minHeight: 40 });
const RoleLabel = styled.span(({ theme }) => ({ fontSize: theme.size.sm, color: theme.color.inkMuted }));
const PinPanel = styled(LibraryPanel)(({ theme }) => ({ width: 'min(380px,100%)', padding: theme.space[5], margin: 'min(8dvh,64px) auto 0', boxSizing: 'border-box' }));
