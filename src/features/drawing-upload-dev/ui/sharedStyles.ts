import styled from 'styled-components';
import { cutCorner } from '@/styles/mixins';

export const ActionButton = styled.button<{ $primary?: boolean }>(({ theme, $primary }) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: theme.space[2],
  minHeight: theme.space[7], padding: '0 ' + theme.space[4] + 'px', fontSize: theme.size.md,
  border: '1px solid ' + theme.color.primaryLine,
  background: $primary ? theme.color.primary : theme.color.panel,
  color: $primary ? theme.color.onPrimary : theme.color.ink,
  '&:hover:enabled': { filter: 'brightness(1.15)' },
  '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: theme.space[1] },
}), ({ theme }) => cutCorner(theme.cut.sm));
export const Muted = styled.span(({ theme }) => ({ color: theme.color.inkMuted, fontSize: theme.size.sm, lineHeight: 1.6 }));
export const StateText = styled.span<{ $tone?: 'success' | 'warning' | 'danger' }>(({ theme, $tone }) => ({
  color: $tone ? theme.color[$tone] : theme.color.inkMuted, fontSize: theme.size.sm,
}));
export const PanelTitle = styled.h2(({ theme }) => ({
  margin: 0, fontSize: theme.size.lg, color: theme.color.primary,
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.space[3],
}));
export const ScrollArea = styled.div(({ theme }) => ({
  minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin', scrollbarColor: theme.color.primarySoft + ' ' + theme.color.bgMid,
  '&::-webkit-scrollbar': { width: 8, height: 8 },
  '&::-webkit-scrollbar-track': { background: theme.color.bgMid },
  '&::-webkit-scrollbar-thumb': { background: theme.color.primarySoft, border: '2px solid ' + theme.color.bgMid, borderRadius: 8 },
  '&::-webkit-scrollbar-thumb:hover': { background: theme.color.primary },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: 2 },
}));
