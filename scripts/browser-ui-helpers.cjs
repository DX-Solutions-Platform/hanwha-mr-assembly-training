// Click visible native controls, opening their disclosure first when needed.
function makeClick(page) {
  const find = (value) => page.evaluateHandle((text) => [...document.querySelectorAll('button')].find((node) =>
    !node.disabled && node.checkVisibility() && (node.getAttribute('aria-label') === text || node.textContent.trim() === text)), value);
  const press = async (handle) => {
    const button = handle.asElement();
    if (!button) { await handle.dispose(); return false; }
    try { await button.click(); return true; } finally { await handle.dispose(); }
  };
  return async (value) => {
    if (await press(await find(value))) return;
    for (const label of ['더보기', '예시로 둘러보기', '보기']) {
      const trigger = await find(label), button = trigger.asElement();
      if (!button) { await trigger.dispose(); continue; }
      const isOpen = await button.evaluate((node) => node.getAttribute('aria-expanded') === 'true');
      if (!isOpen) await button.click();
      await trigger.dispose();
      await page.waitForFunction((name) => [...document.querySelectorAll('button')].some((node) => node.getAttribute('aria-label') === name && node.getAttribute('aria-expanded') === 'true'), {}, label);
      if (await press(await find(value))) return;
      await page.keyboard.press('Escape');
    }
    throw new Error('Unavailable visible control: ' + value);
  };
}
module.exports = { makeClick };
