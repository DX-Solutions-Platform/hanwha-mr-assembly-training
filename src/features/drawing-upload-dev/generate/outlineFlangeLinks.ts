import { normalizeLibraryNumber } from '@/features/part-library/libraryTypes';

export interface OutlineFlangeLink { key: string; partNumber: string; quantity: number; }
const storageKey = (hash: string) => 'hanwha.outline-flange-links.v1.' + hash;

export function readOutlineFlangeLinks(hash: string): OutlineFlangeLink[] {
  try {
    const entries: unknown = JSON.parse(localStorage.getItem(storageKey(hash)) ?? '[]');
    if (!Array.isArray(entries)) return [];
    return entries.filter((entry): entry is OutlineFlangeLink => entry && typeof entry.key === 'string' && /^(outline:\d+:\d+:\d+:\d+|drawing:\d+:\d+:\d+:\d+:\d+)$/.test(entry.key)
      && typeof entry.partNumber === 'string' && entry.partNumber.length <= 200 && !!normalizeLibraryNumber(entry.partNumber)
      && Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 10000)
      .map((entry) => ({ ...entry, partNumber: normalizeLibraryNumber(entry.partNumber) }));
  } catch { return []; }
}

export function storeOutlineFlangeLink(hash: string, link: OutlineFlangeLink) {
  const links = readOutlineFlangeLinks(hash).filter((entry) => entry.key !== link.key);
  localStorage.setItem(storageKey(hash), JSON.stringify([...links, link]));
}
