import { normalizeText, unionRect } from './textLayout';
import { getBomHeaderBlock } from './bomHeaderBlocks';
import type { TextLine, TextToken } from './types';

export type ColumnKey = 'item' | 'partNumber' | 'name' | 'quantity' | 'material' | 'specification';
export interface BomColumn { key: ColumnKey; x: number; width: number; }
export interface BomHeader { lineIndex: number; endLineIndex: number; columnList: BomColumn[]; left: number; right: number; }
const HEADER_PATTERN: [ColumnKey, RegExp][] = [
  ['quantity', /수\s*량|개\s*수|(?<![a-z])(?:qty|quantity|quantite|qte|nombre|nb)(?![a-z])/g],
  ['partNumber', /부품\s*번호|품\s*번|도\s*번|(?<![a-z])(?:part\s*(?:no\.?|number)|p\/n|reference|ref\.?)(?![a-z])/g],
  ['item', /항\s*번|순\s*번|번\s*호|(?<![a-z])(?:item|no\.?|position|pos\.?|repere|rep\.?)(?![a-z])/g],
  ['name', /부품\s*명|품\s*명|명\s*칭|(?<![a-z])(?:description|designation|denomination|part\s*name|name)(?![a-z])/g],
  ['material', /재\s*질|재\s*료|(?<![a-z])(?:material|matiere|mat\.?)(?![a-z])/g],
  ['specification', /규\s*격|비\s*고|(?<![a-z])(?:specification|spec\.?|standard|norme|remarks?)(?![a-z])/g],
];

function joinHeaderTokens(line: TextLine) {
  const tokenList: TextToken[] = [];
  for (const token of line.tokenList) {
    const previous = tokenList[tokenList.length - 1];
    const gap = previous ? token.rect.x - previous.rect.x - previous.rect.width : Infinity;
    if (previous && gap >= 0 && gap <= Math.max(previous.rect.height, token.rect.height) * 0.8) {
      tokenList[tokenList.length - 1] = { ...previous, text: previous.text + ' ' + token.text, rect: unionRect([previous.rect, token.rect]) };
    } else tokenList.push(token);
  }
  return tokenList;
}

export function findBomHeaders(lineList: TextLine[]): BomHeader[] {
  const headerList: BomHeader[] = [];
  lineList.forEach((originalLine, lineIndex) => {
    if (headerList.some((header) => lineIndex <= header.endLineIndex)) return;
    const { line, endLineIndex } = getBomHeaderBlock(lineList, lineIndex);
    const columnList: BomColumn[] = [];
    const occupiedList: { start: number; end: number; tokenIndex: number }[] = [];
    joinHeaderTokens(line).forEach((token, tokenIndex) => {
      const text = normalizeText(token.text);
      for (const [key, pattern] of HEADER_PATTERN) {
        pattern.lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
          const start = match.index!, end = start + match[0].length;
          if (occupiedList.some((range) => range.tokenIndex === tokenIndex && start < range.end && end > range.start)) continue;
          occupiedList.push({ start, end, tokenIndex });
          const width = token.rect.width * match[0].length / text.length;
          columnList.push({ key, x: token.rect.x + token.rect.width * start / text.length, width });
        }
      }
    });
    const uniqueList = columnList.filter((column, index) => columnList.findIndex((item) => item.key === column.key) === index).sort((a, b) => a.x - b.x);
    if (!uniqueList.some((column) => column.key === 'quantity') || !uniqueList.some((column) => column.key === 'name' || column.key === 'partNumber') || uniqueList.length < 2) return;
    const first = uniqueList[0], last = uniqueList[uniqueList.length - 1];
    const gap = uniqueList.length > 1 ? last.x - uniqueList[uniqueList.length - 2].x : 0.15;
    headerList.push({ lineIndex, endLineIndex, columnList: uniqueList, left: Math.max(0, first.x - originalLine.rect.height * 2), right: Math.min(1, last.x + Math.max(last.width * 2, gap)) });
  });
  return headerList;
}
