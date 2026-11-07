'use client';
import type { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileGuideScreen } from './MobileGuideScreen';

/** 클라이언트 단계 모바일 차단 (서버 proxy가 놓친 iPad 데스크톱 모드 등) */
export function MobileGuard({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileGuideScreen /> : <>{children}</>;
}
