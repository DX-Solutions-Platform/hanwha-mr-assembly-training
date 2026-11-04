'use client';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';
import { SectionTitle } from '@/components/common/SectionTitle';
import { DropZone } from './DropZone';
import { FileRow } from './FileRow';
import { getFormatGroupName } from '../fileFormats';

interface UploadPanelProps { fileList: File[]; onChangeFileList: (fileList: File[]) => void; productName: string; onChangeProductName: (name: string) => void; onStart: () => void; }

export function UploadPanel({ fileList, onChangeFileList, productName, onChangeProductName, onStart }: UploadPanelProps) {
  const handleAddFiles = (addedList: File[]) => {
    const validList = addedList.filter((file) => getFormatGroupName(file.name));
    if (!validList.length) return;
    onChangeFileList([...fileList, ...validList]);
    if (!productName) onChangeProductName(validList[0].name.replace(/\.[^.]+$/, ''));
  };
  return (
    <Layout>
      <DropZone onAddFiles={handleAddFiles} />
      <Side>
        <SectionTitle label="업로드 파일" count={fileList.length} />
        <List>
          {fileList.map((file, fileIndex) => <FileRow key={file.name + fileIndex} file={file} onRemove={() => onChangeFileList(fileList.filter((_, index) => index !== fileIndex))} />)}
          {!fileList.length && <Empty>아직 올린 파일이 없습니다.</Empty>}
        </List>
        <Field>
          <FieldLabel>제품 이름</FieldLabel>
          <NameInput value={productName} onChange={(event) => onChangeProductName(event.target.value)} placeholder="예: 스텝 스툴 BEKVÄM" />
        </Field>
        <CutButton $height={60} disabled={!fileList.length} onClick={onStart}>분석 시작</CutButton>
      </Side>
    </Layout>
  );
}

const Layout = styled.div`height: 100%; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 32px;`;
const Side = styled.div`display: flex; flex-direction: column; gap: 14px; min-height: 0;`;
const List = styled.div`flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px;`;
const Empty = styled.span`font-size: 15px; color: ${({ theme }) => theme.color.inkMuted};`;
const Field = styled.label`display: flex; flex-direction: column; gap: 10px;`;
const FieldLabel = styled.span`font-size: 13px; color: ${({ theme }) => theme.color.inkMuted};`;
const NameInput = styled.input`height: 52px; padding: 0 16px; background: rgba(10,8,6,.7); border: 1px solid ${({ theme }) => theme.color.primaryLine}; color: ${({ theme }) => theme.color.ink}; font: 400 17px/1 ${({ theme }) => theme.font.main}; outline: none; &:focus { border-color: ${({ theme }) => theme.color.primary}; }`;
