import styled from 'styled-components';
import { ReviewInput } from '../review/reviewStyles';
import { ActionButton } from '../ui/sharedStyles';

export const AssemblySelect = styled.select(({ theme }) => ({ width: '100%', minWidth: 0, padding: theme.space[2], background: theme.color.bgEdge, color: theme.color.ink, border: '1px solid ' + theme.color.primaryLine, font: 'inherit', fontSize: theme.size.md, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft }, '&:disabled': { opacity: .6 } }));
export const AssemblyInput = styled(ReviewInput)(({ theme }) => ({ padding: theme.space[2], fontSize: theme.size.md }));
export const SmallAssemblyButton = styled(ActionButton)(({ theme }) => ({ minHeight: theme.space[6] + theme.space[2], fontSize: theme.size.sm, padding: '0 ' + theme.space[3] + 'px' }));
