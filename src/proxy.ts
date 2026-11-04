import { NextResponse, type NextRequest } from 'next/server';
import { isBlockedDevice } from '@/lib/deviceGate';

const GUIDE_PATH = '/mobile';

/** 모바일 접근 차단 (서버 단계). Quest 3 브라우저는 허용. iPad 데스크톱 모드는 MobileGuard가 한 번 더 막습니다. */
export function proxy(request: NextRequest) {
  const isBlocked = isBlockedDevice(request.headers.get('user-agent') ?? '');
  const isGuidePage = request.nextUrl.pathname.startsWith(GUIDE_PATH);
  if (isBlocked && !isGuidePage) return NextResponse.rewrite(new URL(GUIDE_PATH, request.url));
  if (!isBlocked && isGuidePage) return NextResponse.redirect(new URL('/training', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|models|fonts|favicon.ico|.*\\..*).*)'] };
