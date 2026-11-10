import styled from 'styled-components';
import { getPracticeCardImageSource, type PracticeCardFigures } from './practiceCardFigures';
import type { PracticeSceneCard } from './practiceTrayLayout';

export function PracticeCardContent({ card, figures, preview = false }: {
  card: PracticeSceneCard; figures: PracticeCardFigures; preview?: boolean;
}) {
  const imageOnly = card.layout === 'image';
  const image = getPracticeCardImageSource(card.image, figures);
  const imageAlt = card.image?.kind === 'during' ? '이번에 조립할 부품'
    : card.image?.kind === 'after' ? '장착 후 조립 상태' : '첨부한 설명 이미지';

  return <Content $imageShare={card.layout === 'combined' ? card.imageShare : undefined}>
    {card.layout !== 'text' && <Figure $fill={imageOnly}>
      {image ? <FigureImage src={image} alt={imageAlt} draggable={false} />
        : <Placeholder>{image === null ? '이미지를 만들 수 없습니다.' : card.image ? '이미지 만드는 중' : '이미지를 선택하세요.'}</Placeholder>}
    </Figure>}
    {card.layout !== 'image' && <Copy>
      {card.title && <Title>{card.title}</Title>}
      {card.text && <Body>{card.text}</Body>}
      {preview && !card.title && !card.text && <Placeholder>입력한 제목과 내용이 표시됩니다.</Placeholder>}
    </Copy>}
  </Content>;
}

const Content = styled.div<{ $imageShare?: number }>(({ $imageShare }) => ({
  display: 'grid', minHeight: 0, gridTemplateRows: $imageShare
    ? `minmax(0, ${$imageShare}fr) minmax(0, ${100 - $imageShare}fr)` : 'minmax(0, 1fr)',
  gap: 8, flex: '1 1 auto',
}));
const Figure = styled.div<{ $fill: boolean }>(({ $fill }) => ({
  position: 'relative', display: 'grid', placeItems: 'center', minHeight: 0, overflow: 'hidden',
  background: 'var(--card-figure)', border: $fill ? 0 : '1px solid var(--card-edge)',
}));
const FigureImage = styled.img({
  display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
});
const Copy = styled.div({ minHeight: 0, overflowY: 'auto', pointerEvents: 'auto', overflowWrap: 'anywhere' });
const Title = styled.strong({ display: 'block', color: 'var(--card-title)', fontSize: 19, fontWeight: 700, lineHeight: 1.25 });
const Body = styled.p({ margin: '4px 0 0', color: 'var(--card-text)', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' });
const Placeholder = styled.span({ display: 'block', padding: 8, color: 'var(--card-muted)', textAlign: 'center', fontSize: 13 });
