import { normalizeText, unionRect } from './textLayout';
import type { PartRecord, TextLine } from './types';

type Field = 'partNumber' | 'name' | 'quantity' | 'material' | 'specification';
const LABELS = /(부품\s*번호|품\s*번|도\s*번|PART\s*(?:NO\.?|NUMBER)|P\/N|부품\s*명|품\s*명|명\s*칭|PART\s*NAME|DESCRIPTION|수\s*량|QTY|QUANTITY|재\s*질|재\s*료|MATERIAL|MAT\.?|규\s*격|비\s*고|SPECIFICATION|SPEC\.?)\s*[:=]\s*/gi;
function fieldOf(label: string): Field {
  const key = normalizeText(label).replace(/[\s.]/g, '');
  if (/^(부품번호|품번|도번|partno|partnumber|p\/n)$/.test(key)) return 'partNumber';
  if (/^(부품명|품명|명칭|partname|description)$/.test(key)) return 'name';
  if (/^(수량|qty|quantity)$/.test(key)) return 'quantity';
  if (/^(재질|재료|material|mat)$/.test(key)) return 'material';
  return 'specification';
}
/** Only explicit labels on a page identifying one part can supply its attributes. */
export function extractLabeledPart(lineList: TextLine[], pageNumber: number, existing: PartRecord[]) {
  const fields: Record<Field, string[]> = { partNumber: [], name: [], quantity: [], material: [], specification: [] };
  const sourceLines: TextLine[] = [], lineIndices: number[] = [];
  lineList.forEach((line, lineIndex) => {
    LABELS.lastIndex = 0;
    const matches = [...line.text.matchAll(LABELS)];
    for (const [index, match] of matches.entries()) {
      const value = line.text.slice(match.index! + match[0].length, matches[index + 1]?.index ?? line.text.length).trim().replace(/[;|]+$/, '').trim();
      if (value) fields[fieldOf(match[1])].push(value);
    }
    if (matches.length) { sourceLines.push(line); lineIndices.push(lineIndex); }
  });
  const unique = (key: Field) => [...new Set(fields[key].map((value) => value.normalize('NFKC').replace(/\s+/g, ' ').trim()))];
  const numbers = unique('partNumber');
  if (numbers.length !== 1 || numbers[0].length > 200 || !/[\dA-Za-z가-힣]/.test(numbers[0]) || existing.some((part) => part.partNumber === numbers[0])) return null;
  const get = (key: Field) => { const values = unique(key); return values.length === 1 ? values[0] : ''; };
  const quantityText = get('quantity'), match = quantityText.match(/^(\d+(?:[.,]\d+)?)\s*(?:ea|pcs?\.?|개)?$/i);
  const quantity = match ? Number(match[1].replace(',', '.')) : null;
  return {
    part: { id: 'p' + pageNumber + '-label-0', kind: 'code', partNumber: numbers[0], item: '', name: get('name'),
      quantity: quantity !== null && quantity > 0 && Number.isFinite(quantity) ? quantity : null, quantityText,
      material: get('material'), specification: get('specification'),
      source: { pageNumber, text: sourceLines.map((line) => line.text).join('\n'), rect: unionRect(sourceLines.map((line) => line.rect)) },
    } satisfies PartRecord,
    lineIndices,
  };
}
