'use client';
import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { SectionTitle } from '@/components/common/SectionTitle';
import { ThinProgress } from '@/components/common/ThinProgress';
import { readPdfPages } from '../readPdfPages';

const TASK_LIST = [
  { name: '도면 페이지 인식', from: 0, to: 22 },
  { name: '부품 · 수량 추출', from: 22, to: 45 },
  { name: '부품 3D 모델링', from: 45, to: 68 },
  { name: '조립 순서 추론', from: 68, to: 86 },
  { name: '교육 세션 · 안내 문구 생성', from: 86, to: 100 },
];

export function AnalyzePanel({ fileList, onDone }: { fileList: File[]; onDone: () => void }) {
  const [progressPercent, setProgressPercent] = useState(0);
  const [pageImageList, setPageImageList] = useState<string[]>([]);
  const [partCodeList, setPartCodeList] = useState<string[]>([]);
  const doneRef = useRef(onDone); doneRef.current = onDone;

  useEffect(() => {
    const pdfFile = fileList.find((file) => /\.pdf$/i.test(file.name));
    if (pdfFile) readPdfPages(pdfFile, (pageImageUrl, codeList) => { setPageImageList((list) => [...list, pageImageUrl]); setPartCodeList(codeList); }).catch(console.warn);
    const intervalId = setInterval(() => setProgressPercent((value) => {
      const nextValue = value + 0.6;
      if (nextValue >= 100) { clearInterval(intervalId); setTimeout(() => doneRef.current(), 600); return 100; }
      return nextValue;
    }), 40);
    return () => clearInterval(intervalId);
  }, [fileList]);

  const currentPageIndex = Math.min(7, Math.floor((progressPercent / 100) * 9));

  return (
    <Layout>
      <PageGrid>
        {Array.from({ length: 8 }, (_, pageIndex) => (
          <Page key={pageIndex} $isCurrent={pageIndex === currentPageIndex && progressPercent < 100} $isLoaded={!!pageImageList[pageIndex]}>
            {pageImageList[pageIndex] && <img src={pageImageList[pageIndex]} alt="" />}
            {pageIndex === currentPageIndex && progressPercent < 100 && <ScanLine />}
            <PageTag>P{pageIndex + 1}</PageTag>
          </Page>
        ))}
      </PageGrid>
      <Side>
        <SectionTitle label="분석 중" count={Math.floor(progressPercent)} />
        {TASK_LIST.map((task) => {
          const taskPercent = Math.max(0, Math.min(100, ((progressPercent - task.from) / (task.to - task.from)) * 100));
          const taskState = taskPercent >= 100 ? 'done' : taskPercent > 0 ? 'running' : 'idle';
          return (
            <Task key={task.name} $state={taskState}>
              <TaskHead><span>{task.name}</span><TaskState $state={taskState}>{taskState === 'done' ? '완료' : taskState === 'running' ? '진행 중' : '대기'}</TaskState></TaskHead>
              <ThinProgress percent={taskPercent} tone={taskState === 'done' ? 'success' : 'primary'} />
              {task.name.startsWith('부품 ·') && partCodeList.length > 0 && <TaskDetail>부품 번호 {partCodeList.length}종 · {partCodeList.slice(0, 4).join(' · ')}</TaskDetail>}
            </Task>
          );
        })}
      </Side>
    </Layout>
  );
}

const scan = keyframes`from { transform: translateY(0); } to { transform: translateY(100%); }`;
const Layout = styled.div`height: 100%; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 32px;`;
const PageGrid = styled.div`display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 14px;`;
const Page = styled.div<{ $isCurrent: boolean; $isLoaded: boolean }>`
  position: relative; overflow: hidden; background: #f4f2ee; opacity: ${({ $isLoaded }) => ($isLoaded ? 1 : 0.25)};
  border: ${({ $isCurrent }) => ($isCurrent ? '2px solid #f37321' : '1px solid rgba(243,115,33,.3)')};
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
`;
const ScanLine = styled.div`position: absolute; inset: 0; &::after { content: ''; display: block; height: 3px; background: #f37321; box-shadow: 0 0 14px #f37321; animation: ${scan} 1.1s linear infinite; }`;
const PageTag = styled.span`position: absolute; left: 8px; top: 8px; padding: 4px 6px; font-family: ${({ theme }) => theme.font.mono}; font-size: 11px; font-weight: 700; background: #f37321; color: #140a04;`;
const Side = styled.div`display: flex; flex-direction: column; gap: 14px;`;
const Task = styled.div<{ $state: string }>`display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 1px solid ${({ $state }) => ($state === 'running' ? '#f37321' : 'rgba(243,115,33,.25)')}; background: ${({ $state }) => ($state === 'running' ? 'rgba(243,115,33,.1)' : 'rgba(10,8,6,.55)')}; font-size: 17px; font-weight: ${({ $state }) => ($state === 'running' ? 700 : 400)};`;
const TaskHead = styled.div`display: flex; justify-content: space-between; align-items: baseline;`;
const TaskState = styled.span<{ $state: string }>`font-family: ${({ theme }) => theme.font.mono}; font-size: 13px; color: ${({ theme, $state }) => ($state === 'done' ? theme.color.success : $state === 'running' ? theme.color.primary : theme.color.inkDisabled)};`;
const TaskDetail = styled.span`font-size: 14px; font-weight: 400; color: ${({ theme }) => theme.color.inkSub};`;
