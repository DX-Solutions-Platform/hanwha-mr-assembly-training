import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import StyledComponentsRegistry from '@/lib/StyledComponentsRegistry';
import { Providers } from './Providers';

const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = { title: 'HANWHA · MR 조립 교육', description: 'Meta Quest 3 / PC 조립 교육' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#000000' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={jetBrainsMono.variable}>
      {/* 브라우저 확장이 body에 삽입하는 속성 차이만 허용합니다. 하위 요소는 계속 검증합니다. */}
      <body suppressHydrationWarning>
        {/* 초기 HTML의 방향키는 React 초기화를 기다리지 않고 연결합니다. */}
        <Script src="/intro-keyboard.js" strategy="beforeInteractive" />
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
