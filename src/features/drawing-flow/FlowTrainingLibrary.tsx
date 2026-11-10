'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { FlowProject } from './flowProject';
import { listFlowTraining, type SavedFlowTraining } from './flowTrainingStore';

export function FlowTrainingLibrary({ onOpen }: { onOpen: (project: FlowProject) => void }) {
  const [entries, setEntries] = useState<SavedFlowTraining[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void listFlowTraining().then((result) => { if (active) setEntries(result); }, () => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return <Library>
    <header><div><span>HANWHA · MR ASSEMBLY TRAINING</span><h1>생성된 교육장</h1></div><Link href="/training/upload">← 도면 업데이트</Link></header>
    {error ? <p role="alert">저장된 교육장을 읽지 못했습니다.</p> : !entries ? <p role="status">교육장 불러오는 중</p> :
      entries.length === 0 ? <p>이 브라우저에 저장된 교육장이 없습니다.</p> :
        entries.map(({ project }) => <button key={project.key} onClick={() => onOpen(project)}>
          <strong>{project.ko}</strong>
          <span>{project.code} · 구간 {project.sections.length}개 · 단계 {project.sections.reduce((count, section) => count + section.steps.length, 0)}개</span>
          <b>교육장 실행 →</b>
        </button>)}
  </Library>;
}

const Library = styled.section`
  max-width: 1000px; margin: 0 auto; padding: 50px 24px; height: 100%; overflow: auto;
  header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
  h1 { margin: 6px 0 0; color: white; }
  span { color: #8f9aa1; font: 13px var(--font-mono), monospace; }
  a, b { color: #ffb27a; }
  button {
    width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 6px 18px;
    text-align: left; background: #141a1f; border: 1px solid #232b31; border-radius: 12px;
    padding: 18px; margin-bottom: 10px;
  }
  button:hover { border-color: #f37321; }
  button span { grid-column: 1; }
  button b { grid-row: 1 / span 2; grid-column: 2; align-self: center; }
`;
