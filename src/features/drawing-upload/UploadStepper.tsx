'use client';
import styled from 'styled-components';

const STAGE_NAME_LIST = ['도면 업로드', 'AI 분석 · 3D 모델 생성', '검토 · 교육 생성'];

export function UploadStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <Root>
      {STAGE_NAME_LIST.map((stageName, stageIndex) => (
        <Item key={stageName} $state={stageIndex < activeIndex ? 'done' : stageIndex === activeIndex ? 'active' : 'idle'}>
          <Bar />
          <span>{String(stageIndex + 1).padStart(2, '0')} · {stageName}</span>
        </Item>
      ))}
    </Root>
  );
}

const Root = styled.div`position: absolute; left: 64px; top: 206px; width: 1792px; display: flex; gap: 8px;`;
const Bar = styled.div`height: 3px;`;
const Item = styled.div<{ $state: 'done' | 'active' | 'idle' }>`
  flex: 1; display: flex; flex-direction: column; gap: 10px; font-size: 16px;
  font-weight: ${({ $state }) => ($state === 'active' ? 700 : 400)};
  color: ${({ theme, $state }) => ($state === 'active' ? theme.color.primary : $state === 'done' ? theme.color.success : theme.color.inkDisabled)};
  ${Bar} { background: ${({ $state }) => ($state === 'idle' ? 'rgba(243,115,33,.2)' : '#f37321')}; box-shadow: ${({ $state }) => ($state === 'active' ? '0 0 8px rgba(243,115,33,.8)' : 'none')}; }
`;
