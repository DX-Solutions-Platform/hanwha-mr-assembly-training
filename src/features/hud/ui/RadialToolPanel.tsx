'use client';
import dynamic from 'next/dynamic';
import styled, { keyframes } from 'styled-components';
import type { Tool } from '@/types/training';
import { CutButton } from '@/components/common/CutButton';

const ToolModelViewer = dynamic(() => import('../scene/ToolModelViewer').then((module) => module.ToolModelViewer), { ssr: false });
const RADIUS = 300;

interface RadialToolPanelProps { toolList: Tool[]; hoveredToolId: string | null; needsToolSafety: boolean; onHover: (toolId: string | null) => void; onPick: (toolId: string) => void; onConfirmToolSafety: () => void; }

/**
 * V 원형 공구 패널
 * - 3D 모델 도구: 칸 없이 실물 세워 회전 · 마우스 올리면 이름·규격 + 아래→위 스캔 효과
 * - 정답 도구 강조 없음 · 고를 때 오답 표시 없음
 */
export function RadialToolPanel({ toolList, hoveredToolId, needsToolSafety, onHover, onPick, onConfirmToolSafety }: RadialToolPanelProps) {
  const hoveredTool = toolList.find((tool) => tool.id === hoveredToolId);
  return (
    <Dim>
      <Ring>
        {toolList.map((tool, toolIndex) => {
          const angle = (toolIndex / toolList.length) * Math.PI * 2 - Math.PI / 2;
          const isHovered = tool.id === hoveredToolId;
          return (
            <Slot key={tool.id} style={{ transform: `translate(${Math.cos(angle) * RADIUS}px, ${Math.sin(angle) * RADIUS}px)` }}
              onMouseEnter={() => onHover(tool.id)} onMouseLeave={() => onHover(null)} onClick={() => onPick(tool.id)} $hasModel={!!tool.modelUrl} $isHovered={isHovered}>
              {tool.modelUrl ? <ToolModelViewer modelUrl={tool.modelUrl} size={170} /> : <Code>{tool.code}</Code>}
              {isHovered && tool.modelUrl && <Scan />}
              <SlotName>{tool.name}</SlotName>
            </Slot>
          );
        })}
        <Center>
          {needsToolSafety ? (
            <>
              <CenterTitle>공구 안전 수칙</CenterTitle>
              <CenterText>장갑 착용 · 공구 파손 여부 확인 · 작업물 고정 확인</CenterText>
              <CutButton $height={44} onClick={onConfirmToolSafety}>확인하고 공구 들기</CutButton>
            </>
          ) : (
            <>
              <CenterTitle>{hoveredTool?.name ?? '공구 선택'}</CenterTitle>
              <CenterSpec>{hoveredTool?.spec ?? ''}</CenterSpec>
              <CenterText>{hoveredTool?.description ?? '방향을 골라 공구를 선택하세요'}</CenterText>
            </>
          )}
        </Center>
      </Ring>
    </Dim>
  );
}

const scanUp = keyframes`from { transform: translateY(100%); opacity: 1; } to { transform: translateY(-10%); opacity: 0; }`;
const Dim = styled.div`position: absolute; inset: 0; z-index: 80; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center;`;
const Ring = styled.div`position: relative; width: 0; height: 0;`;
const Slot = styled.button<{ $hasModel: boolean; $isHovered: boolean }>`
  position: absolute; left: -90px; top: -90px; width: 180px; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;
  border: ${({ $hasModel, $isHovered }) => ($hasModel ? 'none' : $isHovered ? '1.5px solid #f37321' : '1px solid rgba(243,115,33,.45)')};
  background: ${({ $hasModel, $isHovered }) => ($hasModel ? 'transparent' : $isHovered ? 'rgba(243,115,33,.18)' : 'rgba(10,8,6,.7)')};
  border-radius: 50%; transition: background .15s;
`;
const Scan = styled.span`position: absolute; inset: 0; pointer-events: none; background: linear-gradient(0deg, transparent, rgba(243,115,33,.35) 50%, transparent); animation: ${scanUp} .9s ease-out;`;
const Code = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 22px; color: ${({ theme }) => theme.color.primary};`;
const SlotName = styled.span`position: absolute; bottom: 18px; font-size: 14px; font-weight: 700;`;
const Center = styled.div`position: absolute; left: -150px; top: -100px; width: 300px; height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center;`;
const CenterTitle = styled.span`font-size: 24px; font-weight: 700;`;
const CenterSpec = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 13px; color: ${({ theme }) => theme.color.primarySoft};`;
const CenterText = styled.span`font-size: 14px; line-height: 1.5; color: ${({ theme }) => theme.color.inkSub};`;
