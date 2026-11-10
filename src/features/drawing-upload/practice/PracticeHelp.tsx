import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import styled from 'styled-components';

const help = {
  place: { title: '두 부품이 맞닿는 곳', text: '목록에서 두 부품을 고르면 모델에서 가까운 위치를 찾아 A와 B 화살표로 표시합니다. 위치를 바꾸려면 ‘A 위치 수정’ 또는 ‘B 위치 수정’을 누르고 3D 화면에서 맞닿는 곳을 클릭하세요.' },
  bolt: { title: '공구를 대는 곳', text: '조일 볼트를 고른 뒤 3D에서 공구 홈이나 볼트 머리 윗면 가운데를 클릭하세요. 화살표가 보이면 그 끝이 가리키는 곳을 누르세요.' },
  tool: { title: '사용 공구', text: '작업지시서에 나온 공구 이름을 적으세요. 예를 들어 ‘Torx 비트’처럼 입력하면 실습 화면에 그 이름이 표시됩니다.' },
  torque: { title: '조임 세기 (토크)', text: '얼마나 세게 조일지 정하는 값입니다. 작업지시서에 나온 N·m 숫자를 입력하세요. 화면 동작만 확인할 때는 교육용 예시값을 쓸 수 있습니다.' },
  drag: { title: '부품 옮기기', text: '오른쪽 부품을 중앙 작업대까지 끌어오세요. 주황색 윤곽이나 화살표가 가리키는 위치에 맞으면 놓으세요.' },
  attach: { title: '결합 위치 맞추기', text: '오른쪽 부품을 끌어 A 표시를 중앙 작업대의 움직이는 화살표 끝에 맞추세요.' },
  turn: { title: '공구 돌리기', text: '원 테두리 근처에서 마우스 왼쪽 버튼을 누른 채 시계 방향으로 돌리세요. 목표 도달 표시가 나오면 버튼을 놓으세요.' },
} as const;

type HelpTopic = keyof typeof help;

export function PracticeHelp({ topic, children, above }: { topic: HelpTopic; children: ReactNode; above?: boolean }) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const isOpen = hovered || focused || pinned;
  const example = help[topic];

  function close() { setHovered(false); setFocused(false); setPinned(false); }

  useEffect(() => {
    if (!isOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); close();
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) close();
    };
    document.addEventListener('keydown', escape, true);
    document.addEventListener('pointerdown', outside, true);
    return () => {
      document.removeEventListener('keydown', escape, true);
      document.removeEventListener('pointerdown', outside, true);
    };
  }, [isOpen]);

  return (
    <HelpRow ref={container} onPointerLeave={() => setHovered(false)}>
      {children}
      <HelpButton type="button" aria-label={`${example.title} 도움말`} aria-describedby={isOpen ? id : undefined}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
        onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setFocused(true); }}
        onBlur={close} onClick={() => { if (pinned) close(); else setPinned(true); }}>?</HelpButton>
      {isOpen && <HelpCard id={id} role="tooltip" $above={above}>
        <strong>{example.title}</strong>
        <ExampleImage topic={topic} />
        <p>{example.text}</p>
      </HelpCard>}
    </HelpRow>
  );
}

function ExampleImage({ topic }: { topic: HelpTopic }) {
  const orange = '#ff9c54';
  const line = '#a8bac8';
  return (
    <Example viewBox="0 0 220 92" role="img" aria-label={`${help[topic].title} 그림 예시`}>
      {topic === 'place' && <>
        <path d="M43 43 90 20l75 22-47 26z M43 43v13l75 24 47-26V42 M118 68v12" fill="#3b4851" stroke={line} strokeLinejoin="round" />
        <circle cx="106" cy="47" r="7" fill={orange} /><circle cx="121" cy="47" r="7" fill="none" stroke="#7ec9ff" strokeWidth="2" /><Pointer x={122} y={49} />
      </>}
      {topic === 'bolt' && <>
        <path d="M73 44v13c0 11 74 11 74 0V44 M97 64v16m26-16v16 M97 71h26m-26 6h26" fill="none" stroke={line} strokeWidth="2" />
        <ellipse cx="110" cy="42" rx="37" ry="17" fill="#3b4851" stroke={line} strokeWidth="2" />
        <path d="m100 42 5-6h10l5 6-5 6h-10z" fill="#172128" stroke={orange} />
        <circle cx="110" cy="42" r="4" fill={orange} /><Pointer x={111} y={43} />
      </>}
      {topic === 'tool' && <>
        <path d="m63 46 14-9 17 6v16l-14 9-17-6z M76 37v16l18 6 M94 43l37-23 13 7v10L94 66" fill="#52636e" stroke={line} strokeWidth="2" strokeLinejoin="round" />
        <path d="m141 56 9-13 16-1 10 14-8 13-16 2z" fill="none" stroke={orange} strokeWidth="2" />
        <path d="m153 53 6 2 5-3 1 6 5 3-6 2-2 6-4-5-6 1 3-5z" fill={orange} />
      </>}
      {topic === 'torque' && <>
        <path d="M74 65a36 36 0 0 1 72 0" fill="none" stroke="#485966" strokeWidth="8" strokeLinecap="round" />
        <path d="M74 65a36 36 0 0 1 61-25" fill="none" stroke={orange} strokeWidth="8" strokeLinecap="round" />
        <path d="m110 65 22-23" stroke={orange} strokeWidth="3" strokeLinecap="round" /><circle cx="110" cy="65" r="5" fill={orange} />
        <text x="110" y="86" textAnchor="middle" fill="#eef3f6" fontSize="13">조임 세기 · N·m</text>
      </>}
      {(topic === 'drag' || topic === 'attach') && <>
        <rect x="22" y="31" width="48" height="35" rx="5" fill="none" stroke={orange} strokeWidth="2" strokeDasharray="5 3" />
        <rect x="150" y="31" width="48" height="35" rx="5" fill="#485966" stroke={line} />
        <path d="M137 49H83m8-8-8 8 8 8" fill="none" stroke={orange} strokeWidth="3" strokeLinecap="round" />
        {topic === 'attach' && <><path d="M46 15v25m-5-6 5 6 5-6" fill="none" stroke={orange} strokeWidth="3" strokeLinecap="round" /><circle cx="174" cy="48" r="6" fill={orange} /></>}
        <Pointer x={175} y={48} />
      </>}
      {topic === 'turn' && <>
        <circle cx="110" cy="46" r="30" fill="none" stroke={line} strokeDasharray="5 4" />
        <path d="M110 16a30 30 0 0 1 30 30m-8-7 8 7 7-8" fill="none" stroke={orange} strokeWidth="3" strokeLinecap="round" />
        <path d="M110 46h22" stroke={line} strokeWidth="5" strokeLinecap="round" /><circle cx="110" cy="46" r="6" fill={orange} />
        <Pointer x={145} y={49} />
      </>}
    </Example>
  );
}

function Pointer({ x, y }: { x: number; y: number }) {
  return <path transform={`translate(${x} ${y})`} d="M0 0v22l6-5 4 8 4-2-4-8 8-1z" fill="#f4f7fa" stroke="#182128" strokeLinejoin="round" />;
}

const HelpRow = styled.div(({ theme }) => ({
  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[2], minWidth: 0,
}));
const HelpButton = styled.button(({ theme }) => ({
  flex: '0 0 26px', height: 26, padding: 0, borderRadius: '50%', border: '1px solid ' + theme.color.primaryLine,
  background: theme.color.panel, color: theme.color.primarySoft, font: '700 15px/1 ' + theme.font.main, cursor: 'help',
  '&:hover, &:focus-visible': { borderColor: theme.color.primary, background: theme.color.primaryFill },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
const HelpCard = styled.div<{ $above?: boolean }>(({ theme, $above }) => ({
  position: 'absolute', zIndex: 20, insetInlineEnd: 0, ...($above ? { bottom: '100%' } : { top: '100%' }),
  width: 'min(280px, 100%)', display: 'grid', gap: theme.space[2], padding: theme.space[3],
  border: '1px solid ' + theme.color.primaryLine, background: theme.color.bgMid, color: theme.color.ink,
  fontSize: theme.size.sm, lineHeight: 1.5, boxShadow: '0 8px 28px #0007',
  '& p': { margin: 0 },
}));
const Example = styled.svg({ display: 'block', width: '100%', height: 'auto', background: '#1b262e' });
