'use client';
import { useState } from 'react';
import styled from 'styled-components';
import { monoLabel, cutCorner } from '@/styles/mixins';

const DEVICE_LIST = ['PC · Chrome / Edge', 'Meta Quest 3 · 브라우저'];

/** 모바일 접근 안내 — PC에서 이용할 수 있음을 알리고 접속 주소를 복사할 수 있게 합니다 */
export function MobileGuideScreen() {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopyUrl = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/training`); setIsCopied(true); } catch { setIsCopied(false); }
  };
  return (
    <Root>
      <Badge>PC ONLY</Badge>
      <Title>PC에서 이용할 수 있습니다</Title>
      <Body>MR 조립 교육은 PC 또는 Meta Quest 3 브라우저에서 접속하세요.</Body>
      <DeviceList>{DEVICE_LIST.map((device) => <DeviceItem key={device}>{device}</DeviceItem>)}</DeviceList>
      <CopyButton type="button" onClick={handleCopyUrl}>{isCopied ? '주소 복사됨' : '접속 주소 복사'}</CopyButton>
    </Root>
  );
}

const Root = styled.main`position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 32px; text-align: center; background: #07090b; color: ${({ theme }) => theme.color.ink};`;
const Badge = styled.span`${monoLabel}; font-size: 12px; color: ${({ theme }) => theme.color.primary};`;
const Title = styled.h1`margin: 0; font-size: 26px; line-height: 1.3; font-weight: ${({ theme }) => theme.weight.bold};`;
const Body = styled.p`margin: 0; max-width: 340px; font-size: 16px; line-height: 1.6; color: ${({ theme }) => theme.color.inkSub}; text-wrap: pretty;`;
const DeviceList = styled.ul`margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;`;
const DeviceItem = styled.li`${monoLabel}; font-size: 13px; letter-spacing: .06em; color: ${({ theme }) => theme.color.primarySoft};`;
const CopyButton = styled.button`
  margin-top: 8px; min-height: 48px; padding: 0 22px; border: 1px solid ${({ theme }) => theme.color.primary}; background: rgba(243,115,33,.08);
  color: ${({ theme }) => theme.color.ink}; font: inherit; font-size: 15px; cursor: pointer; ${({ theme }) => cutCorner(theme.cut.sm)};
`;
