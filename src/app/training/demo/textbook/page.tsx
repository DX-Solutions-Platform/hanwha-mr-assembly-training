import { TrainingLessonEditor } from '@/features/drawing-upload/lesson-editor/TrainingLessonEditor';

export default async function TrainingDemoCreatePage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const { registered } = await searchParams;
  return <TrainingLessonEditor key={registered} mode="demo-create" openRegistered={registered === 'nuri'} />;
}
