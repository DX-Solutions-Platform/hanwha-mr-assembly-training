import styled from 'styled-components';

export const LibraryRoot = styled.main(({ theme }) => ({
  minHeight: '100dvh', height: '100dvh', overflow: 'auto', padding: theme.space[4], boxSizing: 'border-box',
  display: 'flex', flexDirection: 'column', gap: theme.space[4], color: theme.color.ink,
  backgroundColor: theme.color.bgMid,
  backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.023) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.023) 1px,transparent 1px)',
  backgroundSize: theme.space[8] + 'px ' + theme.space[8] + 'px',
}));
export const LibraryHeader = styled.header(({ theme }) => ({
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.space[4],
  paddingBlock: theme.space[2],
  h1: { margin: '4px 0', fontSize: theme.size.display, lineHeight: 1.15 },
  p: { margin: 0, color: theme.color.inkSub, fontSize: theme.size.md },
  small: { color: theme.color.primary, font: '700 ' + theme.size.sm + 'px ' + theme.font.mono, letterSpacing: '.22em' },
}));
export const LibraryPanel = styled.section(({ theme }) => ({
  position: 'relative', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column',
  background: theme.color.bgMid, border: '1px solid ' + theme.color.bgCenter,
  '&::before,&::after': { content: '""', position: 'absolute', width: theme.space[4], height: theme.space[4], zIndex: 1, pointerEvents: 'none', borderColor: theme.color.primary, borderStyle: 'solid' },
  '&::before': { top: -1, left: -1, borderWidth: '1px 0 0 1px' },
  '&::after': { bottom: -1, right: -1, borderWidth: '0 1px 1px 0' },
}));
export const LibraryPanelTitle = styled.div(({ theme }) => ({
  padding: theme.space[3] + 'px ' + theme.space[4] + 'px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  color: theme.color.primary, fontSize: theme.size.sm, fontFamily: theme.font.mono,
  borderBottom: '1px solid ' + theme.color.bgCenter,
}));
export const LibraryControls = styled.div(({ theme }) => ({
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: theme.space[2], minWidth: 0,
}));
export const LibraryToggle = styled.button<{ $active?: boolean; $primary?: boolean }>(({ theme, $active, $primary }) => ({
  minHeight: theme.space[6] + theme.space[2], padding: '0 ' + theme.space[3] + 'px',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
  fontSize: theme.size.sm, whiteSpace: 'nowrap',
  border: '1px solid ' + ($active || $primary ? theme.color.primary : theme.color.bgCenter),
  color: $primary ? theme.color.onPrimary : $active ? theme.color.primarySoft : theme.color.ink,
  background: $primary ? theme.color.primary : $active ? theme.color.primaryFill : theme.color.bgMid,
  '&:hover': { borderColor: theme.color.primary },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: 2 },
  '&:disabled': { opacity: .5 },
}));
export const LibraryStatus = styled.span<{ $approved: boolean }>(({ theme, $approved }) => ({
  display: 'inline-block', whiteSpace: 'nowrap', color: $approved ? theme.color.success : theme.color.warning,
  border: '1px solid currentColor', fontSize: theme.size.xs, padding: theme.space[1] + 'px ' + theme.space[2] + 'px',
}));
