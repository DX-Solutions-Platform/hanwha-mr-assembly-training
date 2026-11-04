'use client';
import styled from 'styled-components';
import { TOOL_LIST } from '@/data/tools';
import type { HudController } from './useHudController';
import { CornerButtons } from './ui/CornerButtons';
import { TopProgressBar } from './ui/TopProgressBar';
import { GuideLine } from './ui/GuideLine';
import { MissionList } from './ui/MissionList';
import { ZoomWindow } from './ui/ZoomWindow';
import { ToolRest } from './ui/ToolRest';
import { RadialToolPanel } from './ui/RadialToolPanel';
import { ViewControls } from './ui/ViewControls';
import { MistakeToast } from './ui/MistakeToast';
import { PreviewModeBar } from './ui/PreviewModeBar';
import { SafetyModal } from './ui/SafetyModal';
import { BomProceedButton } from './ui/BomProceedButton';
import { ReportModal } from './ui/ReportModal';
import { PauseMenu } from './ui/PauseMenu';

/** 교육장 UI (확정 화면 구성). 단독 페이지와 한 화면 흐름 모두 이 컴포넌트를 씁니다 */
export function HudUiLayer({ controller, onExit }: { controller: HudController; onExit?: () => void }) {
  const { product, card, stepList, currentStep, hudState, dispatch, isVoiceOn, toggleVoice, handleUseRestTool } = controller;
  if (!product || !card) return <Missing>교육을 찾을 수 없습니다.</Missing>;
  const isMain = hudState.phase === 'main';
  const restTool = TOOL_LIST.find((tool) => tool.id === hudState.restToolId) ?? null;
  return (
    <>
      <CornerButtons onPause={() => dispatch({ type: 'togglePause' })} onBack={onExit} />
      <TopProgressBar productName={product.name} sectionName={card.name} stepIndex={hudState.stepIndex} totalStepCount={stepList.length} />
      {hudState.phase === 'preview' && <PreviewModeBar onStart={() => dispatch({ type: 'startTraining' })} />}
      {hudState.phase === 'safety' && <SafetyModal onConfirm={() => dispatch({ type: 'confirmSafety' })} />}
      {hudState.phase === 'bom' && <BomProceedButton onProceed={() => dispatch({ type: 'proceedBom' })} />}
      {isMain && (
        <>
          <GuideLine stepLabel={`STEP ${String(hudState.stepIndex + 1).padStart(2, '0')}`} guide={hudState.mode === 'eval' ? '' : currentStep?.guide ?? ''} />
          <MissionList stepList={stepList} stepIndex={hudState.stepIndex} />
          <ZoomWindow isActive={!!currentStep?.toolId} />
          <ToolRest tool={restTool} isVisible={!!currentStep?.toolId} onUse={handleUseRestTool} />
          <ViewControls isVoiceOn={isVoiceOn} onToggleVoice={toggleVoice} mode={hudState.mode} onChangeMode={(mode) => dispatch({ type: 'setMode', mode })} />
        </>
      )}
      {hudState.isRadialOpen && (
        <RadialToolPanel toolList={TOOL_LIST} hoveredToolId={hudState.hoveredToolId} needsToolSafety={!hudState.hasConfirmedToolSafety}
          onHover={(toolId) => dispatch({ type: 'hoverTool', toolId })} onPick={(toolId) => dispatch({ type: 'pickTool', toolId })} onConfirmToolSafety={() => dispatch({ type: 'confirmToolSafety' })} />
      )}
      <MistakeToast message={hudState.mistakeMessage} />
      {hudState.phase === 'report' && <ReportModal startedAt={hudState.startedAt} mistakeCount={hudState.mistakeCount} overTorqueCount={hudState.overTorqueCount} hintCount={hudState.hintCount} />}
      {hudState.isPaused && <PauseMenu onResume={() => dispatch({ type: 'togglePause' })} />}
    </>
  );
}

const Missing = styled.div`position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 24px;`;
