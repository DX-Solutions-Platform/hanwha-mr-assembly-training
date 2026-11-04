export type CardStatus = 'done' | 'now' | 'idle' | 'final';

export interface AssemblyStep { id: string; guide: string; toolId?: string; partIds?: string[]; }
export interface AssemblyCard { id: string; groupLabel: string; name: string; description: string; minutes: number; status: CardStatus; steps: AssemblyStep[]; thumbnailUrl?: string; }
export interface Part { id: string; name: string; spec: string; quantity: number; kind: 'part' | 'fastener' | 'tool'; description: string; modelUrl?: string; }
export interface Tool { id: string; code: string; name: string; spec: string; description: string; modelUrl?: string; }
export interface Product {
  id: string; code: string; name: string; isLive: boolean; isCustom?: boolean;
  /** single: 한 덩어리를 계속 쌓는 도면(카드 1장) · multi: 덩어리별 카드 + 최종 결합 */
  structure: 'single' | 'multi';
  /** 3D 모델 데이터 id (src/data/models) */
  modelId: string;
  cards: AssemblyCard[]; parts: Part[]; coverImageUrl?: string;
}
