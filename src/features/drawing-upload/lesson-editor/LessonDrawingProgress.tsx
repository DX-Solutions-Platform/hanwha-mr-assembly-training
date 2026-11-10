import { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import type { DrawingProgress } from './lessonDrawingPdf';

const messages = {
  prepare: '종이랑 연필을 꺼내고 있어요',
  draw: '지금 그림을 그리고 있어요',
  bind: '마지막 장을 가지런히 묶고 있어요',
  done: '도면이 다 그려졌어요!',
};

const pacedMessages = {
  prepare: ['교범 데이터를 확인하고 있습니다', '조립 순서와 작업 안내를 확인하는 중입니다.'],
  draw: ['조립 단계별 도면을 준비하고 있습니다', '부품 배치와 조립 방향을 단계별로 정리하고 있습니다.'],
  bind: ['PDF 미리보기를 준비하고 있습니다', '전체 조립 순서를 확인할 수 있도록 페이지를 정리하고 있습니다.'],
  done: ['전체 도면 준비가 완료되었습니다', 'PDF 미리보기를 엽니다.'],
};

export function LessonDrawingProgress({ progress, scope, cancelling, onCancel, paced = false }: {
  progress: DrawingProgress; scope: string; cancelling: boolean; onCancel: () => void; paced?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);
  const percent = Math.round(progress.percent);
  const detail = paced ? pacedMessages[progress.phase][1]
    : progress.phase === 'draw' ? (progress.section ? progress.section + ' · ' : '') + (progress.current ?? 0) + ' / ' + progress.total + '단계 그림 완성'
    : progress.phase === 'bind' ? '도면과 교육 ZIP을 한 파일에 담는 중'
    : progress.phase === 'done' ? 'PDF 안에 교육 ZIP도 들어 있어요.' : '부품 모델과 작업 순서를 불러오는 중';

  return <FullScreen ref={dialog} aria-labelledby="lesson-drawing-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <Center>
      <Artwork viewBox="0 0 320 230" aria-hidden="true" $done={progress.phase === 'done'}>
        <ellipse cx="160" cy="206" rx="118" ry="11" fill="#10161a" />
        <g className="little-drafter">
          <path d="M103 151v26m52-25v24" stroke="#ff984d" strokeWidth="9" strokeLinecap="round" />
          <path d="M88 176h21m42 0h21" stroke="#e6edf0" strokeWidth="9" strokeLinecap="round" />
          <rect x="93" y="111" width="78" height="52" rx="16" fill="#ec772c" />
          <path d="M119 123h25v18h-25z" fill="#fff0df" />
          <path d="M125 129h13m-13 6h8" stroke="#a44421" strokeWidth="2" strokeLinecap="round" />
          <path d="M128 62V41" stroke="#e8ecee" strokeWidth="4" strokeLinecap="round" />
          <circle cx="128" cy="36" r="7" fill="#ffc584" />
          <rect x="77" y="60" width="103" height="64" rx="23" fill="#fff2e2" />
          <rect x="89" y="75" width="80" height="39" rx="14" fill="#233137" />
          <g className="drafter-eyes" fill="#ffd397">
            <circle cx="111" cy="93" r="5" /><circle cx="147" cy="93" r="5" />
          </g>
          <path d="M123 101q6 6 12 0" fill="none" stroke="#ffd397" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M170 127q22 13 35 4" fill="none" stroke="#ec772c" strokeWidth="11" strokeLinecap="round" />
        </g>
        <path d="m180 160 83-13 27 42-91 15z" fill="#fff4e6" />
        <path d="m196 169 38-6 16 16-41 7z" stroke="#69818b" strokeWidth="1.8" fill="none" />
        <path className="drafter-line" d="m198 182 12 10 57-9m-48-12 27-5" stroke="#e46b25" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <g className="drafter-pencil">
          <path d="m243 101 12 7-37 54-13 9 4-15z" fill="#ffc580" />
          <path d="m243 101 5-7 12 7-5 7z" fill="#f18570" />
          <path d="m205 171 4-12 7 5z" fill="#604436" />
        </g>
        <path d="M218 57v18m-9-9h18M265 58v12m-6-6h12M59 118v15m-7-8h14" stroke="#ffad68" strokeWidth="2.4" strokeLinecap="round" />
      </Artwork>
      <Kicker>{paced ? '전체 도면 PDF' : '도면 작업실'} · {scope}</Kicker>
      <h2 id="lesson-drawing-title">{cancelling ? (paced ? '작업을 취소하고 있습니다' : '연필을 내려놓고 있어요')
        : paced ? pacedMessages[progress.phase][0] : messages[progress.phase]}</h2>
      <Detail aria-live="polite">{cancelling ? '작업을 정리하는 중이에요.' : detail}</Detail>
      <Track>
        <Progress value={percent} max={100} aria-label="도면 생성 진행률" />
        <span>{percent}%</span>
      </Track>
      <Controls>
        <button type="button" disabled={cancelling} onClick={onCancel}>{paced ? '취소' : '그만하기'}</button>
      </Controls>
    </Center>
  </FullScreen>;
}

const bob = keyframes`0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); }`;
const sketch = keyframes`0%, 100% { transform: translate(-6px, 2px) rotate(-6deg); } 48% { transform: translate(10px, -2px) rotate(6deg); }`;
const line = keyframes`0%, 15% { stroke-dashoffset: 91; } 65%, 100% { stroke-dashoffset: 0; }`;
const blink = keyframes`0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.15); }`;

const FullScreen = styled.dialog({
  position: 'fixed', inset: 0, width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none',
  margin: 0, padding: 0, border: 0, background: '#172026', color: '#fff5e8',
  '&[open]': { display: 'grid', placeItems: 'center' },
  '&::backdrop': { background: '#172026' },
});
const Center = styled.div({
  display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center', width: 'min(100% - 44px, 490px)',
  '& h2': { margin: 0, fontSize: 'clamp(24px, 4vw, 38px)', lineHeight: 1.22, fontWeight: 700 },
});
const Artwork = styled.svg<{ $done: boolean }>`
  width: min(66vw, 300px);
  height: auto;
  max-height: 37vh;
  .little-drafter { animation: ${bob} 2.3s ease-in-out infinite; }
  .drafter-pencil { transform-origin: 212px 165px; animation: ${sketch} 1.65s ease-in-out infinite; }
  .drafter-line { stroke-dasharray: 91; animation: ${line} 3s ease-in-out infinite; }
  .drafter-eyes { transform-origin: center; transform-box: fill-box; animation: ${blink} 4s linear infinite; }
  ${({ $done }) => $done && 'g, .drafter-line { animation: none; }'}
  @media (prefers-reduced-motion: reduce) { g, .drafter-line { animation: none; } }
`;
const Kicker = styled.div({ color: '#ffb985', fontWeight: 600, fontSize: 14 });
const Detail = styled.p({ color: '#c5cfd4', fontSize: 15, margin: '2px 0 8px' });
const Track = styled.div({ display: 'flex', width: '100%', gap: 15, alignItems: 'center', fontVariantNumeric: 'tabular-nums',
  '& span': { color: '#ffbe8c', minWidth: 46, fontSize: 14, fontWeight: 700 } });
const Progress = styled.progress({
  width: '100%', height: 9, appearance: 'none', border: 0, borderRadius: 6, overflow: 'hidden',
  background: '#36444c', color: '#ff9348',
  '&::-webkit-progress-bar': { background: '#36444c' },
  '&::-webkit-progress-value': { background: '#ff9348', transition: 'width 220ms ease' },
  '&::-moz-progress-bar': { background: '#ff9348' },
});
const Controls = styled.div({
  display: 'flex', gap: 9, marginTop: 13,
  '& button': { minHeight: 42, borderRadius: 8, padding: '0 19px', border: '1px solid #607079', color: '#f1ece5', fontWeight: 600 },
  '& button:disabled': { opacity: .5 },
});
