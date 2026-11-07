'use client';
import { useSyncExternalStore } from 'react';
import { isBlockedDevice } from '@/lib/deviceGate';

const subscribeToDevice = () => () => {};
const readClientDevice = () => isBlockedDevice(navigator.userAgent, navigator.maxTouchPoints);
// 서버의 모바일 차단은 proxy가 처리합니다. 초기 HTML은 빈 화면 대신 해당 페이지를 표시합니다.
const readServerDevice = () => false;

/** 휴대폰·태블릿 차단, Quest 브라우저는 허용. 서버와 hydration의 첫 화면을 일치시킵니다. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeToDevice, readClientDevice, readServerDevice);
}
