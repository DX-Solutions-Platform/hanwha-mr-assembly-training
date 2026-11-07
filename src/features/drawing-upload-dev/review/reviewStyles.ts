import styled from 'styled-components';
import { ScrollArea } from '../ui/sharedStyles';

export const ReviewPanel = styled.section(({ theme }) => ({ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.panel }));
export const ReviewHeader = styled.div(({ theme }) => ({ padding: theme.space[4], display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[3], flexShrink: 0, borderBottom: '1px solid ' + theme.color.primaryLineWeak }));
export const ReviewTitle = styled.h2(({ theme }) => ({ margin: 0, color: theme.color.primarySoft, fontSize: theme.size.lg, overflowWrap: 'anywhere' }));
export const ReviewBody = styled(ScrollArea)(({ theme }) => ({ padding: theme.space[4], display: 'flex', flexDirection: 'column', gap: theme.space[4], flex: 1 }));
export const ReviewInput = styled.input(({ theme }) => ({ minWidth: 0, width: '100%', background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLine, color: theme.color.ink, padding: theme.space[3], font: 'inherit', fontSize: theme.size.md, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
export const ReviewTextArea = styled.textarea(({ theme }) => ({ width: '100%', minHeight: theme.space[8], resize: 'vertical', background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLineWeak, color: theme.color.ink, padding: theme.space[3], font: 'inherit', fontSize: theme.size.sm, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
export const InlineButton = styled.button(({ theme }) => ({ color: theme.color.primarySoft, fontSize: theme.size.sm, textAlign: 'left', padding: theme.space[1], textDecoration: 'underline', '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
export const ReviewLabel = styled.label(({ theme }) => ({ fontSize: theme.size.md, display: 'flex', flexDirection: 'column', gap: theme.space[2], color: theme.color.inkSub }));
export const CheckLabel = styled.label(({ theme }) => ({ display: 'flex', alignItems: 'flex-start', gap: theme.space[2], fontSize: theme.size.sm, lineHeight: 1.7, input: { accentColor: theme.color.primary, marginTop: theme.space[1] } }));
