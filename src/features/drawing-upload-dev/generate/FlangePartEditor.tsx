import styled from 'styled-components';
import type { Evidence } from '../types';
import { InlineButton, ReviewInput, ReviewLabel } from '../review/reviewStyles';
import { Muted, StateText } from '../ui/sharedStyles';
import type { FlangeDraft, FlangePart, FlangeSource } from './flangeTypes';

const FIELD_LIST: { key: keyof FlangePart; label: string }[] = [{ key: 'partNumber', label: '부품번호' }, { key: 'name', label: '품명' }, { key: 'material', label: '재질' }, { key: 'quantity', label: '수량' }];
export function FlangePartEditor({ draft, source, onChange, onInspect, lockIdentity }: { draft: FlangeDraft; source: FlangeSource; onChange: (draft: FlangeDraft) => void; onInspect: (evidence: Evidence) => void; lockIdentity?: boolean }) {
  return <Fields>{FIELD_LIST.map(({ key, label }) => <Field key={key}>
    <ReviewLabel>{label}<ReviewInput aria-label={'생성 ' + label} type={key === 'quantity' ? 'number' : 'text'} readOnly={lockIdentity && (key === 'partNumber' || key === 'quantity') && !!source.values.part[key]} min={key === 'quantity' ? 1 : undefined} maxLength={200} value={draft.part[key]} onChange={(event) => onChange({ ...draft, part: { ...draft.part, [key]: event.target.value } })} /></ReviewLabel>
    <StateText $tone={draft.part[key] && draft.part[key] === source.values.part[key] ? 'success' : 'warning'}>{source.values.part[key] ? '원문: ' + source.values.part[key] : '원문 값 미확인'}{draft.part[key] !== source.values.part[key] && ' · 직접 입력'}</StateText>
  </Field>)}<InlineButton onClick={() => onInspect(source.partEvidence)}>부품표 원문 위치 확인</InlineButton><Muted>수량·재질은 부품 정보로 저장됩니다. 미리보기에는 한 개의 형상을 표시하며 재질별 물성·외관은 재현하지 않습니다.</Muted></Fields>;
}
const Fields = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[5] }));
const Field = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2] }));
