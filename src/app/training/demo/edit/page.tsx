import { TrainingLessonEditor } from '@/features/drawing-upload/lesson-editor/TrainingLessonEditor';

export default async function TrainingDemoEditPage({ searchParams }: {
  searchParams: Promise<{ from?: string; module?: string; step?: string }>;
}) {
  const { from, module: moduleId, step: stepId } = await searchParams;
  const openCreated = from === 'create';
  return <TrainingLessonEditor key={JSON.stringify(openCreated ? [moduleId, stepId] : null)} mode="demo-edit"
    openCreated={openCreated} initialSelection={openCreated ? { moduleId, stepId } : undefined} />;
}
