import type { Product } from '@/types/training';

export type SelectionKind = 'pump' | 'car' | 'drone' | 'stool';
export interface SelectionProduct {
  kind: SelectionKind | 'nuri';
  code: string;
  name: string;
  meta: string;
  cardCount: number;
  isLive: boolean;
  isCustom: boolean;
}

/** Demo 1.dc.html: getData()의 prods/shelf. 실습용 Product 데이터는 바꾸지 않습니다. */
export function getSelectionProducts(productList: Product[], nuriRegistered = false): SelectionProduct[] {
  const products: SelectionProduct[] = productList.map((product) => {
    const isCustom = !!product.isCustom;
    const kind: SelectionKind = isCustom ? 'stool' : product.id === 'hydraulic-pump' ? 'pump' : product.id === 'vehicle' ? 'car' : 'drone';
    const cardCount = kind === 'pump' ? 7 : kind === 'car' ? 12 : kind === 'drone' ? 8 : product.cards.length;
    const isLive = isCustom || kind === 'pump';
    return {
      kind, cardCount, isLive, isCustom, name: product.name,
      code: isCustom ? 'NEW · 도면에서 생성' : product.code,
      meta: isLive ? `조립 카드 ${cardCount}` : '준비 중',
    };
  });
  if (nuriRegistered) products.push({
    kind: 'nuri', code: 'KSLV-Ⅱ', name: '누리호', meta: '등록된 3D 교범', cardCount: 0, isLive: true, isCustom: false,
  });
  return products;
}
