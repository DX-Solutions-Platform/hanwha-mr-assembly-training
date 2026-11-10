'use client';

import dynamic from 'next/dynamic';

const Workspace = dynamic(() => import('./DrawingFlowWorkspace'), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#0a0d10' }} />,
});

export function DrawingFlowScreen({ start, showLibrary }: { start?: number; showLibrary?: boolean }) {
  return <Workspace start={start} showLibrary={showLibrary} />;
}
