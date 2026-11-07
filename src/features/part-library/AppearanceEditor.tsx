'use client';
import { useState } from 'react';
import styled from 'styled-components';
import { ActionButton, Muted, StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { ReviewInput, ReviewLabel } from '@/features/drawing-upload-dev/review/reviewStyles';
import { FINISH_LIST, INDUSTRIAL_PRESETS, MATERIAL_CHOICES, TREATMENT_CHOICES, readModelAppearance, type AppearancePreset, type ModelAppearance } from './modelAppearance';

const PRESET_KEY = 'hanwha.material-presets.v1';

function readPresets(): AppearancePreset[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(PRESET_KEY) ?? '[]');
    return Array.isArray(values) ? values.filter((value) => value && typeof value.name === 'string' && typeof value.material === 'string' && readModelAppearance(value.appearance)) : [];
  } catch { return []; }
}

export function AppearanceEditor({ appearance, material, onChange }: {
  appearance: ModelAppearance; material: string; onChange: (appearance: ModelAppearance, material: string) => void;
}) {
  const [presets, setPresets] = useState(readPresets);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const set = (values: Partial<ModelAppearance>) => onChange({ ...appearance, ...values }, material);
  const selectPreset = (key: string) => {
    const preset = key.startsWith('builtin:') ? INDUSTRIAL_PRESETS[Number(key.slice(8))] : presets[Number(key.slice(6))];
    if (preset) onChange(preset.appearance, preset.material);
  };
  const save = () => {
    const label = name.trim();
    if (!label || !material.trim()) return;
    try {
      const values = [...presets.filter((preset) => preset.name !== label), { name: label, appearance, material: material.trim() }];
      localStorage.setItem(PRESET_KEY, JSON.stringify(values));
      setPresets(values); setMessage(label + ' 프리셋을 저장했습니다.'); setName(''); setFailed(false);
    } catch { setMessage('프리셋을 저장하지 못했습니다.'); setFailed(true); }
  };
  return <Fields aria-label="모델 외관">
    <ReviewLabel>외관 프리셋<Select aria-label="외관 프리셋" value="" onChange={(event) => selectPreset(event.target.value)}>
      <option value="">프리셋 선택</option>
      <optgroup label="산업용 기본 조합">{INDUSTRIAL_PRESETS.map((preset, index) => <option key={preset.name} value={'builtin:' + index}>{preset.name}</option>)}</optgroup>
      {presets.length > 0 && <optgroup label="내 프리셋">{presets.map((preset, index) => <option key={preset.name} value={'local:' + index}>{preset.name}</option>)}</optgroup>}
    </Select></ReviewLabel>
    <Row>
      <ReviewLabel>색상<Color aria-label="모델 색상" type="color" value={appearance.color} onChange={(event) => set({ color: event.target.value })} /></ReviewLabel>
      <ReviewLabel>색상 코드<ReviewInput aria-label="모델 색상 코드" maxLength={80} value={appearance.colorCode} placeholder="RAL / 사내 코드" onChange={(event) => set({ colorCode: event.target.value })} /></ReviewLabel>
    </Row>
    <ReviewLabel>실제 재질<ReviewInput aria-label="모델 실제 재질" list="appearance-materials" value={material} maxLength={200} onChange={(event) => onChange(appearance, event.target.value)} /></ReviewLabel>
    <datalist id="appearance-materials">{MATERIAL_CHOICES.map((item) => <option key={item} value={item} />)}</datalist>
    <ReviewLabel>표면 처리<ReviewInput aria-label="모델 표면 처리" list="appearance-treatments" maxLength={120} value={appearance.treatment} onChange={(event) => set({ treatment: event.target.value })} /></ReviewLabel>
    <datalist id="appearance-treatments">{TREATMENT_CHOICES.map((item) => <option key={item} value={item} />)}</datalist>
    <ReviewLabel>화면 질감<Select aria-label="모델 화면 질감" value={appearance.finish} onChange={(event) => set({ finish: event.target.value as ModelAppearance['finish'] })}>
      {Object.entries(FINISH_LIST).map(([key, entry]) => <option key={key} value={key}>{entry.label}</option>)}
    </Select></ReviewLabel>
    <Muted>색상 코드는 참조값으로 기록합니다. 화면 색은 색상 선택에서 조정하세요.</Muted>
    <SaveRow><ReviewInput aria-label="외관 프리셋 이름" maxLength={80} value={name} placeholder="내 프리셋 이름" onChange={(event) => setName(event.target.value)} /><ActionButton type="button" disabled={!name.trim() || !material.trim()} onClick={save}>프리셋 저장</ActionButton></SaveRow>
    {message && <StateText role="status" $tone={failed ? 'danger' : 'success'}>{message}</StateText>}
  </Fields>;
}

const Fields = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[3], minWidth: 0 }));
const Row = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: theme.space[3] }));
const SaveRow = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[2], input: { minWidth: 0, flex: 1 }, button: { flexShrink: 0 } }));
const Select = styled.select(({ theme }) => ({ minHeight: theme.space[6] + theme.space[2], width: '100%', color: theme.color.ink, background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLine, padding: theme.space[2] }));
const Color = styled(ReviewInput)({ minHeight: 40, padding: 4, cursor: 'pointer' });
