import type { CSSProperties } from 'react';

export const PRACTICE_CARD_THEMES = [
  { id: 'red', label: '레드', color: '#F75049' },
  { id: 'cyan', label: '시안', color: '#5EF6FF' },
  { id: 'white', label: '화이트', color: '#FFFFFF' },
  { id: 'navy', label: '다크 블루', color: '#0E0E17' },
  { id: 'gray', label: '그레이', color: '#D6D0D0' },
  { id: 'green', label: '민트 그린', color: '#1DED83' },
  { id: 'blue', label: '블루', color: '#2570D4' },
  { id: 'violet', label: '바이올렛', color: '#9D2BF5' },
  { id: 'orange', label: '오렌지', color: '#FB932E' },
  { id: 'gold', label: '골드', color: '#F0B537' },
] as const;

export type PracticeCardTheme = typeof PRACTICE_CARD_THEMES[number]['id'];
export const DEFAULT_PRACTICE_CARD_THEME: PracticeCardTheme = 'orange';

export function isPracticeCardTheme(value: unknown): value is PracticeCardTheme {
  return PRACTICE_CARD_THEMES.some(({ id }) => id === value);
}

export function getPracticeCardThemeStyle(theme: PracticeCardTheme): CSSProperties {
  const color = PRACTICE_CARD_THEMES.find(({ id }) => id === theme)?.color ?? '#FB932E';
  const light = theme === 'white' || theme === 'gray';
  const accent = theme === 'navy' ? '#8896B8' : light ? '#555866' : color;
  return {
    '--card-surface': light ? `color-mix(in srgb, ${color} 94%, transparent)`
      : theme === 'navy' ? '#0E0E17ED' : `color-mix(in srgb, ${color} 16%, #0E0E17E8)`,
    '--card-control': light ? color : `color-mix(in srgb, ${accent} 24%, #0E0E17)`,
    '--card-edge': `color-mix(in srgb, ${accent} 66%, ${light ? color : '#0E0E17'})`,
    '--card-accent': accent,
    '--card-title': light ? '#171823' : `color-mix(in srgb, ${accent} 52%, #FFFFFF)`,
    '--card-text': light ? '#242530' : '#FFFFFF',
    '--card-muted': light ? '#434653' : '#DDDFEA',
    '--card-figure': light ? '#E3E3E9' : '#14151E',
    '--card-error': light ? '#8E2222' : '#FFB0AD',
  } as CSSProperties;
}
