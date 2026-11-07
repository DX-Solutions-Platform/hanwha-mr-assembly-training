'use client';
import { useEffect, useRef, type MouseEvent } from 'react';
import { INTRO_STEP_LIST } from './introSteps';
import { IntroPreview } from './IntroPreview';
import { useIntroNavigation } from './useIntroNavigation';
import * as S from './ProjectIntro.styles';

export function ProjectIntro({ initialStep = 0, onFinish }: { initialStep?: number; onFinish: () => void }) {
  const navigation = useIntroNavigation(initialStep);
  const stepIndex = navigation.index;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = INTRO_STEP_LIST[stepIndex];
  const isLastStep = stepIndex === INTRO_STEP_LIST.length - 1;
  const handleMove = (event: MouseEvent<HTMLAnchorElement>, delta: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); navigation.move(delta);
  };

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [stepIndex]);

  return (
    <S.Root aria-label="프로젝트 튜토리얼" data-project-intro>
      <S.Shell>
        <S.Header>
          <S.Brand>HANWHA <span>/ MR ASSEMBLY TRAINING</span></S.Brand>
          <S.Skip as="a" href="/?view=start" data-intro-action="skip" onClick={(event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onFinish(); }}>건너뛰기 <kbd>ESC</kbd></S.Skip>
        </S.Header>
        <S.Main key={step.code} $phase={navigation.phase} $direction={navigation.direction} data-intro-phase={navigation.phase}>
          <S.Copy>
            <S.Eyebrow><span>프로젝트 튜토리얼</span> <b aria-label={`현재 안내 ${stepIndex + 1} / ${INTRO_STEP_LIST.length}`}>{String(stepIndex + 1).padStart(2, '0')} / 06</b></S.Eyebrow>
            <S.Code>{step.code}</S.Code>
            <S.Title ref={headingRef} tabIndex={-1}>{step.title}</S.Title>
            <S.Description>{step.description}</S.Description>
            <S.Details>{step.detailList.map((detail, index) => <li key={detail}><span>{String(index + 1).padStart(2, '0')}</span>{detail}</li>)}</S.Details>
          </S.Copy>
          <IntroPreview step={step} stepIndex={stepIndex} />
        </S.Main>
        <S.Footer>
          <S.Navigation>
            <S.KeyboardHint><kbd>{isLastStep ? 'ENTER' : '→'}</kbd> {isLastStep ? '확인 후 입장' : '다음 안내'} <span>·</span> <kbd>ESC</kbd> 건너뛰기</S.KeyboardHint>
            <S.Actions>
              <S.Previous as="a" href={`/?step=${Math.max(1, stepIndex)}`} data-intro-action="previous" aria-label="이전 안내" aria-disabled={stepIndex === 0 && navigation.target === 0} onClick={(event: MouseEvent<HTMLAnchorElement>) => handleMove(event, -1)}>←</S.Previous>
              {isLastStep
                ? <S.Next as="a" href="/training" data-intro-action="confirm">확인 <kbd>ENTER</kbd></S.Next>
                : <S.Next as="a" href={`/?step=${stepIndex + 2}`} data-intro-action="next" aria-label="다음 안내" onClick={(event: MouseEvent<HTMLAnchorElement>) => handleMove(event, 1)}>다음 안내 <span aria-hidden="true">→</span></S.Next>}
            </S.Actions>
          </S.Navigation>
        </S.Footer>
      </S.Shell>
    </S.Root>
  );
}
