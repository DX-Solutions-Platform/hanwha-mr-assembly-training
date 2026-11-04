const QUEST_PATTERN = /OculusBrowser|Quest/i;
const MOBILE_PATTERN = /Android|iPhone|iPad|iPod|Mobile/i;

/** 휴대폰·태블릿이면 true. Meta Quest 브라우저는 항상 허용 */
export function isBlockedDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (QUEST_PATTERN.test(userAgent)) return false;
  const isIpadDesktopMode = maxTouchPoints > 1 && /Macintosh/.test(userAgent);
  return MOBILE_PATTERN.test(userAgent) || isIpadDesktopMode;
}
