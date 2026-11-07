import styled from 'styled-components';
import type { Evidence } from '../types';
import { InlineButton, ReviewInput, ReviewLabel } from '../review/reviewStyles';
import { StateText } from '../ui/sharedStyles';
import { FLANGE_FIELD_LIST, type FlangeDraft, type FlangeSource } from './flangeTypes';
import { editFlangeParameter } from './flangeModel';

export function FlangeParameterEditor({ draft, source, onChange, onInspect }: { draft: FlangeDraft; source: FlangeSource; onChange: (draft: FlangeDraft) => void; onInspect: (evidence: Evidence) => void }) {
  return <Fields>{FLANGE_FIELD_LIST.map((field) => {
    const original = source.values.parameters[field.key];
    const { outline } = source;
    const missing = (field.key === 'outerDiameter' && outline && !outline.hasDiameter) || (field.key === 'thickness' && outline && !outline.hasThickness);
    const relative = outline && !draft.parameters.outerDiameter && ['innerDiameter', 'pitchCircleDiameter', 'holeDiameter'].includes(field.key);
    const fromOutline = outline && !['outerDiameter', 'thickness'].includes(field.key);
    const input = draft.parameters[field.key];
    const basis = source.values.parameters.outerDiameter;
    const expected = fromOutline && field.unit === 'mm' ? original * (Number(draft.parameters.outerDiameter) || basis) / basis : original;
    const isChanged = !!input && (missing || Math.abs(Number(input) - expected) > Math.max(.00001, expected * .000001));
    return <Field key={field.key}>
      <Label>{field.label}<InputRow><Input type="number" aria-label={'생성 ' + field.label} readOnly={!!relative} placeholder={missing ? '실제 치수' : undefined} min={field.min} max={field.max} step={field.key === 'holeCount' ? 1 : 'any'} value={relative && input ? Number((Number(input) / basis * 100).toFixed(2)) : input} onChange={(event) => onChange(editFlangeParameter(draft, source, field.key, event.target.value))} /><Unit>{relative ? '%' : field.unit}</Unit></InputRow></Label>
      <SourceLine>
        {missing ? <StateText $tone="warning">{input ? '직접 입력' : '입력 필요'}</StateText> : <>
          <InlineButton onClick={() => onInspect(source.evidence[field.key])} aria-label={field.symbol + ' 원문 위치 확인'}>{fromOutline ? '윤곽 근거 보기' : '원문 ' + field.symbol + ' = ' + original + ' ' + field.unit}</InlineButton>
          <StateText $tone={isChanged || !!fromOutline ? 'warning' : 'success'}>{isChanged ? outline ? '직접 입력' : '수정' : fromOutline ? '윤곽 추정' : 'PDF 값'}</StateText>
        </>}
      </SourceLine>
    </Field>;
  })}</Fields>;
}
const Fields = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', alignItems: 'start', rowGap: theme.space[3], columnGap: theme.space[4] }));
const Field = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[1] }));
const Label = styled(ReviewLabel)(({ theme }) => ({ fontSize: theme.size.md, gap: theme.space[1] }));
const Input = styled(ReviewInput)(({ theme }) => ({ padding: theme.space[2], fontSize: theme.size.md }));
const InputRow = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3] }));
const Unit = styled.span(({ theme }) => ({ minWidth: theme.space[6], fontSize: theme.size.md, color: theme.color.inkMuted }));
const SourceLine = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[2], fontSize: theme.size.sm }));
