'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { trainingTools } from '@/components/common/TrainingToolNavigation';
import { INTRO_OBJECT_PARTS, introObjectStyle, SPRITE_POSITION, STEP_ARTWORK_PARTS } from './introObjects';
import * as S from './StartScreen.styles';

const cards = [
  { ...trainingTools.pdf, code: 'PDF / DRAWING', visual: 'upload', description: '도면에서 부품과 조립 정보를 확인합니다.' },
  { ...trainingTools.step, code: 'STEP / ASSEMBLY', visual: 'step', description: '3D 조립품을 불러와 부품을 확인하고 실습을 구성합니다.' },
  { ...trainingTools.edit, code: 'VR LESSON / EDIT', visual: 'report', description: '교육 ZIP을 열어 단계별 안내와 내용을 수정합니다.' },
] as const;

export function StartScreen({ onReplay }: { onReplay: () => void }) {
  const [activeIndex, setActiveIndex] = useState(1);
  const cardLinks = useRef<(HTMLAnchorElement | null)[]>([]);
  const cardGroup = useRef<HTMLElement>(null);

  useEffect(() => {
    const group = cardGroup.current;
    if (group && group.scrollWidth > group.clientWidth) {
      cardLinks.current[1]?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      const control = event.target instanceof Element && event.target.closest('a, button, input, textarea, select, [contenteditable="true"]');
      if (control && !cardGroup.current?.contains(control)) return;
      if (event.key === 'Enter' && !control && !event.repeat) {
        event.preventDefault();
        cardLinks.current[activeIndex]?.click();
      }
      const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (!direction) return;
      event.preventDefault();
      const next = (activeIndex + direction + cards.length) % cards.length;
      setActiveIndex(next);
      cardLinks.current[next]?.focus();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex]);

  return <S.Root aria-labelledby="training-start-title">
    <S.Shell>
      <S.Header>
        <div>
          <S.Brand>HANWHA <span>· MR ASSEMBLY TRAINING</span></S.Brand>
          <S.Title id="training-start-title">작업 모드 선택</S.Title>
        </div>
        <S.HeaderNote>PC · META QUEST 3</S.HeaderNote>
      </S.Header>

      <S.Cards ref={cardGroup} aria-label="작업 모드">
        {cards.map(({ href, label, code, visual, description }, index) => {
          const active = index === activeIndex;
          const parts = visual === 'step' ? STEP_ARTWORK_PARTS : INTRO_OBJECT_PARTS[visual];
          return <S.Card key={href} href={href} prefetch={false}
            ref={(node) => { cardLinks.current[index] = node; }}
            aria-labelledby={`training-mode-${index}`} aria-describedby={`training-mode-description-${index}`}
            data-highlighted={active}
            onFocus={() => setActiveIndex(index)}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse' && !document.activeElement?.matches(':focus-visible')) setActiveIndex(index);
            }}>
            <S.CardLabel aria-hidden="true"><b>{String(index + 1).padStart(2, '0')}</b>{code}</S.CardLabel>
            <S.Frame>
              <S.Surface>
                <S.Visual aria-hidden="true">
                  <S.Artwork>
                    {parts.map((part) => <S.ArtworkPart key={part.id} data-artwork-part={part.id}
                      $position={visual === 'step' ? undefined : SPRITE_POSITION[visual]} style={introObjectStyle(part)} />)}
                  </S.Artwork>
                </S.Visual>
                <S.CardCopy>
                  <div>
                    <S.CardTitle id={`training-mode-${index}`}>{label}</S.CardTitle>
                    <S.Description id={`training-mode-description-${index}`}>{description}</S.Description>
                  </div>
                  <S.Arrow aria-hidden="true">→</S.Arrow>
                </S.CardCopy>
              </S.Surface>
            </S.Frame>
          </S.Card>;
        })}
      </S.Cards>

      <S.Footer>
        <S.Utility aria-label="추가 메뉴">
          <Link href="/training/demo" prefetch={false}>교범 관리 <span aria-hidden="true">→</span></Link>
          <Link href="/training" prefetch={false}>교육 실습 시작하기 <span aria-hidden="true">→</span></Link>
          <Link href="/part-library" prefetch={false}>부품 라이브러리</Link>
          <button type="button" onClick={onReplay}>프로젝트 안내 다시 보기</button>
        </S.Utility>
        <S.Keys aria-hidden="true"><kbd>←</kbd><kbd>→</kbd> 이동 <kbd>ENTER</kbd> 선택</S.Keys>
      </S.Footer>
    </S.Shell>
  </S.Root>;
}
