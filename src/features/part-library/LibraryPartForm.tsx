'use client';
import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { ReviewInput, ReviewLabel, ReviewTextArea } from '@/features/drawing-upload-dev/review/reviewStyles';
import { StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { CATEGORY_LABEL, LIBRARY_URL, normalizeLibraryNumber, type LibraryPartInput, type LibraryRole, type PartCategory } from './libraryTypes';
import { LibraryDialog } from './LibraryDialog';
import { LibraryToggle } from './libraryStyles';

const blank: LibraryPartInput = { partNumber: '', name: '', material: '', specification: '', revision: 'A', category: 'custom', status: 'pending', usage: '공용 카탈로그', source: '', dimensionList: [] };
const fields = [
  ['partNumber', '부품번호'], ['name', '품명'], ['material', '재질'], ['specification', '규격·비고'], ['revision', '개정'],
  ['usage', '사용처'], ['source', '출처·근거'],
] as const;

export function LibraryPartForm({ part, role, onSaved, onClose }: {
  part?: LibraryPartInput; role: LibraryRole; onSaved: (number: string) => void; onClose: () => void;
}) {
  const [form, setForm] = useState(part ?? blank);
  const [dimensions, setDimensions] = useState(form.dimensionList.map(({ value, unit }) => value + ' | ' + unit).join('\n'));
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true); setError('');
    try {
      const dimensionList = dimensions.split('\n').filter((line) => line.trim()).map((line) => {
        const [value, unit, extra] = line.split('|').map((text) => text.trim());
        if (!value || !unit || extra !== undefined) throw new Error('치수는 한 줄에 하나씩 값 | 단위 형식으로 입력해 주세요.');
        return { value, unit };
      });
      const partNumber = normalizeLibraryNumber(form.partNumber);
      const response = await fetch(LIBRARY_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: [{ ...form, partNumber, dimensionList }], replace: !!part, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!data.saved) throw new Error('같은 부품번호가 이미 등록되어 있습니다. 목록에서 기존 부품을 선택해 수정하세요.');
      onSaved(partNumber);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '부품 정보를 저장하지 못했습니다.'); }
    finally { setIsBusy(false); }
  };
  return <LibraryDialog title={part ? '부품 정보 수정' : '부품 등록'} onClose={onClose}>
    <Fields onSubmit={submit}>
      {fields.map(([key, label]) => <ReviewLabel key={key} htmlFor={'library-' + key}>{label}
        <ReviewInput id={'library-' + key} value={form[key]} maxLength={key === 'revision' ? 32 : key === 'partNumber' ? 200 : 2000} readOnly={key === 'partNumber' && !!part} required={key === 'partNumber' || key === 'name' || (key === 'material' && form.status === 'approved')} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
      </ReviewLabel>)}
      <ReviewLabel htmlFor="library-category">분류<Select id="library-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as PartCategory })}>{Object.entries(CATEGORY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></ReviewLabel>
      <ReviewLabel htmlFor="library-status">상태<Select id="library-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value === 'approved' ? 'approved' : 'pending' })}><option value="pending">승인 대기</option><option value="approved">승인</option></Select></ReviewLabel>
      <Wide><ReviewLabel htmlFor="library-dimensions">치수<ReviewTextArea id="library-dimensions" value={dimensions} placeholder="예: Ø24 | mm" onChange={(event) => setDimensions(event.target.value)} /></ReviewLabel></Wide>
      {error && <Wide><StateText role="alert" $tone="danger">{error}</StateText></Wide>}
      <Wide><LibraryToggle $primary disabled={isBusy}>{isBusy ? '저장 중' : '부품 저장'}</LibraryToggle></Wide>
    </Fields>
  </LibraryDialog>;
}
const Fields = styled.form(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: theme.space[3],
  '@media (max-width: 520px)': { gridTemplateColumns: 'minmax(0,1fr)' },
}));
const Wide = styled.div({ gridColumn: '1 / -1' });
const Select = styled.select(({ theme }) => ({ width: '100%', minHeight: 40, color: theme.color.ink, background: theme.color.bgMid, border: '1px solid ' + theme.color.bgCenter, padding: theme.space[2] }));
