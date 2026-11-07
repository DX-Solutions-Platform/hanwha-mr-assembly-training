import styled from 'styled-components';
import { AssemblyInput } from './assemblyStyles';
import type { TextTriple } from './assemblyTypes';

export function AssemblyVectorInput({ label, value, limit, unit, onChange }: { label: string; value: TextTriple; limit: number; unit: string; onChange: (value: TextTriple) => void }) {
  return <Root><Title>{label} <span>{unit}</span></Title><Fields>{value.map((text, index) => <Field key={index}>{['X', 'Y', 'Z'][index]}<AssemblyInput aria-label={'조립품 ' + label + ' ' + ['X', 'Y', 'Z'][index]} type="number" min={-limit} max={limit} step="any" value={text} onChange={(event) => { const next = [...value] as TextTriple; next[index] = event.target.value; onChange(next); }} /></Field>)}</Fields></Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2] }));
const Title = styled.strong(({ theme }) => ({ fontSize: theme.size.md, fontWeight: theme.weight.medium, span: { color: theme.color.inkMuted, fontSize: theme.size.sm } }));
const Fields = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: theme.space[2] }));
const Field = styled.label(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], minWidth: 0, color: theme.color.inkMuted, fontSize: theme.size.sm }));
