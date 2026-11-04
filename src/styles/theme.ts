// 디자인 가이드 토큰 — 모든 UI는 이 값만 사용합니다. (docs/DESIGN_GUIDE.md)
export const theme = {
  color: {
    primary: '#f37321',
    primarySoft: '#ffb07a',
    primaryLine: 'rgba(243,115,33,.45)',
    primaryLineWeak: 'rgba(243,115,33,.25)',
    primaryFill: 'rgba(243,115,33,.12)',
    success: '#3fe0c5',
    warning: '#f2c230',
    danger: '#ff5a6a',
    ink: '#f2ede8',
    inkSub: '#e6eaec',
    inkMuted: '#c9d0d3',
    inkDisabled: '#b4bcc0',
    onPrimary: '#140a04',
    panel: 'rgba(10,8,6,.6)',
    panelStrong: 'rgba(10,8,6,.85)',
    bgCenter: '#151c20',
    bgMid: '#090c0e',
    bgEdge: '#040506',
  },
  font: {
    main: "'NexonLv2Gothic', sans-serif",
    mono: "var(--font-mono), 'JetBrains Mono', monospace",
  },
  weight: { regular: 400, medium: 500, bold: 700 }, // 최대 700
  size: { xs: 11, sm: 13, md: 15, base: 17, lg: 20, xl: 24, xxl: 30, display: 42 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 },
  cut: { sm: 10, md: 14, lg: 26 }, // 모서리 사선 컷(px)
  motion: { fast: '.15s', base: '.2s', slow: '.6s', ease: 'cubic-bezier(.2,0,0,1)' },
  stage: { width: 1920, height: 1080 }, // 16:9 기준 좌표계, HD~4K는 스케일로 대응
} as const;

export type AppTheme = typeof theme;
