(() => {
  if (window.__hanwhaIntroKeyboard) return;
  window.__hanwhaIntroKeyboard = true;
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing) return;
    const root = document.querySelector('[data-project-intro]');
    if (!root) return;
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return;
    const action = { ArrowRight: 'next', ArrowLeft: 'previous', Escape: 'skip', Enter: 'confirm' }[event.key];
    if (!action) return;
    if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('a, button')) return;
    const link = root.querySelector(`[data-intro-action="${action}"]`);
    if (!(link instanceof HTMLAnchorElement) || link.getAttribute('aria-disabled') === 'true') return;
    event.preventDefault(); link.click();
  }, true);
})();
