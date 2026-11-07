'use client';
import { useEffect, useState, type Dispatch, type RefObject } from 'react';
import type { FlowAction, FlowState } from '@/features/training-flow/state/flowReducer';
import type { ProcessElements } from '@/features/process-select/ProcessOverlay';
import { loadReferenceThree } from './referenceThree';
import { mountReferenceShelf } from './referenceShelf';
import type { SelectionProduct } from './selectionProducts';
import type { SceneLoadStatus } from './SceneLoadNotice';

interface SelectionSceneOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  currentRef: RefObject<FlowState>;
  returningRef: RefObject<boolean>;
  elements: RefObject<ProcessElements>;
  labelListRef: RefObject<(HTMLDivElement | null)[]>;
  productKey: string;
  dispatch: Dispatch<FlowAction>;
  requestBack: () => void;
}

export function useSelectionScene({ canvasRef, currentRef, returningRef, elements, labelListRef, productKey, dispatch, requestBack }: SelectionSceneOptions) {
  const [status, setStatus] = useState<SceneLoadStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const handleRetry = () => { setStatus('loading'); setAttempt((value) => value + 1); };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let isMounted = true;
    let dispose: (() => void) | undefined;
    const timeout = window.setTimeout(() => { if (isMounted) setStatus('error'); }, 20_000);
    const handleContextLost = (event: Event) => { event.preventDefault(); if (isMounted) setStatus('error'); };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    const products: SelectionProduct[] = JSON.parse(productKey);
    void loadReferenceThree().then((three) => {
      if (!isMounted) return;
      // 외부 글꼴을 기다리지 않고 사용 가능한 글꼴로 3D 모델을 초기화합니다.
      dispose = mountReferenceShelf(three, canvas, products, {
        onReady: () => { window.clearTimeout(timeout); if (isMounted) setStatus('ready'); },
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
    }).catch((error) => {
      window.clearTimeout(timeout);
      if (isMounted) { console.error(error); setStatus('error'); }
    });
    return () => {
      isMounted = false; window.clearTimeout(timeout);
      canvas.removeEventListener('webglcontextlost', handleContextLost); dispose?.();
    };
  }, [attempt, canvasRef, currentRef, returningRef, elements, labelListRef, productKey, dispatch, requestBack]);

  return { status, attempt, handleRetry };
}
