'use client';
import { useState } from 'react';
import { Muted, StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { LIBRARY_URL, type LibraryPartInput } from './libraryTypes';
import { LibraryDialog } from './LibraryDialog';
import { LibraryPinForm } from './LibraryPinForm';
import { LibraryToggle } from './libraryStyles';

export function LibraryPublishDialog({ parts, onClose }: { parts: LibraryPartInput[]; onClose: () => void }) {
  const [needsCode, setNeedsCode] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const register = async () => {
    setIsBusy(true); setError('');
    let saved = 0, skipped = 0;
    try {
      for (let index = 0; index < parts.length; index += 100) {
        const response = await fetch(LIBRARY_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parts: parts.slice(index, index + 100) }),
        });
        if (response.status === 401) { setNeedsCode(true); return; }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        saved += data.saved;
        skipped += data.skipped;
      }
      setResult('등록 ' + saved + '종 · 기존 등록 ' + skipped + '종');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '라이브러리에 저장하지 못했습니다.';
      setError((saved ? saved + '종을 저장했습니다. ' : '') + message);
    } finally { setIsBusy(false); }
  };
  return <LibraryDialog title="확정 부품 라이브러리에 등록" onClose={onClose}>
    <p>부품번호와 품명이 확인된 {parts.length}종을 승인 상태로 등록합니다.</p>
    <Muted>같은 부품번호가 이미 있으면 기존 정보를 사용합니다. 수량은 도면별로 관리합니다.</Muted>
    {needsCode ? <LibraryPinForm onUnlocked={() => { setNeedsCode(false); void register(); }} />
      : result ? <><StateText role="status" $tone="success">{result}</StateText><LibraryToggle as="a" href="/part-library" $active>부품 라이브러리 열기</LibraryToggle></>
      : <LibraryToggle $primary disabled={isBusy} onClick={() => void register()}>{isBusy ? '등록 중' : '등록하기'}</LibraryToggle>}
    {error && <StateText role="alert" $tone="danger">{error}</StateText>}
  </LibraryDialog>;
}
