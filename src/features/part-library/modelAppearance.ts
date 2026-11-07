export const FINISH_LIST = {
  matte: { label: '무광', roughness: .83, metalness: 0 },
  satin: { label: '반광', roughness: .52, metalness: .05 },
  gloss: { label: '유광', roughness: .19, metalness: .05 },
  brushed: { label: '브러시 금속', roughness: .4, metalness: .77 },
  polished: { label: '광택 금속', roughness: .19, metalness: .84 },
  raw: { label: '가공 금속', roughness: .59, metalness: .68 },
  rubber: { label: '고무·탄성체', roughness: .92, metalness: 0 },
} as const;

export interface ModelAppearance {
  color: string; colorCode: string; finish: keyof typeof FINISH_LIST; treatment: string;
}

export const DEFAULT_APPEARANCE: ModelAppearance = { color: '#c9d0d3', colorCode: '', finish: 'satin', treatment: '' };
export const MATERIAL_CHOICES = ['탄소강', 'S45C', 'SUS304', 'SUS316', '알루미늄 6061', '알루미늄 7075', '황동', '구리', '티타늄', 'ABS', 'PA', 'POM', 'PC', 'PE', 'PTFE', 'EPDM', 'NBR', '목재'];
export const TREATMENT_CHOICES = ['무도장', '분체도장', '아노다이징', '아연도금', '니켈도금', '흑착색', '헤어라인', '연마', '샌드블라스트', '방청 코팅'];

export function readModelAppearance(value: unknown): ModelAppearance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { color, colorCode, finish, treatment } = value as Record<string, unknown>;
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color) || typeof finish !== 'string' || !Object.hasOwn(FINISH_LIST, finish) ||
    typeof colorCode !== 'string' || colorCode.length > 80 || typeof treatment !== 'string' || treatment.length > 120) return null;
  return { color: color.toLowerCase(), colorCode: colorCode.trim(), finish: finish as ModelAppearance['finish'], treatment: treatment.trim() };
}

export function appearanceSurface(appearance?: ModelAppearance) {
  if (!appearance) return { color: DEFAULT_APPEARANCE.color, roughness: .45, metalness: .35 };
  const { roughness, metalness } = FINISH_LIST[appearance.finish];
  return { color: appearance.color, roughness, metalness };
}

export interface AppearancePreset { name: string; material: string; appearance: ModelAppearance; }
export const INDUSTRIAL_PRESETS: AppearancePreset[] = [
  { name: '베이지 · 무광', material: 'ABS', appearance: { color: '#d6c2a3', colorCode: '', finish: 'matte', treatment: '무광 마감' } },
  { name: '실버 · 금속 광택', material: 'SUS304', appearance: { color: '#c9d0d6', colorCode: '', finish: 'polished', treatment: '연마' } },
  { name: '흑색 아노다이징', material: '알루미늄 6061', appearance: { color: '#303236', colorCode: '', finish: 'brushed', treatment: '아노다이징' } },
  { name: '밝은 회색 · 분체도장', material: '탄소강', appearance: { color: '#c5c7c4', colorCode: 'RAL 7035', finish: 'satin', treatment: '분체도장' } },
  { name: '노랑 · 분체도장', material: '탄소강', appearance: { color: '#efb400', colorCode: 'RAL 1023', finish: 'gloss', treatment: '분체도장' } },
  { name: '아연도금 강재', material: '탄소강', appearance: { color: '#a6aeb0', colorCode: '', finish: 'raw', treatment: '아연도금' } },
  { name: '황동 · 절삭면', material: '황동', appearance: { color: '#b59153', colorCode: '', finish: 'raw', treatment: '무도장' } },
  { name: '흑색 고무', material: 'EPDM', appearance: { color: '#252528', colorCode: '', finish: 'rubber', treatment: '무도장' } },
];
