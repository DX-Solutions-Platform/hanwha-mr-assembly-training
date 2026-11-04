'use client';
import type { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { GlobalStyle } from '@/styles/GlobalStyle';
import { MobileGuard } from '@/components/common/MobileGuard';
import { PerfMeter } from '@/components/common/PerfMeter';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <MobileGuard>{children}</MobileGuard>
      <PerfMeter />
    </ThemeProvider>
  );
}
