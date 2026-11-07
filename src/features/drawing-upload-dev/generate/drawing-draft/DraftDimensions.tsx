import styled from 'styled-components';
import { ReviewInput, ReviewLabel } from '../../review/reviewStyles';
import { ActionButton, Muted } from '../../ui/sharedStyles';
import type { DimensionRecord, DrawingPage } from '../../types';
import { DRAFT_AXES, type DraftAxis } from './draftGeometry';

export interface DimensionOption { id: string; source: DimensionRecord['source']; file: string; auxiliary: boolean; mm: number; }

export function dimensionOptions(pages: DrawingPage[], file: string, auxiliary: boolean) {
  return pages.flatMap((page) => page.dimensionList.flatMap((item): DimensionOption[] => {
    if (item.kind !== 'length' && item.kind !== 'candidate') return [];
    const text = item.value.trim().match(/^(\d+(?:[.,]\d+)?)(?:\s*(?:mm|cm|in|inch(?:es)?|″|"))?$/i)?.[1];
    const factor = item.unit === 'mm' ? 1 : item.unit === 'cm' ? 10 : item.unit === 'in' ? 25.4 : 0;
    const mm = text ? Number((Number(text.replace(',', '.')) * factor).toFixed(4)) : 0;
    return mm >= .1 && mm <= 5000 ? [{ id: String(auxiliary) + ':' + item.id, source: item.source, file, auxiliary, mm }] : [];
  })).slice(0, 120);
}

export function DraftDimensions({ values, sources, options, isLoading, supplementName, onAttach, onEdit, onUse }: {
  values: Record<DraftAxis, string>; sources: Partial<Record<DraftAxis, string>>; options: DimensionOption[];
  isLoading: boolean; supplementName?: string; onAttach: () => void; onEdit: (axis: DraftAxis, value: string) => void; onUse: (axis: DraftAxis, option: DimensionOption) => void;
}) {
  return <>
    <ActionButton disabled={isLoading} onClick={onAttach}>{isLoading ? '치수 도면 읽는 중' : '보조 치수 도면 PDF 첨부'}</ActionButton>
    {supplementName && <Muted>{supplementName} · 읽은 길이 {options.filter((entry) => entry.auxiliary).length}개</Muted>}
    <Muted>완성품 전체 가로·세로·깊이를 입력하거나, 도면에서 읽은 길이를 골라 연결하세요.</Muted>
    {DRAFT_AXES.map(({ key, label }) => <Group key={key}>
      <ReviewLabel>{label} (mm)<ReviewInput type="number" min=".1" max="5000" step="any" aria-label={'초안 ' + label} value={values[key]} placeholder="실측값 입력" onChange={(event) => onEdit(key, event.target.value)} /></ReviewLabel>
      {sources[key] && <Muted>{sources[key]}</Muted>}
      {options.length > 0 && <Select aria-label={label + ' 치수 원문에서 선택'} value="" onChange={(event) => {
        const item = options.find(({ id }) => id === event.target.value);
        if (item) onUse(key, item);
      }}>
        <option value="">도면에서 읽은 값 선택</option>
        {options.map((item) => <option value={item.id} key={item.id}>{item.auxiliary ? '보조' : '원본'} {item.source.pageNumber}쪽 · {item.mm} mm</option>)}
      </Select>}
    </Group>)}
  </>;
}
const Group = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[2] }));
const Select = styled.select(({ theme }) => ({ width: '100%', minHeight: 32, color: theme.color.ink, background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLine, padding: theme.space[1] }));
