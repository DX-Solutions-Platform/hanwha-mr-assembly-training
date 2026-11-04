'use client';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { Tool } from '@/types/training';
import { cutCorner } from '@/styles/mixins';

const ToolModelViewer = dynamic(() => import('../scene/ToolModelViewer').then((module) => module.ToolModelViewer), { ssr: false });

/** 확대창 오른쪽 아래 도구 거치대: V 패널에서 고른 도구가 놓이고 반복 작업 동안 여기서 바로 사용 */
export function ToolRest({ tool, isVisible, onUse }: { tool: Tool | null; isVisible: boolean; onUse: () => void }) {
  if (!isVisible) return null;
  return (
    <Root onClick={onUse} $hasTool={!!tool}>
      <Label>TOOL REST</Label>
      <Visual>
        {tool?.modelUrl ? <ToolModelViewer modelUrl={tool.modelUrl} size={150} /> : tool ? <WrenchIcon /> : <Empty>V</Empty>}
      </Visual>
      <Divider />
      <Name>{tool?.name ?? '도구 없음'}</Name>
      <Spec>{tool?.spec ?? 'V 를 눌러 선택'}</Spec>
    </Root>
  );
}

function WrenchIcon() {
  return <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#e6eaec" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(243,115,33,.6))' }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
}

const Root = styled.button<{ $hasTool: boolean }>`
  position: absolute; left: 1284px; top: 540px; width: 190px; height: 230px; z-index: 30; padding-bottom: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px;
  background: rgba(10,8,6,.55); border: 1px solid rgba(243,115,33,.45); ${({ theme }) => cutCorner(theme.cut.md)};
  &:hover { background: rgba(243,115,33,.16); }
`;
const Label = styled.span`position: absolute; left: 12px; top: 10px; font-family: ${({ theme }) => theme.font.mono}; font-size: 10px; letter-spacing: .16em; color: ${({ theme }) => theme.color.primary};`;
const Visual = styled.div`position: absolute; left: 20px; top: 22px; width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; pointer-events: none;`;
const Empty = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 28px; color: rgba(243,115,33,.5);`;
const Divider = styled.div`width: 120px; height: 1px; background: rgba(243,115,33,.6);`;
const Name = styled.span`font-size: 16px; font-weight: 700;`;
const Spec = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 11px; color: ${({ theme }) => theme.color.primarySoft};`;
