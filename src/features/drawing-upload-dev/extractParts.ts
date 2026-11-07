import { findBomHeaders, type BomHeader, type ColumnKey } from './bomHeaders';
import { splitTextToken, unionRect } from './textLayout';
import { extractLabeledPart } from './extractLabeledPart';
import type { PartRecord, SourceRect, TextLine, TextToken } from './types';

function readCells(line: TextLine, header: BomHeader): Partial<Record<ColumnKey, string>> {
  const cells: Partial<Record<ColumnKey, string>> = {};
  const columns = header.columnList;
  for (const token of line.tokenList.flatMap(splitTextToken)) {
    // A long description can cross the next heading while still starting in its cell.
    const center = token.rect.x + Math.min(token.rect.width / 2, token.rect.height);
    if (center < header.left || center > header.right) continue;
    let columnIndex = columns.findIndex((column, index) => {
      if (index === columns.length - 1) return true;
      const next = columns[index + 1];
      return center < (column.x + column.width / 2 + next.x + next.width / 2) / 2;
    });
    if (columnIndex < 0) columnIndex = columns.length - 1;
    const key = columns[columnIndex].key;
    cells[key] = [cells[key], token.text].filter(Boolean).join(' ');
  }
  return cells;
}

export function extractParts(lineList: TextLine[], tokenList: TextToken[], pageNumber: number) {
  const partList: PartRecord[] = [], tableLineSet = new Set<number>();
  const tableRectList: SourceRect[] = [];
  const headerList = findBomHeaders(lineList);
  for (const header of headerList) {
    for (let index = header.lineIndex; index <= header.endLineIndex; index++) {
      tableLineSet.add(index);
      tableRectList.push({ x: header.left, y: lineList[index].rect.y, width: header.right - header.left, height: lineList[index].rect.height });
    }
    let lastPart: PartRecord | undefined;
    let gapCount = 0;
    for (let index = header.endLineIndex + 1; index < lineList.length; index++) {
      if (headerList.some((item) => item.lineIndex === index)) break;
      const originalLine = lineList[index];
      const tableTokens = originalLine.tokenList.filter((token) => token.rect.x + token.rect.width / 2 >= header.left && token.rect.x + token.rect.width / 2 <= header.right);
      if (!tableTokens.length) { if (++gapCount >= 2) break; continue; }
      const line = { ...originalLine, tokenList: tableTokens, text: tableTokens.map((token) => token.text).join(' '), rect: unionRect(tableTokens.map((token) => token.rect)) };
      if (lastPart && line.rect.y - lastPart.source.rect.y - lastPart.source.rect.height > Math.max(line.rect.height * 5, 0.045)) break;
      const cells = readCells(line, header);
      const quantityText = cells.quantity?.trim() ?? '';
      const match = quantityText.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|ea|pcs?\.?|개)?$/i);
      const quantity = match ? Number(match[1].replace(',', '.')) : null;
      const hasQuantity = quantity !== null && quantity > 0 && Number.isFinite(quantity);
      const hasIdentity = !!(cells.name || cells.partNumber);
      const populatedCount = Object.values(cells).filter(Boolean).length;
      const isRow = hasIdentity && ((hasQuantity && populatedCount >= 2) || (!!cells.item && populatedCount >= 3));
      if (isRow) {
        lastPart = {
          id: 'p' + pageNumber + '-part-' + partList.length, kind: 'table',
          item: cells.item ?? '', partNumber: cells.partNumber ?? '', name: cells.name ?? '',
          quantity: hasQuantity ? quantity : null, quantityText, material: cells.material ?? '', specification: cells.specification ?? '',
          source: { pageNumber, text: line.text, rect: line.rect },
        };
        partList.push(lastPart); tableLineSet.add(index); gapCount = 0;
        tableRectList.push({ x: header.left, y: line.rect.y, width: header.right - header.left, height: line.rect.height });
      } else if (lastPart && !cells.item && !quantityText && hasIdentity && line.rect.y - lastPart.source.rect.y - lastPart.source.rect.height < line.rect.height * 1.8) {
        lastPart.name = [lastPart.name, cells.name].filter(Boolean).join(' ');
        lastPart.material = [lastPart.material, cells.material].filter(Boolean).join(' ');
        lastPart.specification = [lastPart.specification, cells.specification].filter(Boolean).join(' ');
        lastPart.source = { pageNumber, text: lastPart.source.text + '\n' + line.text, rect: unionRect([lastPart.source.rect, line.rect]) };
        tableLineSet.add(index);
        tableRectList.push({ x: header.left, y: line.rect.y, width: header.right - header.left, height: line.rect.height });
      } else if (++gapCount >= 2) break;
    }
  }
  const labeled = extractLabeledPart(lineList, pageNumber, partList);
  if (labeled) { partList.push(labeled.part); labeled.lineIndices.forEach((index) => tableLineSet.add(index)); }
  // A printed numeric code is evidence of a code, not proof of a BOM row or quantity.
  for (const token of tokenList) {
    const code = token.text.trim();
    if (!/^\d{5,12}$/.test(code) || partList.some((part) => part.partNumber === code || (part.kind === 'table' && token.rect.x >= part.source.rect.x && token.rect.x <= part.source.rect.x + part.source.rect.width && token.rect.y >= part.source.rect.y && token.rect.y <= part.source.rect.y + part.source.rect.height))) continue;
    partList.push({ id: 'p' + pageNumber + '-code-' + partList.length, kind: 'code', item: '', partNumber: code, name: '', quantity: null, quantityText: '', material: '', specification: '', source: { pageNumber, text: code, rect: token.rect } });
  }
  return { partList, tableLineSet, tableRectList, headerCount: headerList.length };
}
