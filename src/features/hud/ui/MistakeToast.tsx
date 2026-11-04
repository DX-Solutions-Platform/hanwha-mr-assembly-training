'use client';
import styled from 'styled-components';

/** 실수 피드백 · 과체결 경고 (빨간 테두리 + 짧은 이유) */
export function MistakeToast({ message }: { message: string | null }) {
  if (!message) return null;
  return <Root role="alert">{message}</Root>;
}

const Root = styled.div`position: absolute; left: 50%; top: 820px; transform: translateX(-50%); z-index: 90; padding: 14px 22px; font-size: 18px; font-weight: 700; color: #fff; background: rgba(60,10,16,.85); border: 1.5px solid ${({ theme }) => theme.color.danger}; box-shadow: 0 0 24px rgba(255,90,106,.4);`;
