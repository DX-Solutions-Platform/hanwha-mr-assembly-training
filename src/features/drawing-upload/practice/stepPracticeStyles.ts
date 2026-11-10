import styled from 'styled-components';
import { ScrollArea } from '@/features/drawing-upload-dev/ui/sharedStyles';

export const Workspace = styled(ScrollArea)<{ $product?: boolean }>(({ theme, $product }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(235px, 1fr)', alignItems: 'start',
  gap: theme.space[4], padding: theme.space[4],
  '@media (max-width: 720px)': { gridTemplateColumns: '1fr' },
  ...($product ? {
    flex: 1, minWidth: 0, overflowX: 'hidden', gap: theme.space[3], padding: theme.space[3],
    gridTemplateColumns: 'clamp(240.5px, 18.2vw, 327.6px) minmax(0, 1fr)', gridTemplateRows: 'max-content minmax(0, 1fr)',
    gridTemplateAreas: '"overview scene" "progress scene"',
    '@media (max-width: 820px)': { gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'auto', gridTemplateAreas: '"scene" "overview" "progress"' },
  } : {}),
}));
export const Panel = styled.section(({ theme }) => ({
  display: 'grid', gap: theme.space[3], minWidth: 0, padding: theme.space[4], overflowWrap: 'anywhere',
  border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.panel,
  '& h3, & p': { margin: 0 },
}));
export const Toolbar = styled.div(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', gap: theme.space[2] }));
export const Viewport = styled.div(({ theme }) => ({ position: 'relative', minHeight: 'clamp(300px, 48vh, 580px)', background: theme.color.bgMid, overflow: 'hidden' }));
