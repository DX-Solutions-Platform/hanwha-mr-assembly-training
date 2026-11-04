import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { JetBrains_Mono } from 'next/font/google';
import StyledComponentsRegistry from '@/lib/StyledComponentsRegistry';
import { Providers } from './Providers';

const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = { title: 'HANWHA · MR 조립 교육', description: 'Meta Quest 3 / PC 조립 교육' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#000000' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={jetBrainsMono.variable}>
      {/* Browser extensions may add body attributes before React hydrates. */}
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
