import { HudReferenceScreen } from '@/features/reference-pages/ReferenceScreens';

// 교육장: /training/hud?product=hydraulic-pump&card=0
export default async function HudPage({ searchParams }: { searchParams: Promise<{ product?: string; card?: string }> }) {
  const { card = '0' } = await searchParams;
  return <HudReferenceScreen cardIndex={Number(card)} />;
}
