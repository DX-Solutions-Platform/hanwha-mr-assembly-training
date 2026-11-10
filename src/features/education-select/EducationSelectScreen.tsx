'use client';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Stage } from '@/components/common/Stage';
import { NURI_MANUAL_HREF, useRegisteredNuriManual } from '@/store/demoManualRegistration';
import type { Product } from '@/types/training';
import { SelectionBackdrop } from './SelectionBackdrop';
import { SelectionHeader } from './SelectionHeader';
import { getSelectionProducts } from './selectionProducts';
import { useSelectionScene } from './useSelectionScene';
import { SceneLoadNotice } from './SceneLoadNotice';
import type { FlowState, FlowAction } from '@/features/training-flow/state/flowReducer';
import { ProcessOverlay, type ProcessElements } from '@/features/process-select/ProcessOverlay';
import type { HudController } from '@/features/hud/useHudController';

const TrainingPreparation = dynamic(() => import('@/features/training-preparation/TrainingPreparation')
  .then((module) => module.TrainingPreparation), { ssr: false });

interface EducationSelectProps {
  productList: Product[];
  flowState: FlowState;
  dispatch: Dispatch<FlowAction>;
  hudController: HudController;
}

export function EducationSelectScreen({ productList, flowState, dispatch, hudController }: EducationSelectProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const labelListRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(flowState);
  const elements = useRef<ProcessElements>({ labels: [], lines: [], back: null, panel: null });
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returningRef = useRef(false);
  const [isReturning, setIsReturning] = useState(false);
  const nuriRegistered = useRegisteredNuriManual();
  const selectionList = getSelectionProducts(productList, nuriRegistered);
  const nuriIndex = nuriRegistered ? selectionList.length - 1 : -1;
  const productKey = JSON.stringify(selectionList);
  const labelWidth = Math.min(460, Math.floor(1760 / Math.max(1, selectionList.length))) - 40;
  const isProcess = flowState.phase !== 'select', { hoveredIndex, activeIndex, selectedSectionIndex } = flowState;
  const activeProduct = activeIndex !== null ? selectionList[activeIndex] : null;
  const isTransition = flowState.phase === 'transition' || flowState.phase === 'hud';
  const selectProduct = useCallback((productIndex: number) => {
    if (productIndex === nuriIndex) router.push(NURI_MANUAL_HREF);
    else dispatch({ type: 'selectProduct', productIndex });
  }, [dispatch, nuriIndex, router]);
  const onHorizon = useCallback((y: number, elapsed: number) => {
    const background = backgroundRef.current; if (!background) return;
    const position = `${Math.round(y)}px`;
    const transition = elapsed < 1.8 ? 'transform 1.5s cubic-bezier(.45,0,.2,1)' : elapsed < 2.4 ? 'transform .5s ease' : 'none';
    if (background.style.getPropertyValue('--preparation-horizon') !== position) background.style.setProperty('--preparation-horizon', position);
    if (background.style.getPropertyValue('--preparation-floor-transition') !== transition) background.style.setProperty('--preparation-floor-transition', transition);
  }, []);
  const requestBack = useCallback(() => {
    if (returningRef.current) return;
    returningRef.current = true; setIsReturning(true); dispatch({ type: 'clearSection' });
    returnTimerRef.current = setTimeout(() => {
      returningRef.current = false; setIsReturning(false); dispatch({ type: 'backToSelect' });
    }, 900); // seqBack(): 원본 복귀 시간
  }, [dispatch]);

  useEffect(() => { currentRef.current = flowState; }, [flowState]);
  useEffect(() => {
    // 버튼 포커스/scrollIntoView가 1920×1080 좌표 레이어를 이동하지 않도록 격리합니다.
    const layer = labelLayerRef.current?.parentElement; if (!layer) return;
    const previous = layer.style.overflow; layer.style.overflow = 'clip'; layer.scrollTop = 0; layer.scrollLeft = 0;
    return () => { layer.style.overflow = previous; layer.scrollTop = 0; layer.scrollLeft = 0; };
  }, []);
  useEffect(() => () => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); }, []);
  const scene = useSelectionScene({ canvasRef, currentRef, returningRef, elements, labelListRef, productKey, dispatch, selectProduct, requestBack });
  const invalidate = scene.invalidate;
  useEffect(() => { invalidate(); }, [flowState, isReturning, invalidate]);
  const isVisible = scene.status === 'ready';

  return <Stage background={<SelectionBackdrop isProcess={isProcess} isFlat={isTransition} onElement={(element) => { backgroundRef.current = element; }} />} scene={<Canvas key={scene.attempt} ref={canvasRef} $isVisible={isVisible} width={1920} height={1080} data-selection-canvas />}>
    <SelectionHeader isVisible isProcess={isProcess} />
    <SceneLoadNotice status={scene.status} onRetry={scene.handleRetry} />
    <LabelLayer ref={labelLayerRef} data-passthrough $isProcess={isProcess}>
      {selectionList.map((product, index) => <Label key={`${product.code}-${index}`} ref={(element) => { labelListRef.current[index] = element; }} $isLive={product.isLive} $isVisible={isVisible}>
        <Code $isCustom={product.isCustom}>{product.code}</Code>
        <Name style={{ maxWidth: labelWidth }}>{product.name}</Name>
        <Meta $isLive={product.isLive}>{product.meta}</Meta>
        {product.kind === 'nuri' && isVisible && !isProcess && <ManualLink href={NURI_MANUAL_HREF} prefetch={false}>교범 열기 →</ManualLink>}
        <Underline $isHovered={hoveredIndex === index} />
      </Label>)}
    </LabelLayer>
    {isProcess && activeProduct && activeProduct.kind !== 'nuri' && <ProcessOverlay kind={activeProduct.kind} selectedIndex={selectedSectionIndex} isReturning={isReturning} isDeparting={isTransition}
      onLabelElement={(index, element) => { elements.current.labels[index] = element; }} onLineElement={(index, element) => { elements.current.lines[index] = element; }}
      onBackElement={(element) => { elements.current.back = element; }} onPanelElement={(element) => { elements.current.panel = element; }}
      onHover={(sectionIndex) => dispatch({ type: 'hoverSection', sectionIndex })} onSelect={(sectionIndex) => dispatch({ type: 'selectSection', sectionIndex })}
      onClose={() => dispatch({ type: 'clearSection' })} onBack={requestBack} onStart={() => activeProduct.kind === 'stool' ? router.push(`/training/stool?card=${selectedSectionIndex ?? 0}`) : dispatch({ type: 'startTraining' })} />}
    {isTransition && <TrainingPreparation section={selectedSectionIndex ?? 0} controller={hudController} onHorizon={onHorizon} onBack={() => dispatch({ type: 'cancelPreparation' })} onProceed={() => dispatch({ type: 'enterHud' })} />}
  </Stage>;
}

const Canvas = styled.canvas<{ $isVisible: boolean }>`
  position: absolute; left: 0; top: 0; width: 100%; height: 100%;
  opacity: ${({ $isVisible }) => $isVisible ? 1 : 0}; transition: opacity .5s;
  pointer-events: ${({ $isVisible }) => $isVisible ? 'auto' : 'none'};
`;
const LabelLayer = styled.div<{ $isProcess: boolean }>`position: absolute; inset: 0; pointer-events: none; opacity: ${({ $isProcess }) => $isProcess ? 0 : 1}; transition: opacity .45s ease;`;
const Label = styled.div<{ $isLive: boolean; $isVisible: boolean }>`
  position: absolute; left: 0; top: 0; transform: translate(-50%,0); display: flex; flex-direction: column;
  align-items: center; gap: 10px; opacity: ${({ $isLive, $isVisible }) => $isVisible ? ($isLive ? 1 : .6) : 0}; transition: opacity .5s;
`;
const Code = styled.span<{ $isCustom: boolean }>`
  white-space: nowrap; font: 500 13px/1 ${({ theme }) => theme.font.mono}; letter-spacing: .2em;
  color: ${({ $isCustom }) => $isCustom ? '#3fe0c5' : '#f37321'};
`;
const Name = styled.span`
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 700 34px/1.1 'NexonLv2Gothic'; color: #fff;
  text-shadow: 0 2px 14px rgba(0,0,0,.8);
`;
const Meta = styled.span<{ $isLive: boolean }>`
  white-space: nowrap; font: 400 15px/1 'NexonLv2Gothic'; color: ${({ $isLive }) => $isLive ? '#e6eaec' : '#b4bcc0'};
`;
const ManualLink = styled(Link)`
  pointer-events: auto; color: ${({ theme }) => theme.color.primarySoft};
  &:hover, &:focus-visible { text-decoration: underline; }
`;
const Underline = styled.div<{ $isHovered: boolean }>`
  width: ${({ $isHovered }) => $isHovered ? 120 : 36}px; height: 2px; margin-top: 6px; background: #f37321;
  box-shadow: 0 0 10px rgba(243,115,33,.8); transition: width .3s;
`;
