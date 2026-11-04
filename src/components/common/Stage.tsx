'use client';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useStageScale } from '@/hooks/useStageScale';
import { theme } from '@/styles/theme';

interface StageProps { background?: ReactNode; scene?: ReactNode; children?: ReactNode; }

/**
 * 모든 화면의 루트 (16:9).
 * - UI(children)·배경은 1920×1080 좌표로 만들고 화면에 맞춰 스케일 → HD~4K 동일 배치
 * - 3D(scene)는 스케일하지 않고 실제 픽셀로 렌더 → 4K에서도 선명, 렌더 배율은 픽셀 예산으로 제한
 * - scene 위 UI는 기본적으로 클릭을 통과시키고, 직계 자식만 클릭을 받습니다 (data-passthrough로 예외)
 */
export function Stage({ background, scene, children }: StageProps) {
  const stageScale = useStageScale();
  const scaleStyle = { transform: `scale(${stageScale})` };
  return (
    <Viewport>
      <Frame style={{ width: theme.stage.width * stageScale, height: theme.stage.height * stageScale }}>
        <ScaledLayer style={scaleStyle}>{background ?? <DefaultBackground />}</ScaledLayer>
        {scene && <SceneLayer>{scene}</SceneLayer>}
        <UiLayer style={scaleStyle} $hasScene={!!scene}>
          {children}
          <Vignette data-passthrough />
        </UiLayer>
      </Frame>
    </Viewport>
  );
}

const Viewport = styled.div`position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden;`;
const Frame = styled.div`position: relative; flex: none; overflow: hidden;`;
const ScaledLayer = styled.div`
  position: absolute; left: 0; top: 0; overflow: hidden; transform-origin: 0 0;
  width: ${({ theme }) => theme.stage.width}px; height: ${({ theme }) => theme.stage.height}px;
`;
const DefaultBackground = styled.div`
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 40%, ${({ theme }) => theme.color.bgCenter} 0%, ${({ theme }) => theme.color.bgMid} 60%, ${({ theme }) => theme.color.bgEdge} 100%);
`;
const SceneLayer = styled.div`position: absolute; inset: 0;`;
const UiLayer = styled(ScaledLayer)<{ $hasScene: boolean }>`
  pointer-events: ${({ $hasScene }) => ($hasScene ? 'none' : 'auto')};
  & > *:not([data-passthrough]) { pointer-events: auto; }
  & > [data-passthrough] { pointer-events: none; }
`;
const Vignette = styled.div`position: absolute; inset: 0; background: radial-gradient(ellipse 85% 90% at 50% 50%, transparent 66%, rgba(0,0,0,.55) 100%);`;
