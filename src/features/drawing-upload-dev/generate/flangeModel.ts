import { FLANGE_FIELD_LIST, type FlangeDraft, type FlangeInputs, type FlangeSource, type FlangeValues } from './flangeTypes';

export function toFlangeDraft(values: FlangeValues): FlangeDraft {
  return { parameters: Object.fromEntries(FLANGE_FIELD_LIST.map(({ key }) => [key, String(values.parameters[key])])) as FlangeInputs, part: { ...values.part } };
}
export function initialFlangeDraft(source: FlangeSource) {
  const draft = toFlangeDraft(source.values);
  if (source.outline && !source.outline.hasDiameter) draft.parameters.outerDiameter = '';
  if (source.outline && !source.outline.hasThickness) draft.parameters.thickness = '';
  return draft;
}

export function editFlangeParameter(draft: FlangeDraft, source: FlangeSource, key: keyof FlangeInputs, value: string): FlangeDraft {
  const parameters = { ...draft.parameters, [key]: value };
  if (source.outline && key === 'outerDiameter') {
    const basis = source.values.parameters.outerDiameter;
    const before = Number(draft.parameters.outerDiameter) || basis;
    const after = Number(value) || basis;
    if (before > 0 && after > 0 && Number.isFinite(after)) {
      for (const field of ['innerDiameter', 'pitchCircleDiameter', 'holeDiameter'] as const) {
        if (parameters[field].trim()) parameters[field] = String(Number((Number(parameters[field]) * after / before).toPrecision(7)));
      }
    }
  }
  return { ...draft, parameters };
}

export function parseFlangeParameters(inputs: FlangeInputs) {
  const issues: string[] = [];
  const parameters = {} as FlangeValues['parameters'];
  for (const field of FLANGE_FIELD_LIST) {
    const text = inputs[field.key].trim(), value = Number(text);
    if (!/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(value) || value < field.min || value > field.max || field.key === 'holeCount' && !Number.isInteger(value)) {
      issues.push(field.label + ': ' + field.min + '~' + field.max + field.unit + (field.key === 'holeCount' ? '의 정수' : '') + '를 입력하세요.');
    }
    parameters[field.key] = value;
  }
  if (!issues.length) {
    const p = parameters;
    if (p.pitchCircleDiameter + p.holeDiameter >= p.outerDiameter) issues.push('볼트 구멍이 외곽을 벗어납니다. 외경을 키우거나 중심원·구멍 지름을 줄이세요.');
    if (p.pitchCircleDiameter - p.holeDiameter <= p.innerDiameter) issues.push('중앙 구멍과 볼트 구멍이 겹칩니다. 중앙 구멍을 줄이거나 중심원 지름을 키우세요.');
    if (p.pitchCircleDiameter * Math.sin(Math.PI / p.holeCount) <= p.holeDiameter) issues.push('이웃한 볼트 구멍이 겹칩니다. 구멍 개수·지름을 줄이거나 중심원 지름을 키우세요.');
  }
  return { parameters, issues };
}
export function parseFlangeDraft(draft: FlangeDraft): { values: FlangeValues | null; issues: string[] } {
  const { parameters, issues } = parseFlangeParameters(draft.parameters);
  const part = { partNumber: draft.part.partNumber.trim(), name: draft.part.name.trim(), material: draft.part.material.trim(), quantity: draft.part.quantity.trim() };
  if (!part.partNumber || !part.name || !part.material || Object.values(part).some((value) => value.length > 200)) issues.push('부품번호·품명·재질을 200자 이내로 입력하세요.');
  if (!/^[1-9]\d*$/.test(part.quantity) || Number(part.quantity) > 10000) issues.push('수량은 1~10,000의 정수를 입력하세요.');
  return { values: issues.length ? null : { parameters, part }, issues };
}
export function hasFlangeChanges(draft: FlangeDraft, values: FlangeValues) {
  const parsed = parseFlangeDraft(draft).values;
  return !parsed || JSON.stringify(parsed) !== JSON.stringify(values);
}
export function flangeHoleCenters(p: FlangeValues['parameters']) {
  return Array.from({ length: p.holeCount }, (_, index) => {
    const angle = (p.startAngle + 360 * index / p.holeCount) * Math.PI / 180;
    return { x: p.pitchCircleDiameter / 2 * Math.cos(angle), y: p.pitchCircleDiameter / 2 * Math.sin(angle), z: 0 };
  });
}
