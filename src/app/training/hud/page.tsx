import { HudScreen } from '@/features/hud/HudScreen';

// 교육장: /training/hud?product=hydraulic-pump&card=0
export default async function HudPage({ searchParams }: { searchParams: Promise<{ product?: string; card?: string }> }) {
  const { product = 'hydraulic-pump', card = '0' } = await searchParams;
  return <HudScreen productId={product} cardIndex={Number(card)} />;
}
