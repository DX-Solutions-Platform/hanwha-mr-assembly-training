'use client';
import { useSyncExternalStore } from 'react';
import type { Product } from '@/types/training';
import { BASE_PRODUCT_LIST } from '@/data/products';
import { COMPLEX_PRODUCT_LIST } from '@/data/complexProducts';

// 시연 모드: sessionStorage에 저장 → 새 세션은 항상 기본 3개로 시작
const STORAGE_KEY = 'dx_custom_training_list';
const listenerSet = new Set<() => void>();
let cachedCustomList: Product[] | null = null;

function readCustomList(): Product[] {
  if (cachedCustomList) return cachedCustomList;
  if (typeof window === 'undefined') return [];
  try { cachedCustomList = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { cachedCustomList = []; }
  return cachedCustomList!;
}

function writeCustomList(nextList: Product[]) {
  cachedCustomList = nextList;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextList)); } catch { /* 용량 초과 시 메모리에만 유지 */ }
  listenerSet.forEach((listener) => listener());
}

/** 도면 업데이트로 만든 교육을 목록 맨 뒤에 추가 (기존 교육은 바꾸지 않음) */
export function addCustomProduct(product: Product) {
  writeCustomList([...readCustomList().filter((item) => item.id !== product.id), { ...product, isCustom: true }]);
}

const subscribe = (listener: () => void) => { listenerSet.add(listener); return () => { listenerSet.delete(listener); }; };
const EMPTY_LIST: Product[] = [];

export function useProductList(): Product[] {
  const customList = useSyncExternalStore(subscribe, readCustomList, () => EMPTY_LIST);
  return customList.length ? [...BASE_PRODUCT_LIST, ...customList] : BASE_PRODUCT_LIST;
}

export function findProduct(productId: string): Product | undefined {
  return [...BASE_PRODUCT_LIST, ...COMPLEX_PRODUCT_LIST, ...readCustomList()].find((item) => item.id === productId);
}
