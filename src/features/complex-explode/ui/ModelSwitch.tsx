'use client';
import styled from 'styled-components';
import { cutCorner } from '@/styles/mixins';
import type { ComplexModelId } from '../state/complexReducer';

const MODEL_OPTION_LIST: { modelId: ComplexModelId; label: string }[] = [{ modelId: 'airliner', label: '여객기' }, { modelId: 'smartphone', label: '스마트폰' }];

/** 모델 전환 (오른쪽 위) */
export function ModelSwitch({ modelId, onChange }: { modelId: ComplexModelId; onChange: (modelId: ComplexModelId) => void }) {
  return (
    <Root>
      {MODEL_OPTION_LIST.map((option) => (
        <Option key={option.modelId} type="button" $isActive={option.modelId === modelId} onClick={() => onChange(option.modelId)}>{option.label}</Option>
      ))}
    </Root>
  );
}

const Root = styled.div`position: absolute; right: 64px; top: 52px; display: flex; gap: 8px;`;
const Option = styled.button<{ $isActive: boolean }>`
  height: 48px; padding: 0 22px; cursor: pointer; font: inherit; font-size: 16px; color: ${({ theme }) => theme.color.ink}; ${({ theme }) => cutCorner(theme.cut.sm)};
  background: ${({ $isActive }) => ($isActive ? 'rgba(243,115,33,.24)' : 'rgba(10,8,6,.55)')};
  border: 1px solid ${({ $isActive, theme }) => ($isActive ? theme.color.primary : theme.color.primaryLine)};
  font-weight: ${({ $isActive, theme }) => ($isActive ? theme.weight.bold : theme.weight.regular)};
`;
