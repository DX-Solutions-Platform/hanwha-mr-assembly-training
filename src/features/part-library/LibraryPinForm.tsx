'use client';
import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { ActionButton, StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { ReviewInput, ReviewLabel } from '@/features/drawing-upload-dev/review/reviewStyles';
import { LIBRARY_URL } from './libraryTypes';

export function LibraryPinForm({ onUnlocked }: { onUnlocked: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError('');
    try {
      const response = await fetch(LIBRARY_URL + '/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCode('');
      onUnlocked();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '관리자 코드 확인에 실패했습니다.'); }
    finally { setIsBusy(false); }
  };
  return <Form onSubmit={submit}>
    <ReviewLabel htmlFor="part-library-code">관리자 코드</ReviewLabel>
    <ReviewInput id="part-library-code" type="password" inputMode="numeric" autoComplete="current-password" value={code} onChange={(event) => setCode(event.target.value)} maxLength={64} required autoFocus />
    {error && <StateText role="alert" $tone="danger">{error}</StateText>}
    <ActionButton $primary disabled={isBusy || !code}>{isBusy ? '확인 중' : '관리자 코드 확인'}</ActionButton>
  </Form>;
}
const Form = styled.form(({ theme }) => ({ display: 'grid', gap: theme.space[3] }));
