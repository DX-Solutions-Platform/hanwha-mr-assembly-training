export const LESSON_PREVIEW_MATERIALS = {
  original: { label: '원본', surface: null },
  aluminum: { label: '알루미늄', surface: { color: '#d6dde4', metalness: .85, roughness: .42 } },
  stainless: { label: '스테인리스', surface: { color: '#c4ccd3', metalness: .98, roughness: .18 } },
  plastic: { label: '무광 플라스틱', surface: { color: '#6f7c8b', metalness: 0, roughness: .72 } },
  rubber: { label: '고무', surface: { color: '#393d42', metalness: 0, roughness: .96 } },
} as const;

export type LessonMaterialId = keyof typeof LESSON_PREVIEW_MATERIALS;
export type LessonMaterialOverride = Exclude<LessonMaterialId, 'original'>;
