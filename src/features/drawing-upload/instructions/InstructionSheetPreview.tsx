import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { paginateInstructions, SHEET_COLUMNS, type AssemblyInstruction } from './assemblyInstructions';
import { useStepDrawings } from './useStepDrawings';

export function InstructionSheetPreview({ model, parts, instructions }: {
  model: StepModel; parts: StepAssemblyPart[]; instructions: AssemblyInstruction[];
}) {
  const partByNumber = useMemo(() => new Map(parts.map((part) => [part.number, part])), [parts]);
  const requests = useMemo(() => [...new Set(instructions.map((step) => step.partNumber))].map((number) => ({
    key: String(number), target: partByNumber.get(number) ?? null,
  })), [instructions, partByNumber]);
  const images = useStepDrawings(model, requests);
  const pages = paginateInstructions(instructions);

  return (
    <PreviewScroll>
      {pages.map((page, pageIndex) => (
        <Paper key={pageIndex} aria-label={`조립 순서 시트 ${pageIndex + 1}`}>
          <PaperHeader>
            <span>교육용 조립 도면</span>
            <h3>조립 순서</h3>
            <span>{model.manifest.name}</span>
          </PaperHeader>
          <PaperBody>
            {page.map((section) => (
              <section key={section.number} aria-label={`구간 ${section.number} ${section.name}`}>
                <SectionTitle><span>구간 {section.number}</span> {section.name}</SectionTitle>
                <CardGrid>
                  {section.steps.map((step, stepIndex) => {
                    const part = partByNumber.get(step.partNumber);
                    return (
                      <StepCard key={step.id} $highlighted={step.isHighlighted}>
                        <Figure>
                          <StepNumber>{section.number}-{section.offset + stepIndex + 1}</StepNumber>
                          <DrawingImage image={images[step.partNumber]} alt={`${part?.name ?? '부품'} 등각 선화`} />
                        </Figure>
                        <CardText>
                          <strong>{part?.name ?? '부품 정보 없음'}</strong>
                          <p>{step.description}</p>
                          {(step.tool || step.torque) && <CardDetails>
                            {step.tool && <span>공구 {step.tool}</span>}
                            {step.torque && <span>토크 {step.torque}</span>}
                          </CardDetails>}
                        </CardText>
                      </StepCard>
                    );
                  })}
                </CardGrid>
              </section>
            ))}
          </PaperBody>
          <PaperFooter>
            <span>조립 교육용 · 축척 없음</span>
            <span><b>도면명</b> 조립 순서</span>
            <span><b>시트</b> {String(pageIndex + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</span>
          </PaperFooter>
        </Paper>
      ))}
    </PreviewScroll>
  );
}

export function AssemblyDrawingPreview({ model, selected }: { model: StepModel; selected: StepAssemblyPart | null }) {
  const requests = useMemo(() => {
    const assembly = { key: 'assembly', target: { bounds: model.bounds, highlightShapeIds: selected?.shapeIds } };
    return selected ? [assembly, { key: 'detail', target: selected }] : [assembly];
  }, [model.bounds, selected]);
  const images = useStepDrawings(model, requests, 2);

  return (
    <PreviewScroll>
      <AssemblyPaper aria-label="교육용 조립 도면">
        <PaperHeader>
          <span>교육용 조립 도면</span>
          <h3>조립도</h3>
          <span>{model.manifest.name}</span>
        </PaperHeader>
        <DrawingGrid $hasDetail={!!selected}>
          <LargeFigure>
            <figcaption>전체 조립도 · 등각 투상</figcaption>
            <DrawingImage image={images.assembly} alt="전체 조립품 등각 선화" resolution={2} />
          </LargeFigure>
          {selected && <LargeFigure>
            <figcaption>부품 상세도 · {selected.name} #{selected.number}</figcaption>
            <DrawingImage image={images.detail} alt={`${selected.name} 부품 상세도`} resolution={2} />
          </LargeFigure>}
        </DrawingGrid>
        <PaperFooter>
          <span>조립 교육용 · 축척 없음</span>
          <span><b>도면명</b> 조립도</span>
          <span><b>시트</b> 01 / 01</span>
        </PaperFooter>
      </AssemblyPaper>
    </PreviewScroll>
  );
}

function DrawingImage({ image, alt, resolution = 1 }: { image?: string | null; alt: string; resolution?: number }) {
  return image
    ? <Image src={image} alt={alt} width={448 * resolution} height={300 * resolution} unoptimized />
    : <FigureStatus role="status">{image === null ? '그림을 만들지 못했습니다' : '선화 준비 중'}</FigureStatus>;
}

// The preview uses a paper palette so it can be read like the reference sheet.
const paper = { background: '#ffffff', ink: '#22272b', subdued: '#4f575f', rule: '#c9cdd0', highlight: '#fff1e5' };
const PreviewScroll = styled.div(({ theme }) => ({
  minHeight: 0, overflow: 'auto', padding: theme.space[4], background: theme.color.bgEdge,
}));
const Paper = styled.article(({ theme }) => ({
  width: '100%', minWidth: 950, maxWidth: 1280, minHeight: 670, margin: '0 auto ' + theme.space[4] + 'px',
  padding: theme.space[5], background: paper.background, color: paper.ink, border: '1px solid ' + paper.rule,
  display: 'flex', flexDirection: 'column', gap: theme.space[4],
  '&:last-child': { marginBottom: 0 },
}));
const AssemblyPaper = styled(Paper)({ minWidth: 0, minHeight: 0 });
const PaperHeader = styled.header(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: theme.space[3],
  borderBottom: '2px solid ' + paper.ink, paddingBottom: theme.space[2],
  '& h3': { fontSize: theme.size.xxl, margin: 0 },
  '& span': { fontSize: theme.size.sm, color: paper.subdued, overflowWrap: 'anywhere' },
  '& span:last-child': { marginLeft: 'auto' },
}));
const PaperBody = styled.div(({ theme }) => ({
  flex: 1, display: 'grid', alignContent: 'start', gap: theme.space[4],
}));
const SectionTitle = styled.h4(({ theme }) => ({
  fontSize: theme.size.md, margin: '0 0 ' + theme.space[2] + 'px',
  '& span': { marginRight: theme.space[1], color: paper.subdued },
}));
const CardGrid = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: `repeat(${SHEET_COLUMNS}, minmax(0,1fr))`, gap: theme.space[2],
}));
const StepCard = styled.article<{ $highlighted: boolean }>(({ theme, $highlighted }) => ({
  minWidth: 0, minHeight: 142, display: 'grid', gridTemplateColumns: 'minmax(0, .85fr) minmax(0, 1fr)',
  alignItems: 'start', gap: theme.space[2], padding: theme.space[2],
  border: '1px solid ' + ($highlighted ? theme.color.primary : paper.rule),
  background: $highlighted ? paper.highlight : paper.background,
}));
const Figure = styled.div({
  display: 'grid', alignContent: 'start',
  '& img': { display: 'block', width: '100%', height: 'auto', marginTop: 4 },
});
const StepNumber = styled.strong(({ theme }) => ({ fontFamily: theme.font.mono, fontSize: theme.size.lg }));
const FigureStatus = styled.span(({ theme }) => ({
  display: 'grid', placeItems: 'center', minHeight: 66, textAlign: 'center', color: paper.subdued, fontSize: theme.size.xs,
}));
const DrawingGrid = styled.div<{ $hasDetail: boolean }>(({ theme, $hasDetail }) => ({
  display: 'grid', gridTemplateColumns: $hasDetail ? 'minmax(0,1.35fr) minmax(0,1fr)' : 'minmax(0,1fr)',
  gap: theme.space[4],
}));
const LargeFigure = styled.figure(({ theme }) => ({
  display: 'grid', gridTemplateRows: 'auto 1fr', alignItems: 'center', minWidth: 0, margin: 0,
  border: '1px solid ' + paper.rule,
  '& figcaption': { padding: theme.space[3], borderBottom: '1px solid ' + paper.rule, fontSize: theme.size.md, overflowWrap: 'anywhere' },
  '& img': { display: 'block', width: '100%', maxWidth: 790, height: 'auto', margin: '0 auto' },
  '& [role="status"]': { minHeight: 190 },
}));
const CardText = styled.div(({ theme }) => ({
  fontSize: theme.size.sm, lineHeight: 1.45, wordBreak: 'keep-all', overflowWrap: 'anywhere',
  '& p': { margin: theme.space[1] + 'px 0 0', whiteSpace: 'pre-wrap' },
}));
const CardDetails = styled.div(({ theme }) => ({
  display: 'grid', gap: 2, marginTop: theme.space[1], color: paper.subdued, fontSize: theme.size.xs,
}));
const PaperFooter = styled.footer(({ theme }) => ({
  display: 'flex', gap: theme.space[4], alignItems: 'center',
  borderTop: '1px solid ' + paper.rule, paddingTop: theme.space[2], fontSize: theme.size.sm,
  '& span:first-child': { marginRight: 'auto', color: paper.subdued },
  '& b': { marginRight: theme.space[1] },
}));
