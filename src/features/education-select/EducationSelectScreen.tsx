'use client';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Stage } from '@/components/common/Stage';
import type { Product } from '@/types/training';
import { SelectionBackdrop } from './SelectionBackdrop';
import { SelectionHeader } from './SelectionHeader';
import { getSelectionProducts, type SelectionProduct } from './selectionProducts';
import { loadReferenceThree } from './referenceThree';
import { mountReferenceShelf } from './referenceShelf';
import type { FlowState, FlowAction } from '@/features/training-flow/state/flowReducer';
import { ProcessOverlay, type ProcessElements } from '@/features/process-select/ProcessOverlay';
import { TrainingPreparation } from '@/features/training-preparation/TrainingPreparation';
import type { HudController } from '@/features/hud/useHudController';

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
  const [isVisible, setIsVisible] = useState(false);
  const selectionList = getSelectionProducts(productList);
  const productKey = JSON.stringify(selectionList);
  const labelWidth = Math.min(460, Math.floor(1760 / Math.max(1, selectionList.length))) - 40;
  const isProcess = flowState.phase !== 'select', { hoveredIndex, activeIndex, selectedSectionIndex } = flowState;
  const activeProduct = activeIndex !== null ? selectionList[activeIndex] : null;
  const isTransition = flowState.phase === 'transition' || flowState.phase === 'hud';
  const onHorizon = useCallback((y: number, elapsed: number) => {
    const background = backgroundRef.current; if (!background) return;
    background.style.setProperty('--preparation-horizon', `${y}px`);
    background.style.setProperty('--preparation-floor-transition', elapsed < 1.8 ? 'top 1.5s cubic-bezier(.45,0,.2,1)' : elapsed < 2.4 ? 'top .5s ease' : 'top 0s');
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
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 250); // 시안 startAll(): boot → product
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let isMounted = true;
    let dispose: (() => void) | undefined;
    const products: SelectionProduct[] = JSON.parse(productKey);
    void loadReferenceThree().then(async (three) => {
      await document.fonts.ready;
      if (!isMounted) return;
      dispose = mountReferenceShelf(three, canvas, products, {
        getHoveredIndex: () => currentRef.current.hoveredIndex,
        onHover: (productIndex) => dispatch({ type: 'hoverProduct', productIndex }),
        onSelect: (productIndex) => dispatch({ type: 'selectProduct', productIndex }),
        getState: () => ({ activeIndex: currentRef.current.phase === 'select' ? null : currentRef.current.activeIndex,
          selectedSection: currentRef.current.selectedSectionIndex, hoveredSection: currentRef.current.hoveredSectionIndex, isReturning: returningRef.current, isTransition: currentRef.current.phase === 'transition' || currentRef.current.phase === 'hud' }),
        onHoverSection: (sectionIndex) => dispatch({ type: 'hoverSection', sectionIndex }),
        onSelectSection: (sectionIndex) => dispatch({ type: 'selectSection', sectionIndex }),
        onClearSection: () => dispatch({ type: 'clearSection' }), onBack: requestBack,
        isLabelHovered: () => elements.current.labels.some((element) => !!element?.matches(':hover')),
        isPanelTarget: (target) => target instanceof Node && !!elements.current.panel?.contains(target),
        onBackVisible: (visible) => { if (elements.current.back) elements.current.back.style.opacity = visible ? '1' : '0'; },
        onLabelPlacement: (index, placement) => {
          const label = elements.current.labels[index], line = elements.current.lines[index];
          if (label) {
            label.style.left = `${placement.x}px`; label.style.top = `${placement.y}px`; label.style.opacity = placement.opacity;
            label.style.background = placement.background; label.style.pointerEvents = placement.isVisible ? 'auto' : 'none';
            if (placement.isVisible) label.style.transform = 'none';
          }
          if (line) { line.setAttribute('points', placement.points); line.style.opacity = placement.lineOpacity; }
        },
        onLabelPosition: (index, x, y) => {
          const label = labelListRef.current[index];
          if (label) { label.style.left = `${x.toFixed(1)}px`; label.style.top = `${y.toFixed(1)}px`; }
        },
      });
    }).catch((error) => { if (isMounted) console.error(error); });
    return () => { isMounted = false; dispose?.(); };
  }, [productKey, dispatch, requestBack]);

  return <Stage background={<SelectionBackdrop isProcess={isProcess} isFlat={isTransition} onElement={(element) => { backgroundRef.current = element; }} />} scene={<Canvas ref={canvasRef} $isVisible={isVisible} width={1920} height={1080} data-selection-canvas />}>
    <SelectionHeader isVisible={isVisible} isProcess={isProcess} />
    <LabelLayer ref={labelLayerRef} data-passthrough $isProcess={isProcess}>
      {selectionList.map((product, index) => <Label key={`${product.code}-${index}`} ref={(element) => { labelListRef.current[index] = element; }} $isLive={product.isLive} $isVisible={isVisible}>
        <Code $isCustom={product.isCustom}>{product.code}</Code>
        <Name style={{ maxWidth: labelWidth }}>{product.name}</Name>
        <Meta $isLive={product.isLive}>{product.meta}</Meta>
        <Underline $isHovered={hoveredIndex === index} />
      </Label>)}
    </LabelLayer>
    {isProcess && activeProduct && <ProcessOverlay kind={activeProduct.kind} selectedIndex={selectedSectionIndex} isReturning={isReturning} isDeparting={isTransition}
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
const Underline = styled.div<{ $isHovered: boolean }>`
  width: ${({ $isHovered }) => $isHovered ? 120 : 36}px; height: 2px; margin-top: 6px; background: #f37321;
  box-shadow: 0 0 10px rgba(243,115,33,.8); transition: width .3s;
`;
