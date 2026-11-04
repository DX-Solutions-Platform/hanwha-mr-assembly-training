'use client';
import { useState } from 'react';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';

const PREVIEW_MODE_LIST = [['built', '완성'], ['explode', '분해'], ['sections', '구간']] as const;

/** 완성품 미리보기 (완성/분해/구간) → 교육 시작하기 */
export function PreviewModeBar({ onStart }: { onStart: () => void }) {
  const [previewMode, setPreviewMode] = useState<string>('built');
  return (
    <Root>
      <Segment>
        {PREVIEW_MODE_LIST.map(([modeKey, modeLabel]) => <Item key={modeKey} $isOn={previewMode === modeKey} onClick={() => setPreviewMode(modeKey)}>{modeLabel}</Item>)}
      </Segment>
      <CutButton $height={56} onClick={onStart}>교육 시작하기</CutButton>
    </Root>
  );
}

const Root = styled.div`position: absolute; left: 50%; bottom: 80px; transform: translateX(-50%); display: flex; gap: 16px; z-index: 40;`;
const Segment = styled.div`display: flex; border: 1px solid rgba(243,115,33,.45);`;
const Item = styled.button<{ $isOn: boolean }>`height: 54px; padding: 0 24px; font-size: 16px; background: ${({ $isOn }) => ($isOn ? 'rgba(243,115,33,.25)' : 'rgba(10,8,6,.55)')}; font-weight: ${({ $isOn }) => ($isOn ? 700 : 400)};`;
