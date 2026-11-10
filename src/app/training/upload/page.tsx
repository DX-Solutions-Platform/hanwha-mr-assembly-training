import { redirect } from 'next/navigation';
import { StepUploadScreen } from '@/features/drawing-upload/StepUploadScreen';
import { DrawingFlowScreen } from '@/features/drawing-flow/DrawingFlowScreen';

export default async function StepUploadPage({ searchParams }: { searchParams: Promise<{ example?: string | string[]; qwen?: string | string[]; start?: string | string[]; mode?: string | string[] }> }) {
  const { example, qwen, start, mode } = await searchParams;
  const legacy = new URLSearchParams();
  if (example === 'assembly' || example === 'flange') legacy.set('example', example);
  if (qwen === 'off' || qwen === 'awq' || qwen === '8b') legacy.set('qwen', qwen);
  if (legacy.size) redirect('/training/upload-dev?' + legacy.toString());
  if (mode === 'step') return <StepUploadScreen />;
  return <DrawingFlowScreen start={typeof start === 'string' ? Number(start) : undefined} showLibrary={mode === 'lessons'} />;
}
