import type { ReviewField } from '../reviewTypes';
import { parseReviewQuantity } from '../reviewModel';

export interface ImportedReviewRow { partNumber: string; values: Partial<Record<ReviewField, string>>; }
export interface ReviewImportResult { rowList: ImportedReviewRow[]; warnings: string[]; }
type ImportColumn = ReviewField | 'partNumber';
const HEADERS: Record<string, ImportColumn> = {
  '부품번호': 'partNumber', '품번': 'partNumber', '도번': 'partNumber', 'partno': 'partNumber', 'partnumber': 'partNumber', 'pn': 'partNumber',
  '품명': 'name', '부품명': 'name', '명칭': 'name', 'name': 'name', 'partname': 'name', 'description': 'name',
  '수량': 'quantity', '개수': 'quantity', 'qty': 'quantity', 'quantity': 'quantity',
  '재질': 'material', '재료': 'material', 'material': 'material',
  '규격': 'specification', '비고': 'specification', '규격비고': 'specification', 'spec': 'specification', 'specification': 'specification', 'remarks': 'specification',
};
export const normalizePartNumber = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const normalizeHeader = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/[\s._/·-]/g, '');
function readRows(text: string) {
  const first = text.split(/\r?\n/, 1)[0];
  const delimiter = ['\t', ',', ';'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows: string[][] = [], row: string[] = [];
  let value = '', quoted = false, afterQuote = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index++; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else value += char;
    } else if (char === '"' && !value && !afterQuote) quoted = true;
    else if (char === delimiter || char === '\n' || char === '\r') {
      row.push(value.trim()); value = ''; afterQuote = false;
      if (char !== delimiter) { if (row.some(Boolean)) rows.push([...row]); row.length = 0; if (char === '\r' && text[index + 1] === '\n') index++; }
    } else if (afterQuote && char.trim()) throw new Error('따옴표 뒤의 구분자를 확인해 주세요.');
    else if (!afterQuote) value += char;
  }
  if (quoted) throw new Error('닫히지 않은 따옴표가 있습니다.');
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  if (rows.length > 5001) throw new Error('부품표는 5,000행 이하로 가져올 수 있습니다.');
  return rows;
}
/** CSV and Excel tabular paste are matched by the exact printed part number. */
export function parseReviewImport(input: string): ReviewImportResult {
  if (!input.trim()) return { rowList: [], warnings: [] };
  if (input.length > 2 * 1024 * 1024) throw new Error('2 MB 이하의 부품표를 사용하세요.');
  const [header = [], ...rows] = readRows(input.replace(/^\uFEFF/, ''));
  const columns = header.map((value) => { const key = normalizeHeader(value); return Object.hasOwn(HEADERS, key) ? HEADERS[key] : undefined; });
  if (!columns.includes('partNumber') || !columns.some((value) => value && value !== 'partNumber')) throw new Error('첫 행에 부품번호와 품명·수량·재질·규격 중 하나 이상의 열 이름이 필요합니다.');
  const known = columns.filter(Boolean);
  if (new Set(known).size !== known.length) throw new Error('같은 종류의 열 이름이 중복되어 있습니다.');
  const result = new Map<string, ImportedReviewRow>(), blocked = new Set<string>(), warnings: string[] = [];
  for (const [index, row] of rows.entries()) {
    const partNumber = normalizePartNumber(row[columns.indexOf('partNumber')] ?? '');
    if (!partNumber || partNumber.length > 2000 || row.length !== header.length) { warnings.push((index + 2) + '행: 부품번호 또는 열 개수가 달라 제외했습니다.'); continue; }
    const values: ImportedReviewRow['values'] = {};
    let invalid = false;
    columns.forEach((field, column) => {
      if (!field || field === 'partNumber' || !row[column]) return;
      const value = row[column];
      if (value.length > (field === 'quantity' ? 100 : 2000) || (field === 'quantity' && parseReviewQuantity(value) === null)) invalid = true;
      else values[field] = value;
    });
    if (invalid) { warnings.push((index + 2) + '행: 수량 또는 입력값이 올바르지 않아 제외했습니다.'); continue; }
    if (blocked.has(partNumber)) continue;
    const existing = result.get(partNumber);
    if (existing && (Object.keys(values) as ReviewField[]).some((key) => existing.values[key] && existing.values[key] !== values[key])) {
      result.delete(partNumber); blocked.add(partNumber); warnings.push(partNumber + ': 같은 부품번호의 값이 달라 이 번호는 제외했습니다.');
    } else result.set(partNumber, { partNumber, values: { ...existing?.values, ...values } });
  }
  return { rowList: [...result.values()], warnings };
}
