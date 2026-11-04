'use client';
import styled from 'styled-components';
import { formatFileSize, getFormatGroupName } from '../fileFormats';

export function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <Root>
      <Type><Ext>{(file.name.split('.').pop() ?? '').toUpperCase().slice(0, 7)}</Ext><Group>{getFormatGroupName(file.name)}</Group></Type>
      <Info><Name>{file.name}</Name><Size>{formatFileSize(file.size)}</Size></Info>
      <Remove onClick={onRemove} aria-label="삭제">×</Remove>
    </Root>
  );
}

const Root = styled.div`display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid rgba(243,115,33,.35); background: rgba(10,8,6,.6);`;
const Type = styled.div`width: 74px; flex: none; display: flex; flex-direction: column; gap: 6px;`;
const Ext = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 12px; font-weight: 700; color: ${({ theme }) => theme.color.primary};`;
const Group = styled.span`font-size: 11px; color: ${({ theme }) => theme.color.inkSub};`;
const Info = styled.div`flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px;`;
const Name = styled.span`font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const Size = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 12px; color: ${({ theme }) => theme.color.inkMuted};`;
const Remove = styled.button`font-size: 18px; padding: 4px 6px; color: ${({ theme }) => theme.color.inkMuted}; &:hover { color: ${({ theme }) => theme.color.danger}; }`;
