'use client';

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Main from '@/features/reference-pages/generated/DrawingFlowMain';
import Steps from '@/features/reference-pages/generated/DrawingFlowSteps';
import { loadFlowAssets, type FlowSession } from './flowLogic';
import type { FlowProject } from './flowProject';
import { FlowTraining } from './FlowTraining';
import { FlowTrainingLibrary } from './FlowTrainingLibrary';

export default function DrawingFlowWorkspace({ start, showLibrary }: { start?: number; showLibrary?: boolean }) {
  const [session] = useState<FlowSession>(() => ({}));
  const main = useRef<Main>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [tools, openSteps] = useState<boolean | null>(null);
  const [training, setTraining] = useState<FlowProject | null>(null);

  useEffect(() => {
    let active = true;
    void loadFlowAssets().then(() => { if (active) setReady(true); }, (reason: Error) => {
      if (active) setError(reason.message);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { main.current?.setFlowTrainingActive(!!training); }, [training]);

  return <Boundary>
    {!ready && <Loading role={error ? 'alert' : 'status'}>{error || '도면 업데이트 준비 중'}</Loading>}
    {ready && (showLibrary
      ? <FlowTrainingLibrary onOpen={setTraining} />
      : <Main ref={main} session={session} start={start} onOpenSteps={openSteps} onTraining={setTraining} />)}
    {tools !== null && <StepLayer><Steps session={session} tools={tools}
      onNavigate={(screen) => main.current?.go(screen)} /></StepLayer>}
    {training && <FlowTraining project={training} onClose={() => setTraining(null)} />}
  </Boundary>;
}

const Boundary = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0a0d10;
  color: #e8ecef;
  font-family: NexonLv2Gothic, sans-serif;
  & [role='button']:focus-visible, & a:focus-visible, & label:focus-within {
    outline: 2px solid #ffb27a;
    outline-offset: 2px;
  }
  & [role='button'] { user-select: none; }
`;
const Loading = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #c3cbd0;
`;
const StepLayer = styled.section`
  position: absolute;
  inset: min(3.75vw, 6.6667vh) 0 0;
  z-index: 29;
  isolation: isolate;
  overflow: hidden;
  scrollbar-width: none;
`;
