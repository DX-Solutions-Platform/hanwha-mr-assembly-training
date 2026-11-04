'use client';
import { useState } from 'react';
import styled from 'styled-components';
import { cutCorner } from '@/styles/mixins';
import { ACCEPT_ATTRIBUTE, FILE_FORMAT_GROUP_LIST } from '../fileFormats';

export function DropZone({ onAddFiles }: { onAddFiles: (fileList: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <Root $isDragOver={isDragOver}
      onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => { event.preventDefault(); setIsDragOver(false); onAddFiles(Array.from(event.dataTransfer.files)); }}>
      <input type="file" multiple accept={ACCEPT_ATTRIBUTE} hidden onChange={(event) => { onAddFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
      <Icon><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f37321" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></svg></Icon>
      <Title>도면 파일을 끌어다 놓으세요</Title>
      <Hint>또는 클릭해서 선택 · 여러 파일 동시 가능</Hint>
      <FormatGrid>
        {FILE_FORMAT_GROUP_LIST.map((group) => (
          <Format key={group.name}><FormatName>{group.name}</FormatName><FormatExt>{group.extensionList.map((extension) => extension.toUpperCase()).join(' · ')}</FormatExt></Format>
        ))}
      </FormatGrid>
    </Root>
  );
}

const Root = styled.label<{ $isDragOver: boolean }>`
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; cursor: pointer;
  border: 1.5px dashed ${({ $isDragOver }) => ($isDragOver ? '#f37321' : 'rgba(243,115,33,.55)')};
  background: ${({ $isDragOver }) => ($isDragOver ? 'rgba(243,115,33,.12)' : 'rgba(10,8,6,.5)')};
  transition: background .2s; ${({ theme }) => cutCorner(theme.cut.lg)};
`;
const Icon = styled.div`width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(243,115,33,.7); transform: rotate(45deg); svg { transform: rotate(-45deg); }`;
const Title = styled.span`font-size: 30px; font-weight: 700;`;
const Hint = styled.span`font-size: 17px; color: ${({ theme }) => theme.color.inkSub};`;
const FormatGrid = styled.div`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; width: 640px;`;
const Format = styled.div`display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 1px solid rgba(243,115,33,.35); background: rgba(10,8,6,.55);`;
const FormatName = styled.span`font-size: 15px; font-weight: 700; color: ${({ theme }) => theme.color.primary};`;
const FormatExt = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 12px; line-height: 1.5; color: ${({ theme }) => theme.color.primarySoft};`;
