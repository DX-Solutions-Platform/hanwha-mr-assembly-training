import styled from 'styled-components';

export const Workspace = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(235px, 1fr)', alignItems: 'start',
  gap: theme.space[4], padding: theme.space[4], minHeight: 0, overflow: 'auto',
  '@media (max-width: 720px)': { gridTemplateColumns: '1fr' },
}));
export const Panel = styled.section(({ theme }) => ({
  display: 'grid', gap: theme.space[3], minWidth: 0, padding: theme.space[4], overflowWrap: 'anywhere',
  border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.panel,
  '& h3, & p': { margin: 0 },
}));
export const Toolbar = styled.div(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', gap: theme.space[2] }));
export const Viewport = styled.div(({ theme }) => ({ position: 'relative', minHeight: 'clamp(300px, 48vh, 580px)', background: theme.color.bgMid, overflow: 'hidden' }));
