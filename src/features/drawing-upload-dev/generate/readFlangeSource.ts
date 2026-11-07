import { analyzePdf } from '../analyzePdf';
import type { DrawingPage, Evidence } from '../types';
import { parseFlangeDraft } from './flangeModel';
import { FLANGE_FIELD_LIST, type FlangeInputs, type FlangeSource } from './flangeTypes';

const modelMarker = /^MODEL\s*=\s*FLANGE_V1$/i;
export function hasFlangeMarker(page: DrawingPage) {
  return page.lineList.some((line) => modelMarker.test(line.text.trim()) || line.tokenList.some((token) => modelMarker.test(token.text.trim())));
}

export function readFlangeParameters(pageList: DrawingPage[]) {
  const tokenList = pageList.flatMap((page) => page.lineList.flatMap((line) => [line, ...line.tokenList].map((token) => ({ pageNumber: page.pageNumber, text: token.text.trim(), rect: token.rect }))));
  if (!pageList.some(hasFlangeMarker)) throw new Error('이 예시는 FLANGE_V1 치수 라벨이 있는 PDF를 지원합니다. 임의 도면의 자동 형상 판별은 아직 지원하지 않습니다.');
  const parameters = {} as FlangeInputs, evidence = {} as FlangeSource['evidence'];
  for (const field of FLANGE_FIELD_LIST) {
    const unit = field.unit === 'mm' ? 'mm' : field.unit === '°' ? 'deg' : '';
    const pattern = new RegExp('^' + field.symbol + '\\s*=\\s*(\\d+(?:\\.\\d+)?)\\s*' + unit + '$', 'i');
    const matches = tokenList.filter((token) => pattern.test(token.text));
    if (!matches.length || new Set(matches.map((token) => Number(token.text.match(pattern)![1]))).size !== 1) throw new Error(field.symbol + ' 치수를 한 값으로 읽지 못했습니다. 예시와 같은 형식의 치수 라벨을 확인하세요.');
    parameters[field.key] = matches[0].text.match(pattern)![1]; evidence[field.key] = matches[0];
  }
  return { parameters, evidence };
}

export function extractFlangeSource(pageList: DrawingPage[]) {
  const { parameters, evidence } = readFlangeParameters(pageList);
  const partList = pageList.flatMap((page) => page.partList.filter((part) => part.kind === 'table'));
  if (partList.length !== 1 || !partList[0].partNumber) throw new Error('부품표에서 하나의 플랜지 부품번호를 확인해야 합니다.');
  const part = partList[0];
  const parsed = parseFlangeDraft({ parameters, part: { partNumber: part.partNumber, name: part.name, material: part.material, quantity: part.quantityText } });
  if (!parsed.values) throw new Error('PDF 치수 검증: ' + parsed.issues.join(' '));
  return { values: parsed.values, evidence, partEvidence: part.source as Evidence };
}
export async function readFlangePdf(file: File, signal: AbortSignal): Promise<FlangeSource> {
  if (!/\.pdf$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error('이 예시에는 5 MB 이하의 PDF를 선택해 주세요.');
  const pageList: DrawingPage[] = [];
  try {
    await analyzePdf(file, signal, () => {}, (page) => { pageList.push(page); if (pageList.length > 5) throw new Error('이 예시는 5쪽 이하의 도면을 지원합니다.'); });
    const extracted = extractFlangeSource(pageList);
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    if (signal.aborted) throw new DOMException('중지했습니다.', 'AbortError');
    const sha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
    return { ...extracted, pageList, document: { sha256, name: file.name, size: file.size, pageCount: pageList.length }, sourceUrl: URL.createObjectURL(file) };
  } catch (reason) { pageList.forEach((page) => URL.revokeObjectURL(page.imageUrl)); throw reason; }
}
export function releaseFlangeSource(source: FlangeSource) {
  source.pageList.forEach((page) => URL.revokeObjectURL(page.imageUrl)); URL.revokeObjectURL(source.sourceUrl);
}
