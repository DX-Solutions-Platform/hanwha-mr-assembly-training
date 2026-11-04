'use client';
import styled from 'styled-components';
import type { Product } from '@/types/training';
import { SectionTitle } from '@/components/common/SectionTitle';
import { CutButton } from '@/components/common/CutButton';

export function ReviewPanel({ product, onReset, onCreate }: { product: Product; onReset: () => void; onCreate: () => void }) {
  const firstCard = product.cards[0];
  return (
    <Layout>
      <Column>
        <SectionTitle label="생성된 조립 카드" count={product.cards.length} />
        <StructureNote>{product.structure === 'single' ? '한 덩어리 구조 · 카드 1장으로 진행' : '덩어리별 카드 + 최종 결합'}</StructureNote>
        {product.cards.map((card, cardIndex) => (
          <CardRow key={card.id}><CardNo>{String(cardIndex + 1).padStart(2, '0')}</CardNo><div><CardName>{card.name}</CardName><CardMeta>{card.groupLabel} · {card.steps.length} STEPS · {card.minutes} MIN</CardMeta></div></CardRow>
        ))}
        <Actions>
          <CutButton $variant="outline" onClick={onReset}>다시 업로드</CutButton>
          <CutButton onClick={onCreate}>교육 만들기</CutButton>
        </Actions>
      </Column>
      <Detail>
        <SectionTitle label="생성된 작업 안내" count={firstCard?.steps.length ?? 0} />
        {firstCard?.steps.map((step, stepIndex) => (
          <StepRow key={step.id}><StepNo>{String(stepIndex + 1).padStart(2, '0')}</StepNo><span>{step.guide}</span></StepRow>
        ))}
      </Detail>
    </Layout>
  );
}

const Layout = styled.div`height: 100%; display: grid; grid-template-columns: 560px minmax(0, 1fr); gap: 32px;`;
const Column = styled.div`display: flex; flex-direction: column; gap: 10px;`;
const StructureNote = styled.span`font-size: 14px; color: ${({ theme }) => theme.color.primarySoft};`;
const CardRow = styled.div`display: flex; gap: 14px; align-items: center; padding: 14px; border: 1.5px solid #f37321; background: rgba(243,115,33,.12);`;
const CardNo = styled.span`width: 36px; font-family: ${({ theme }) => theme.font.mono}; font-size: 24px; font-weight: 700; color: #f37321;`;
const CardName = styled.div`font-size: 18px; font-weight: 700;`;
const CardMeta = styled.div`margin-top: 6px; font-family: ${({ theme }) => theme.font.mono}; font-size: 12px; color: ${({ theme }) => theme.color.inkMuted};`;
const Actions = styled.div`margin-top: auto; display: grid; grid-template-columns: 1fr 1.6fr; gap: 10px;`;
const Detail = styled.div`display: flex; flex-direction: column; gap: 10px; padding: 18px 20px; border: 1px solid rgba(243,115,33,.5); border-top: 2px solid #f37321; background: rgba(10,8,6,.6); overflow: auto;`;
const StepRow = styled.div`display: flex; gap: 12px; align-items: baseline; font-size: 16px; line-height: 1.5; color: ${({ theme }) => theme.color.inkSub};`;
const StepNo = styled.span`width: 22px; flex: none; font-family: ${({ theme }) => theme.font.mono}; font-size: 13px; font-weight: 700; color: #f37321;`;
