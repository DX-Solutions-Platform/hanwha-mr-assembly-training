import { TrainingEntryScreen } from '@/features/training-start/TrainingEntryScreen';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ step?: string; view?: string }> }) {
  const query = await searchParams;
  const step = Number(query.step ?? 1);
  const initialStep = Number.isInteger(step) ? Math.max(0, Math.min(5, step - 1)) : 0;
  return <TrainingEntryScreen key={`${initialStep}-${query.view}`} initialStep={initialStep} initialView={query.view === 'start' ? 'start' : 'intro'} />;
}
