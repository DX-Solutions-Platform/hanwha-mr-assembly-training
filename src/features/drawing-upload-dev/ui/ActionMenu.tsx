import { useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { ActionButton } from './sharedStyles';

export interface ActionMenuItem { label: string; ariaLabel?: string; description?: string; group?: string; onClick: () => void; disabled?: boolean; danger?: boolean; checked?: boolean; }
export function ActionMenu({ items, label = '더보기', compact = false, direction = 'up' }: { items: ActionMenuItem[]; label?: string; compact?: boolean; direction?: 'up' | 'down' }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null), triggerRef = useRef<HTMLButtonElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: Event) => { if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); return; }
      if (!rootRef.current?.contains(document.activeElement) || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      if (!buttons.length) return;
      event.preventDefault();
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    };
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', keyboard); };
  }, [isOpen]);
  return <Root ref={rootRef}>
    <Trigger ref={triggerRef} type="button" $compact={compact} aria-label={label} aria-expanded={isOpen} aria-controls={id} onClick={() => setIsOpen((value) => !value)} onKeyDown={(event) => {
      if (!isOpen && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); setIsOpen(true);
        requestAnimationFrame(() => { const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'); if (buttons?.length) buttons[event.key === 'ArrowUp' ? buttons.length - 1 : 0].focus(); });
      }
    }}>{label}<Chevron aria-hidden="true">{isOpen ? '▴' : '▾'}</Chevron></Trigger>
    {isOpen && <Panel ref={panelRef} id={id} role="group" aria-label={label + ' 작업'} $direction={direction}>{items.map((item, index) => <Entry key={item.ariaLabel ?? item.label} $separated={!!index && item.group !== items[index - 1].group}>
      {item.group && (!index || item.group !== items[index - 1].group) && <Group>{item.group}</Group>}
      <MenuButton type="button" disabled={item.disabled} $danger={!!item.danger} aria-label={item.ariaLabel ?? item.label} aria-pressed={item.checked} aria-describedby={item.description ? id + '-' + index : undefined} onClick={() => { setIsOpen(false); triggerRef.current?.focus(); item.onClick(); }}>
        {item.checked !== undefined && <Check aria-hidden="true">{item.checked ? '✓' : ''}</Check>}
        <span>{item.label}{item.description && <small id={id + '-' + index}>{item.description}</small>}</span>
      </MenuButton>
    </Entry>)}</Panel>}
  </Root>;
}
const Root = styled.div({ position: 'relative', flexShrink: 0 });
const Trigger = styled(ActionButton)<{ $compact: boolean }>(({ theme, $compact }) => ({ minHeight: $compact ? theme.space[6] + theme.space[2] : theme.space[7], fontSize: $compact ? theme.size.sm : theme.size.md, padding: '0 ' + ($compact ? theme.space[3] : theme.space[4]) + 'px' }));
const Chevron = styled.span(({ theme }) => ({ fontSize: theme.size.xs, color: theme.color.inkMuted }));
const Panel = styled.div<{ $direction: 'up' | 'down' }>(({ theme, $direction }) => ({ position: 'absolute', right: 0, ...($direction === 'up' ? { bottom: 'calc(100% + ' + theme.space[2] + 'px)' } : { top: 'calc(100% + ' + theme.space[2] + 'px)' }), zIndex: 30, width: theme.space[8] * 4 + theme.space[6], maxHeight: theme.space[8] * 8, overflow: 'auto', padding: theme.space[2], border: '1px solid ' + theme.color.primaryLine, background: theme.color.bgMid, boxShadow: '0 ' + theme.space[2] + 'px ' + theme.space[5] + 'px ' + theme.color.panelStrong }));
const Entry = styled.div<{ $separated: boolean }>(({ theme, $separated }) => ({ marginTop: $separated ? theme.space[2] : 0, paddingTop: $separated ? theme.space[2] : 0, borderTop: $separated ? '1px solid ' + theme.color.primaryLineWeak : 'none' }));
const Group = styled.div(({ theme }) => ({ padding: theme.space[2] + 'px ' + theme.space[3] + 'px', color: theme.color.inkMuted, fontSize: theme.size.xs }));
const MenuButton = styled.button<{ $danger: boolean }>(({ theme, $danger }) => ({ width: '100%', display: 'flex', gap: theme.space[2], alignItems: 'center', minHeight: theme.space[6] + theme.space[2], padding: theme.space[2] + 'px ' + theme.space[3] + 'px', textAlign: 'left', color: $danger ? theme.color.danger : theme.color.ink, fontSize: theme.size.md, span: { minWidth: 0 }, small: { display: 'block', marginTop: theme.space[1], color: theme.color.inkMuted, fontSize: theme.size.xs, lineHeight: 1.5 }, '&:hover:enabled': { background: theme.color.primaryFill }, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: -2 }, '&:disabled': { opacity: .45, cursor: 'not-allowed' } }));
const Check = styled.b(({ theme }) => ({ width: theme.space[4], flexShrink: 0, fontSize: theme.size.sm, color: theme.color.success }));
