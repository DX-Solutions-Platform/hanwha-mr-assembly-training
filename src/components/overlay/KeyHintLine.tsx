'use client';
import styled from 'styled-components';
import { monoLabel } from '@/styles/mixins';

/** 조작 안내 한 줄 (오른쪽 아래) */
export function KeyHintLine({ hintList }: { hintList: string[] }) {
  return <Root data-passthrough>{hintList.map((hint) => <Hint key={hint}>{hint}</Hint>)}</Root>;
}

const Root = styled.div`position: absolute; right: 64px; bottom: 44px; display: flex; gap: 20px;`;
const Hint = styled.span`${monoLabel}; font-size: 13px; letter-spacing: .06em; color: ${({ theme }) => theme.color.inkMuted};`;
