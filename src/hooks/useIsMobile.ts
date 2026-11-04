'use client';
import { useEffect, useState } from 'react';
import { isBlockedDevice } from '@/lib/deviceGate';

/** 휴대폰·태블릿 차단, Quest 브라우저는 허용. null = 판별 전 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => { setIsMobile(isBlockedDevice(navigator.userAgent, navigator.maxTouchPoints)); }, []);
  return isMobile;
}
