import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ActionMenu, type ActionMenuItem } from './ActionMenu';

export function TaskFooter({ message, isError = false, items, children }: { message: ReactNode; isError?: boolean; items: ActionMenuItem[]; children?: ReactNode }) {
  return <Footer data-task-footer><Status role={isError ? 'alert' : 'status'} $error={isError}>{message}</Status><Actions aria-label="주요 작업"><ActionMenu items={items} />{children}</Actions></Footer>;
}
const Footer = styled.footer(({ theme }) => ({ position: 'absolute', left: theme.space[8], right: theme.space[8], bottom: theme.space[5], display: 'flex', alignItems: 'center', gap: theme.space[5], minHeight: theme.space[7], fontSize: theme.size.sm }));
const Status = styled.div<{ $error: boolean }>(({ theme, $error }) => ({ flex: 1, minWidth: 0, color: $error ? theme.color.danger : theme.color.inkMuted, fontSize: theme.size.sm, lineHeight: 1.6, overflowWrap: 'anywhere' }));
const Actions = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3], flexShrink: 0 }));
