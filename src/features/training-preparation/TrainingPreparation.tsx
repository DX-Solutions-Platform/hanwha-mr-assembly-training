'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { loadReferenceThree } from '@/features/education-select/referenceThree';
import type { HudController } from '@/features/hud/useHudController';
import { PracticePause, PracticeReport } from '@/features/training-practice/PracticeReport';
import { AssemblyOverlay } from '@/features/training-practice/AssemblyOverlay';
import { initialAssembly, type AssemblyFeedback, type AssemblyReport, type AssemblyState } from '@/features/training-practice/assemblyTypes';
import { PracticeHud } from '@/features/training-practice/PracticeHud';
import { getPracticeGuide } from '@/features/training-practice/practiceData';
import type { PracticePlacement } from '@/features/training-practice/practiceTypes';
import { mountPreparationScene, type PreparationPhase, type PreparationState } from './preparationScene';
import { PreparationOverlay } from './PreparationOverlay';

interface PreparationProps { section: number; controller: HudController; onProceed: () => void; onBack: () => void; onHorizon: (y: number, elapsed: number) => void; }
interface LocalState { phase: PreparationPhase; introDelay: number; hoveredIndex: number | null; bomStartedAt: number; flyStartedAt: number; view: number; selectedPart: string | null; resetViewId: number; resetLayoutId: number; voice: boolean; }

export function TrainingPreparation(props: PreparationProps) {
  const [attempt, setAttempt] = useState(0);
  return <PreparationAttempt key={attempt} {...props} isRestart={attempt > 0} onRestart={() => {
    props.controller.dispatch({ type: 'setMode', mode: 'practice' });
    setAttempt((value) => value + 1);
  }} />;
}

function PreparationAttempt({ section, controller, onProceed, onBack, onHorizon, isRestart, onRestart }: PreparationProps & { isRestart: boolean; onRestart: () => void; }) {
  const [state, setState] = useState<LocalState>({ phase: isRestart ? 'setup' : 'transition', introDelay: isRestart ? 0 : 1800, hoveredIndex: null, bomStartedAt: 0, flyStartedAt: 0, view: 0, selectedPart: null, resetViewId: 0, resetLayoutId: 0, voice: false });
  const { hudState, dispatch: hudDispatch } = controller;
  const [assembly, setAssembly] = useState(() => initialAssembly(section));
  const [feedback, setFeedback] = useState<{ error: string | null; toast: AssemblyFeedback | null; sectionClear: string | null }>({ error: null, toast: null, sectionClear: null });
  const feedbackTimers = useRef<Partial<Record<'error' | 'toast' | 'section', ReturnType<typeof setTimeout>>>>({});
  const gauge = useRef<HTMLDivElement | null>(null), turn = useRef<HTMLDivElement | null>(null), rest = useRef<HTMLButtonElement | null>(null);
  const [report, setReport] = useState<AssemblyReport | null>(null);
  const sceneApi = useRef<ReturnType<typeof mountPreparationScene> | null>(null);
  const runtimeState: PreparationState = { ...state, ...assembly, mode: hudState.mode, isPaused: hudState.isPaused, isLayoutEditing: hudState.isLayoutEditing, isRadialOpen: assembly.radialOpen, benchHeight: hudState.benchHeight };
  const current = useRef(runtimeState), root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), labels = useRef<(HTMLDivElement | null)[]>([]);
  const info = useRef<HTMLDivElement | null>(null), sectionLabels = useRef<(HTMLDivElement | null)[]>([]), coordinates = useRef<HTMLDivElement | null>(null);
  const parentCallbacks = useRef({ onProceed });
  const proceed = useCallback(() => { if (state.phase === 'bom' && !hudState.isPaused) setState((value) => ({ ...value, phase: 'placing', hoveredIndex: null, flyStartedAt: performance.now() })); }, [state.phase, hudState.isPaused]);
  useEffect(() => { current.current = runtimeState; });
  useEffect(() => { const timers = feedbackTimers.current; return () => Object.values(timers).forEach(clearTimeout); }, []);
  useEffect(() => { parentCallbacks.current = { onProceed }; }, [onProceed]);
  useEffect(() => { hudDispatch({ type: 'reset', phase: 'placing' }); }, [hudDispatch]);
  useEffect(() => {
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').split(',')[0].trim();
    if (family) root.current?.style.setProperty('--font-mono', family);
    const setPhase = (phase: PreparationPhase) => setState((value) => ({ ...value, phase }));
    const handoff = setTimeout(() => setPhase('setup'), state.introDelay);
    const safety = setTimeout(() => setPhase('safety'), state.introDelay + 2750);
    return () => { clearTimeout(handoff); clearTimeout(safety); };
  }, [state.introDelay]);
  useEffect(() => {
    if (state.phase !== 'placing') return;
    const timer = setTimeout(() => { setState((value) => ({ ...value, phase: 'main' })); hudDispatch({ type: 'placingDone' }); parentCallbacks.current.onProceed(); }, 1700);
    return () => clearTimeout(timer);
  }, [state.phase, hudDispatch]);
  useEffect(() => {
    const element = canvas.current; if (!element) return;
    let mounted = true, dispose: (() => void) | undefined;
    const place = (label: HTMLDivElement | null, position: PracticePlacement, centerY = true) => {
      if (!label) return; label.style.opacity = String(position.opacity);
      label.style.transform = `translate(${position.x - (position.alignRight ? 0 : label.offsetWidth)}px,${position.y - (centerY ? label.offsetHeight / 2 : 0)}px)`;
    };
    void loadReferenceThree().then((T) => {
      if (!mounted) return;
      const mountedScene = mountPreparationScene(T, element, {
        getState: () => current.current,
        onHover: (hoveredIndex) => setState((value) => ({ ...value, hoveredIndex })), onHorizon,
        onLabel: (index, x, y, opacity) => { const label = labels.current[index]; if (label) { label.style.opacity = String(opacity); label.style.transform = `translate(${x - label.offsetWidth / 2}px,${y}px)`; } },
        onSelectPart: (selectedPart) => setState((value) => ({ ...value, selectedPart })),
        onChangeView: (view) => setState((value) => view === value.view ? value : ({ ...value, view, selectedPart: null })),
        onAssemblyChange: (patch: Partial<AssemblyState>) => setAssembly((value) => ({ ...value, ...patch })),
        onAssemblyComplete: () => { /* 원본처럼 구간 완료는 배너로 표시하고 리포트는 메뉴에서 엽니다. */ },
        onAssemblyFeedback: (value) => {
          const field = value.kind === 'section' ? 'sectionClear' : value.kind;
          setFeedback((current) => ({ ...current, [field]: value.kind === 'toast' ? value : value.message }));
          clearTimeout(feedbackTimers.current[value.kind]);
          feedbackTimers.current[value.kind] = setTimeout(() => setFeedback((current) => ({ ...current, [field]: null })), value.kind === 'error' ? 2400 : value.kind === 'section' ? 3800 : 2600);
        },
        onAssemblyFrame: (frame) => {
          const gaugeElement = gauge.current, turnElement = turn.current;
          if (gaugeElement) {
            gaugeElement.style.opacity = frame.gaugeVisible ? '1' : '0'; gaugeElement.style.transform = `translate(${960 - gaugeElement.offsetWidth / 2}px,790px)`;
            const arc = gaugeElement.querySelector('[data-arc]'), text = gaugeElement.querySelector('[data-tq]'), resistance = gaugeElement.querySelector<HTMLElement>('[data-res]');
            arc?.setAttribute('stroke-dasharray', `${(frame.torque / 12 * 245).toFixed(1)} 400`); arc?.setAttribute('stroke', frame.torque >= 11.9 ? '#3fe0c5' : '#f37321');
            if (text) text.textContent = frame.torque.toFixed(1); if (resistance) { resistance.style.width = `${Math.round(Math.min(1, frame.resistance) * 100)}%`; resistance.style.background = frame.resistance > 0.7 ? '#ff5a4e' : '#f2c230'; }
          }
          if (turnElement) {
            turnElement.style.opacity = frame.turnVisible ? String(frame.turnOpacity) : '0'; turnElement.style.transform = `translate(${frame.turnX}px,${frame.turnY}px)`;
            const spin = turnElement.querySelector<SVGElement>('[data-spin]'), dot = turnElement.querySelector<HTMLElement>('[data-dot]');
            if (spin) spin.style.transform = `scaleY(0.62) rotate(${frame.turnRotation}deg)`; if (dot) { dot.style.left = `${frame.dotX}px`; dot.style.top = `${frame.dotY}px`; }
          }
          if (rest.current) rest.current.style.transform = `translateX(${frame.restShake}px)`;
        },
        onHeightLoaded: (benchHeight) => hudDispatch({ type: 'setBenchHeight', benchHeight }),
        onInfoPosition: (position) => place(info.current, position),
        onSectionPosition: (index, position) => place(sectionLabels.current[index], position),
        onCoordinates: (name, text, position) => { const element = coordinates.current; place(element, position, false); if (element) { const title = element.querySelector('[data-coordinate-name]'), content = element.querySelector('[data-coordinate-text]'); if (title) title.textContent = name; if (content) content.textContent = text; } },
      });
      sceneApi.current = mountedScene; dispose = mountedScene;
    }).catch((error) => { if (mounted) console.error(error); });
    return () => { mounted = false; sceneApi.current = null; dispose?.(); };
  }, [onHorizon, hudDispatch]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) return;
      if (event.code === 'Space' && state.phase === 'bom') { event.preventDefault(); proceed(); }
      if (state.phase !== 'main') return;
      if (event.code === 'Escape') { hudDispatch({ type: 'togglePause' }); return; }
      if (hudState.isPaused) return;
      if (event.code === 'KeyV' && !event.repeat) setAssembly((value) => value.radialOpen ? value : ({ ...value, radialOpen: true, radialHover: null, toolSafetyOpen: false }));
      if (event.code === 'KeyL' && !event.repeat) hudDispatch({ type: 'toggleLayoutEdit' });
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const value = current.current;
      if (event.code === 'KeyV' && value.radialOpen && !value.toolSafetyOpen) {
        if (value.radialHover !== null) sceneApi.current?.pickTool(value.radialHover);
        else setAssembly((value) => ({ ...value, radialOpen: false }));
      }
    };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [state.phase, hudState.isPaused, proceed, hudDispatch]);
  const guide = getPracticeGuide(assembly.section, assembly.step, assembly.boltN, assembly.boltStage, assembly.restTool);
  const spokenGuide = state.phase === 'placing' ? '부품을 자재 구역으로 배치합니다' : state.phase === 'main' ? hudState.isLayoutEditing ? '구역을 끌어 위치 이동 · 휠 또는 R로 회전 · L로 종료' : hudState.mode === 'eval' && assembly.section === 0 ? '' : guide.text : '';
  useEffect(() => {
    if (!state.voice || !spokenGuide || !window.speechSynthesis) return;
    speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(spokenGuide); utterance.lang = 'ko-KR'; utterance.rate = 1.05; speechSynthesis.speak(utterance);
    return () => speechSynthesis.cancel();
  }, [state.voice, spokenGuide]);
  const isPractice = state.phase === 'placing' || state.phase === 'main';
  return <Root ref={root} data-passthrough data-preparation-phase={state.phase} $visible={state.phase !== 'transition'}>
    <Canvas ref={canvas} width={1920} height={1080} $visible={state.phase !== 'transition'} />
    <PreparationOverlay phase={state.phase} hoveredIndex={state.hoveredIndex} onLabelElement={(index, element) => { labels.current[index] = element; }}
      onConfirm={() => setState((value) => ({ ...value, phase: 'bom', hoveredIndex: null, bomStartedAt: performance.now() }))} onProceed={proceed} onBack={onBack} onPause={() => hudDispatch({ type: 'togglePause' })} />
    {isPractice && <PracticeHud state={runtimeState} isMain={state.phase === 'main'} voice={state.voice} onBack={onBack} onPause={() => hudDispatch({ type: 'togglePause' })}
      onInfoElement={(element) => { info.current = element; }} onSectionElement={(index, element) => { sectionLabels.current[index] = element; }} onCoordinateElement={(element) => { coordinates.current = element; }}
      onResetView={() => setState((value) => ({ ...value, resetViewId: value.resetViewId + 1 }))} onVoice={() => setState((value) => ({ ...value, voice: !value.voice }))}
      onMode={(mode) => hudDispatch({ type: 'setMode', mode })} onEdit={() => hudDispatch({ type: 'toggleLayoutEdit' })} onHeight={(benchHeight) => hudDispatch({ type: 'setBenchHeight', benchHeight })}
      onResetLayout={() => { setState((value) => ({ ...value, resetLayoutId: value.resetLayoutId + 1 })); hudDispatch({ type: 'setBenchHeight', benchHeight: 0 }); }} />}
    {state.phase === 'main' && <AssemblyOverlay state={assembly} mode={hudState.mode} error={feedback.error} toast={feedback.toast} sectionClear={feedback.sectionClear}
      onGauge={(element) => { gauge.current = element; }} onTurn={(element) => { turn.current = element; }} onRest={(element) => { rest.current = element; }}
      onUseRest={() => sceneApi.current?.useRest()} onPick={(index) => sceneApi.current?.pickTool(index)} onConfirmSafety={() => sceneApi.current?.confirmToolSafety()}
      onHover={(radialHover) => setAssembly((value) => value.toolSafetyOpen || value.radialHover === radialHover ? value : ({ ...value, radialHover }))}
      onRadialMove={(event) => {
        if (current.current.toolSafetyOpen || !canvas.current) return;
        const bounds = canvas.current.getBoundingClientRect(), x = (event.clientX - bounds.left) / bounds.width * 1920 - 960, y = (event.clientY - bounds.top) / bounds.height * 1080 - 540;
        let angle = Math.atan2(y, x) + Math.PI / 2; if (angle < 0) angle += Math.PI * 2;
        const radialHover = Math.hypot(x, y) < 110 ? null : Math.round(angle / (Math.PI * 2 / 6)) % 6;
        setAssembly((value) => value.radialHover === radialHover ? value : ({ ...value, radialHover }));
      }} />}
    {hudState.isPaused && <PracticePause onResume={() => hudDispatch({ type: 'togglePause' })} onBack={onBack} onRestart={onRestart} onReport={() => {
      const snapshot = sceneApi.current?.getReport();
      if (snapshot) { setReport(snapshot); hudDispatch({ type: 'togglePause' }); }
    }} />}
    {report && <PracticeReport report={report} section={assembly.section} onRestart={onRestart} onClose={() => setReport(null)} />}
  </Root>;
}

const Root = styled.div<{ $visible: boolean }>`position: absolute; inset: 0; pointer-events: none; z-index: 40; opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity .6s ease; &, & * { box-sizing: content-box; }`;
const Canvas = styled.canvas<{ $visible: boolean }>`position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: ${({ $visible }) => $visible ? 'auto' : 'none'};`;
