import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFImage, type PDFPage } from 'pdf-lib';
import { loadFont, textTools } from './lessonPdfText';
import { demoLessonCopy } from './demoLessonCopy';
import { drawingStepKey, loadPreparedLessonDocument, loadPreparedLessonFigures } from './preparedLessonFigures';
import type { PreviewAction, PreviewPart } from './lessonPreviewData';

export type LessonDrawingStep = {
  id: string; title: string; instruction: string; caution: string;
  checkpoints: string[]; prerequisites: string[]; completion: string; actions: PreviewAction[];
};
export type LessonDrawingSection = {
  id: string; name: string; steps: LessonDrawingStep[]; parts: PreviewPart[]; assetList: unknown;
};
export type DrawingProgress = {
  percent: number; phase: 'prepare' | 'draw' | 'bind' | 'done'; current?: number; total?: number; section?: string;
};
type Input = {
  trainingId: string; version: string; title: string; sections: LessonDrawingSection[];
  assets: Record<string, Uint8Array<ArrayBuffer>>; signal: AbortSignal;
  zipName: string; zip: Blob; onProgress: (progress: DrawingProgress) => void;
  demo?: boolean;
  preparedFigures?: { sourceFiles: Parameters<typeof loadPreparedLessonFigures>[0]; changedSteps: ReadonlySet<string>; usePreparedDocument?: boolean };
};
type Row = { label: string; lines: string[] };
type SheetCard = { step: LessonDrawingStep; number: number; title: string[]; rows: Row[]; figures: boolean; height: number };
type DrawingImage = string | Uint8Array<ArrayBuffer>;

const pageWidth = 1190.55, pageHeight = 841.89;
const margin = 25, gutter = 10, gridTop = 742, gridBottom = 55;
const cardWidth = (pageWidth - margin * 2 - gutter) / 2;
const textWidth = cardWidth - 111;
const bodySize = 9.7, lineHeight = 11.5, figureHeight = 135;
const ink = rgb(.12, .16, .2), sub = rgb(.27, .34, .38), rule = rgb(.72, .77, .8);
const orange = rgb(.68, .28, .08), pale = rgb(.967, .972, .977), white = rgb(1, 1, 1);
const format = (amount: number) => amount.toLocaleString('ko-KR', { maximumFractionDigits: 3 });
const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

function instructionRows(step: LessonDrawingStep): [string, string][] {
  const rows: [string, string][] = [];
  if (step.instruction) rows.push(['작업 방법', step.instruction]);
  step.actions.forEach((action, index) => {
    const grouped = (names: string[]) => action.fields.filter(([name]) => names.includes(name));
    const names = ['작업 부품', '맞물리는 부품', '고정할 부품', '공구', '잡는 방식'];
    const tools = grouped(names).map(([name, value]) => name + ' ' + value);
    if (action.kind === 'thread' && !action.toolName) tools.push('손 체결');
    if (action.kind === 'inspect' && !action.toolName) tools.push('공구는 작업 안내 참조');
    rows.push([step.actions.length > 1 ? (index + 1) + '. ' + action.label : '대상·공구',
      tools.join(' · ') || action.label + ' · 공구 미지정']);
    const turn = action.rotationDeg === undefined ? '' : (action.clockwise ? '시계 방향 ' : '반시계 방향 ') +
      format(action.rotationDeg / 360) + '바퀴 (' + format(action.rotationDeg) + '°), 체결부 머리 기준';
    if (action.kind === 'attach') {
      const approach = action.approach;
      rows.push(['진입 방향·각도', approach ? '포트 기준 방향 ' + format(approach.directionDeg) + '° · 진입 기울기 ' + format(approach.tiltDeg) + '°'
        : '포트 바깥에서 안쪽으로, 그림의 화살표 방향.']);
    }
    if (turn) rows.push(['회전 방향·각도', turn]);
    const omit = new Set([...names, '회전 방향', '필요 회전량', '진입 방향', '진입 기울기', '교육 모드']);
    if (action.kind !== 'attach') {
      for (const label of ['삽입 위치 허용 오차', '삽입 기울기 허용 오차', '회전 정렬 허용 오차']) omit.add(label);
    }
    const conditions = action.fields.filter(([label]) => !omit.has(label)).map(([label, value]) => label + ' ' + value);
    if ((action.kind === 'attach' || action.kind === 'thread' || action.kind === 'fasten' || action.kind === 'touch') &&
      !action.fields.some(([label]) => label.includes('토크'))) {
      conditions.push(action.kind === 'thread' || action.kind === 'fasten' ? '토크 원본 미지정' : '작업 힘 원본 미지정');
    }
    if (conditions.length) rows.push(['조건·판정', conditions.join(' · ')]);
  });
  if (step.prerequisites.length) rows.push(['선행 단계', step.prerequisites.join(' · ')]);
  if (step.actions.length || step.completion) rows.push(['완료 조건', step.completion || '별도 단계 완료 규칙 원본 미지정']);
  if (step.checkpoints.length) rows.push(['확인 사항', step.checkpoints.map((item, index) => (index + 1) + '. ' + item).join('\n')]);
  if (step.caution) rows.push(['주의 사항', step.caution]);
  return rows;
}

const rowHeight = (row: Row) => row.lines.length * lineHeight + 4;

function buildCards(steps: LessonDrawingStep[], first: number, normal: ReturnType<typeof textTools>, bold: ReturnType<typeof textTools>) {
  return steps.flatMap((step, index) => {
    const rows = instructionRows(step).flatMap(([label, value]) => {
      const lines = normal.wrap(value, bodySize, textWidth);
      return Array.from({ length: Math.ceil(lines.length / 28) }, (_, group) => ({
        label: group ? label + ' (계속)' : label, lines: lines.slice(group * 28, group * 28 + 28),
      }));
    });
    const cards: SheetCard[] = [];
    let figures = true;
    let used = 0;
    do {
      const title = bold.wrap(step.title + (figures ? '' : ' (계속)'), 15, cardWidth - 100);
      const body: Row[] = [];
      let height = Math.max(33, title.length * 17 + 14) + (figures ? figureHeight + 8 : 0) + 12;
      if (height > gridTop - gridBottom - 355) throw new Error('단계 제목을 조금 줄여 주세요.');
      while (used < rows.length && height + rowHeight(rows[used]) <= gridTop - gridBottom) {
        const row = rows[used++];
        body.push(row);
        height += rowHeight(row);
      }
      cards.push({ step, number: first + index, title, rows: body, figures, height });
      figures = false;
    } while (used < rows.length);
    return cards;
  });
}

export async function generateLessonDrawing(input: Input) {
  const { signal, onProgress } = input;
  if (input.preparedFigures?.usePreparedDocument) {
    const blob = await loadPreparedLessonDocument(input.preparedFigures.sourceFiles, input.zip, signal);
    if (blob) {
      onProgress({ percent: 100, phase: 'done' });
      return { blob, missing: 0, failedModels: 0 };
    }
  }
  const [regular, semiBold, cachedFigures] = await Promise.all([loadFont('Regular', signal), loadFont('SemiBold', signal),
    loadPreparedLessonFigures(input.preparedFigures?.sourceFiles, signal)]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Keep the full font so compound Korean glyphs render in PDF viewers.
  const copy = input.demo ? demoLessonCopy : undefined;
  const normal = textTools(await pdf.embedFont(regular), copy);
  const bold = textTools(await pdf.embedFont(semiBold), copy);
  pdf.setTitle(input.title + (input.demo ? ' · 교범용 조립 도면' : ' · 교육용 조립 도면'));
  pdf.setSubject(input.demo ? '교범 전체 · 교범 버전 ' + input.version : '교육 전체 · 교육 버전 ' + input.version);
  let total = 0;
  const sections = input.sections.map((section) => {
    const first = total + 1;
    total += section.steps.length;
    return { ...section, first, last: total };
  });
  let drawn = 0;
  let missing = 0;
  let failedModels = 0;
  const embeddedImages = new Map<DrawingImage, Promise<PDFImage>>();
  function imageFor(value?: DrawingImage) {
    if (!value) return;
    const existing = embeddedImages.get(value);
    if (existing) return existing;
    const image = pdf.embedPng(value);
    embeddedImages.set(value, image);
    return image;
  }

  function pageHeader(page: PDFPage, index: number, sectionLabel = '교육 전체  /  ' + total + '단계') {
    normal.draw(page, '교육용 조립 도면', margin, 802, 11, sub);
    bold.draw(page, '조립 순서', margin + 98, 799, 26);
    normal.wrap(input.title, 11, pageWidth - 300).slice(0, 1).forEach((line) => normal.draw(page, line, 260, 802, 11, sub));
    page.drawLine({ start: { x: margin, y: 785 }, end: { x: pageWidth - margin, y: 785 }, color: ink, thickness: 1 });
    const heading = bold.wrap(sectionLabel, 12, pageWidth - 335)[0];
    bold.draw(page, heading, margin, 763, 12);
    normal.draw(page, '주황색 · 장착 부품 및 방향   |   수치는 교육용 설정', pageWidth - 278, 763, 9, orange);
    page.drawLine({ start: { x: margin, y: 42 }, end: { x: pageWidth - margin, y: 42 }, color: rule, thickness: .6 });
    normal.draw(page, '교육 ID ' + input.trainingId + '   |   버전 ' + input.version + '   |   축척 없음', margin, 26, 9, sub);
    normal.draw(page, '시트 ' + String(index).padStart(2, '0') + '   /   교육 ZIP 첨부', pageWidth - 159, 26, 9, sub);
  }

  function panel(page: PDFPage, x: number, top: number, width: number, label: string, image?: PDFImage) {
    const bottom = top - figureHeight;
    page.drawRectangle({ x, y: bottom, width, height: figureHeight, color: white, borderColor: rule, borderWidth: .6 });
    if (image) {
      const fitted = image.scaleToFit(width - 8, figureHeight - 24);
      page.drawImage(image, { x: x + (width - fitted.width) / 2, y: bottom + (figureHeight - 18 - fitted.height) / 2, ...fitted });
    } else normal.draw(page, '표시할 3D 부품 연결 정보가 없습니다.', x + 12, bottom + 62, 9, sub);
    page.drawRectangle({ x, y: top - 19, width, height: 19, color: pale, borderColor: rule, borderWidth: .6 });
    bold.draw(page, label, x + 7, top - 13, 9, sub);
  }

  async function drawCard(page: PDFPage, card: SheetCard, x: number, top: number,
    drawFigures: (step: LessonDrawingStep) => { assembly?: DrawingImage; detail?: DrawingImage }, sectionName: string) {
    const { step, title } = card;
    page.drawRectangle({ x, y: top - card.height, width: cardWidth, height: card.height, borderColor: rule, borderWidth: .6 });
    bold.draw(page, String(card.number).padStart(2, '0'), x + 10, top - 22, 17);
    title.forEach((line, i) => bold.draw(page, line, x + 43, top - 21 - i * 17, 15));
    let y = top - Math.max(33, title.length * 17 + 14);
    if (card.figures) {
      const images = drawFigures(step);
      if (!images.assembly || !images.detail) missing++;
      const [assembly, detail] = await Promise.all([imageFor(images.assembly), imageFor(images.detail)]);
      const width = (cardWidth - 29) / 2;
      panel(page, x + 11, y, width, '조립 위치 · 주황색 작업 부품', assembly);
      panel(page, x + 18 + width, y, width, '부품 상세', detail);
      const turn = step.actions.find((action) => action.rotationDeg !== undefined);
      if (turn?.rotationDeg !== undefined) {
        const label = (turn.clockwise ? '시계 ' : '반시계 ') + format(turn.rotationDeg / 360) + '바퀴';
        const labelX = x + cardWidth - 119, labelY = y - figureHeight + 7;
        page.drawRectangle({ x: labelX, y: labelY, width: 101, height: 18, color: white, borderColor: rule, borderWidth: .5 });
        const center = { x: labelX + 11, y: labelY + 9 };
        const sign = turn.clockwise ? -1 : 1;
        const angle = (index: number) => Math.PI * .55 + sign * Math.PI * 1.5 * index / 16;
        const point = (a: number) => ({ x: center.x + 4.5 * Math.cos(a), y: center.y + 4.5 * Math.sin(a) });
        for (let i = 0; i < 16; i++) page.drawLine({ start: point(angle(i)), end: point(angle(i + 1)), color: orange, thickness: .8 });
        const end = point(angle(16)), back = angle(16) - sign * Math.PI / 2;
        for (const side of [-1, 1]) {
          const a = back + side * .46;
          page.drawLine({ start: end, end: { x: end.x + Math.cos(a) * 3.1, y: end.y + Math.sin(a) * 3.1 }, color: orange, thickness: .8 });
        }
        bold.draw(page, label, labelX + 22, labelY + 6, 9, orange);
      }
      y -= figureHeight + 8;
      drawn++;
      onProgress({ percent: 27 + 63 * drawn / total, phase: 'draw', current: drawn, total, section: sectionName });
    }
    for (const row of card.rows) {
      page.drawLine({ start: { x: x + 11, y }, end: { x: x + cardWidth - 11, y }, color: rule, thickness: .4 });
      bold.draw(page, row.label, x + 12, y - 12, 9, orange);
      row.lines.forEach((line, i) => normal.draw(page, line, x + 94, y - 12 - i * lineHeight, bodySize, sub));
      y -= rowHeight(row);
    }
  }

  for (const section of sections) {
    signal.throwIfAborted();
    onProgress({ percent: 27 + 63 * drawn / total, phase: 'draw', current: drawn, total, section: section.name });
    await pause();
    const cards = buildCards(section.steps, section.first, normal, bold);
    const preparedFor = (step: LessonDrawingStep) => {
      if (!cachedFigures || input.preparedFigures?.changedSteps.has(drawingStepKey(section.id, step.id))) return;
      const key = `${section.id}/${step.id}`;
      const assembly = cachedFigures[`${key}-assembly.png`], detail = cachedFigures[`${key}-detail.png`];
      if (assembly && detail) return { assembly, detail };
    };
    const figures = section.steps.some((step) => !preparedFor(step))
      ? await (await import('./lessonDrawingFigures')).createLessonDrawingFigures(section.assetList, input.assets, section.parts, signal)
      : undefined;
    failedModels += figures?.failed ?? 0;
    try {
      const mountedAt = new Map<string, string>();
      const markingParts = new Map<string, string>();
      for (const step of section.steps) {
        for (const action of step.actions) {
          if (action.kind === 'attach' && action.target && action.movingId) mountedAt.set(action.target.partId, action.movingId);
          if (action.kind === 'touch' && action.tool === 'pen') {
            const part = mountedAt.get(action.partIds[0]);
            if (part) markingParts.set(step.id, part);
          }
        }
      }
      const drawFigures = (step: LessonDrawingStep) => preparedFor(step) ?? figures?.draw(
        step.actions.find((action) => action.partIds.length) ?? step.actions[0], markingParts.get(step.id)) ?? {};
      let page: PDFPage | undefined;
      let y = gridTop;
      const label = section.name + '  /  ' + section.first + '–' + section.last + '단계';
      for (let index = 0; index < cards.length; index += 2) {
        signal.throwIfAborted();
        const left = cards[index], right = cards[index + 1];
        const row = Math.max(left.height, right?.height ?? 0);
        if (!page || y - row < gridBottom) {
          page = pdf.addPage([pageWidth, pageHeight]);
          pageHeader(page, pdf.getPageCount(), label);
          y = gridTop;
        }
        await drawCard(page, left, margin, y, drawFigures, section.name);
        await pause();
        signal.throwIfAborted();
        if (right) await drawCard(page, right, margin + cardWidth + gutter, y, drawFigures, section.name);
        y -= row + gutter;
        await pause();
      }
    } finally {
      figures?.dispose();
      embeddedImages.clear();
    }
  }

  signal.throwIfAborted();
  onProgress({ percent: 93, phase: 'bind' });
  await pause();
  const zip = await input.zip.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', zip);
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  signal.throwIfAborted();
  let dataPage = pdf.addPage([pageWidth, pageHeight]);
  pageHeader(dataPage, pdf.getPageCount());
  bold.draw(dataPage, '교육 재생성 사양', margin, 712, 23);
  const details = [
    ['교육 패키지', input.zipName],
    ['포함 범위', '교육 전체 · ' + sections.length + '구간 · ' + total + '단계. 첨부 ZIP은 참조 모델과 전체 교육 데이터를 함께 담습니다.'],
    ['구간별 조립 순서', sections.map(({ name, first, last }) => name + ' ' + first + '–' + last).join(' · ')],
    ['결합 기준', '부품과 결합점의 좌표는 lesson.json의 해당 부품 로컬 기준입니다. 진입 기울기는 결합 포트 축 기준, 회전 방향은 체결부 머리 기준입니다.'],
    ['교육 판정', '도면의 작업 조건과 완료 조건을 참조하세요. 교육용 표시 토크는 회전량 또는 접촉 조건과 구분해 기록합니다.'],
    ['다시 열기', input.demo ? 'PDF의 첨부에서 교범 ZIP을 꺼낸 뒤 교범 편집 화면에서 엽니다. manifest.json의 파일 목록과 검증값을 함께 확인합니다.'
      : 'PDF의 첨부에서 교육 ZIP을 꺼낸 뒤 기존 교육 수정 화면에서 엽니다. manifest.json의 파일 목록과 검증값을 함께 확인합니다.'],
    ['첨부 인덱스', 'training-sheet.json에서 도면 구간, 단계 ID, 교육 ZIP 이름과 SHA-256을 찾을 수 있습니다.'],
    ['교육 ZIP SHA-256', sha256],
  ];
  let tableY = 682;
  for (const [label, value] of details) {
    const lines = normal.wrap(value, 11, pageWidth - 245);
    const height = Math.max(32, lines.length * 14 + 14);
    dataPage.drawRectangle({ x: margin, y: tableY - height, width: pageWidth - margin * 2, height, borderColor: rule, borderWidth: .5 });
    dataPage.drawRectangle({ x: margin, y: tableY - height, width: 165, height, color: pale, borderColor: rule, borderWidth: .5 });
    bold.draw(dataPage, label, margin + 11, tableY - 19, 10);
    lines.forEach((line, index) => normal.draw(dataPage, line, margin + 177, tableY - 19 - index * 14, 11, sub));
    tableY -= height;
  }
  const ports = sections.flatMap((section) => [...new Map(section.steps.flatMap((step) => step.actions.flatMap(({ source, target }) =>
    [source, target].flatMap((port) => port?.pose ? [[port.id, port] as const] : [])))).values()]
    .map((port) => ({ port, sectionName: section.name })));
  if (ports.length) {
    tableY -= 30;
    bold.draw(dataPage, '결합점 좌표 · 해당 부품 로컬 기준', margin, tableY, 14);
    tableY -= 12;
    for (const { port, sectionName } of ports) {
      signal.throwIfAborted();
      const position = port.pose!.position.map((value) => format(value * 1000)).join(', ');
      const rotation = port.pose!.rotation?.map((value) => Number(value.toFixed(6))).join(', ');
      const value = '부품 ' + port.partId + '   ·   위치 (' + position + ') mm   ·   회전 XYZW ' + (rotation ? '(' + rotation + ')' : '원본 미지정');
      const label = normal.wrap(sectionName + ' / ' + port.id, 9, 162);
      const values = normal.wrap(value, 10, pageWidth - 259);
      const height = Math.max(26, Math.max(label.length, values.length) * 13 + 9);
      if (tableY - height < gridBottom) {
        dataPage = pdf.addPage([pageWidth, pageHeight]);
        pageHeader(dataPage, pdf.getPageCount());
        bold.draw(dataPage, '결합점 좌표 (계속)', margin, 712, 19);
        tableY = 689;
        await pause();
      }
      dataPage.drawRectangle({ x: margin, y: tableY - height, width: pageWidth - margin * 2, height, borderColor: rule, borderWidth: .5 });
      dataPage.drawRectangle({ x: margin, y: tableY - height, width: 182, height, color: pale, borderColor: rule, borderWidth: .5 });
      label.forEach((line, index) => bold.draw(dataPage, line, margin + 9, tableY - 15 - index * 13, 9));
      values.forEach((line, index) => normal.draw(dataPage, line, margin + 195, tableY - 15 - index * 13, 10, sub));
      tableY -= height;
    }
  }
  await pdf.attach(new Uint8Array(zip), input.zipName, { mimeType: 'application/zip',
    description: input.demo ? '교범 ZIP과 3D 모델' : '수정한 교육 ZIP과 3D 모델' });
  const sectionIndex = sections.map(({ id, name, first, last, steps, assetList }) => ({
    id, name, first, last, stepIds: steps.map((step) => step.id), assets: assetList,
  }));
  const onlySection = sectionIndex.length === 1 ? sectionIndex[0] : undefined;
  const record = { schema: 'assembly-training-drawing/1.0', trainingId: input.trainingId, contentVersion: input.version,
    scope: { id: onlySection?.id ?? 'all', name: onlySection?.name ?? (input.demo ? '교범 전체' : '교육 전체'), stepIds: sectionIndex.flatMap(({ stepIds }) => stepIds) },
    sections: sectionIndex, package: { attachment: input.zipName, sha256 },
    assets: onlySection?.assets ?? sections.flatMap(({ assetList }) => Array.isArray(assetList) ? assetList : []) };
  await pdf.attach(new TextEncoder().encode(JSON.stringify(record, null, 2)), 'training-sheet.json', { mimeType: 'application/json' });
  const bytes = await pdf.save();
  signal.throwIfAborted();
  onProgress({ percent: 100, phase: 'done' });
  return { blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), missing, failedModels };
}
