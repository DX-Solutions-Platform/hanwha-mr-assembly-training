import { redirect } from 'next/navigation';
import { StepUploadScreen } from '@/features/drawing-upload/StepUploadScreen';

export default async function StepUploadPage({ searchParams }: { searchParams: Promise<{ example?: string | string[]; qwen?: string | string[] }> }) {
  const { example, qwen } = await searchParams;
  const legacy = new URLSearchParams();
  if (example === 'assembly' || example === 'flange') legacy.set('example', example);
  if (qwen === 'off' || qwen === 'awq') legacy.set('qwen', qwen);
  if (legacy.size) redirect('/training/upload-dev?' + legacy.toString());
  return <StepUploadScreen />;
}
