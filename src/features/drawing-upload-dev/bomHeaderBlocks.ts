import { normalizeText, unionRect } from './textLayout';
import type { TextLine, TextToken } from './types';

const WORDS = /^(?:(?:item|part|no|number|p\/n|description|designation|denomination|name|qty|quantity|quantite|qte|nombre|nb|material|matiere|mat|specification|spec|standard|norme|remark|remarks|reference|ref|position|pos|repere|rep)|[부품번호명칭수량개재질료규격비고항순도번])(?:[\s./-]*(?:(?:item|part|no|number|description|name|qty|quantity|material|spec)|[부품번호명칭수량개재질료규격비고항순도번]))*[\s.]*$/;
const isHeaderLine = (line: TextLine) => line.tokenList.length > 0 && line.tokenList.every((token) => WORDS.test(normalizeText(token.text).trim()));

/** Join headings printed on two or three baselines without consuming data rows. */
export function getBomHeaderBlock(lineList: TextLine[], start: number) {
  const lines = [lineList[start]];
  if (isHeaderLine(lines[0])) for (let offset = 1; offset < 3; offset++) {
    const next = lineList[start + offset], previous = lines[lines.length - 1];
    if (!next || !isHeaderLine(next) || next.rect.y - previous.rect.y - previous.rect.height > Math.max(next.rect.height, previous.rect.height) * 1.2) break;
    lines.push(next);
  }
  const tokens: TextToken[] = [];
  for (const line of lines) for (const token of line.tokenList) {
    const above = tokens.findIndex((item) => token.rect.y > item.rect.y + item.rect.height * .5 && Math.abs(token.rect.x - item.rect.x) < Math.max(token.rect.height, item.rect.height) * 1.5);
    if (above < 0) tokens.push(token);
    else tokens[above] = { ...tokens[above], text: tokens[above].text + ' ' + token.text, rect: unionRect([tokens[above].rect, token.rect]) };
  }
  return { line: { text: lines.map((line) => line.text).join(' '), tokenList: tokens.sort((a, b) => a.rect.x - b.rect.x), rect: unionRect(lines.map((line) => line.rect)) }, endLineIndex: start + lines.length - 1 };
}
