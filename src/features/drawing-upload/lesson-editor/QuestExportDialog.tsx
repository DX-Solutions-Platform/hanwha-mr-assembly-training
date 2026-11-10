'use client';

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ActionButton, Muted, StateText } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { paceDemoProgress } from './demoProgressTiming';
import { lessonText } from './lessonPreviewData';

type Training = { trainingId: string; contentVersion: string; title: unknown };
type Status = {
  pcName: string;
  addresses: string[];
  devices: { id: string; name: string; connected: boolean; trainings: Training[] }[];
};
const demoDeviceId = 'demo';
const errors: Record<string, string> = {
  DEVICE_NOT_CONNECTED: 'Quest 앱에서 PC 연결을 다시 확인한 후 등록해 주세요.',
  INVALID_PACKAGE: 'Quest에서 열 수 있는 교범 ZIP인지 확인해 주세요.',
  PACKAGE_TOO_LARGE: 'Quest에 등록할 ZIP은 200 MB 이하여야 합니다.',
  UPLOAD_IN_PROGRESS: '다른 교범을 등록 중입니다. 잠시 후 다시 시도해 주세요.',
  VERSION_CONFLICT: '같거나 더 높은 버전이 이미 있습니다. 더 높은 버전의 교범을 등록해 주세요.',
  CATALOG_LIMIT: '이 기기에 등록할 수 있는 교범 버전 수를 초과했습니다.',
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => undefined);
  if (!response.ok || !data) throw new Error(errors[data?.code] ?? data?.message ?? 'Quest 연결을 확인해 주세요.');
  return data;
}

export function QuestExportDialog({ demo, onClose, onDownload, onPublish }: {
  demo: boolean;
  onClose: () => void;
  onDownload: () => void;
  onPublish: (deliver: (zip: Blob) => Promise<Training>) => Promise<Training>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const registration = useRef<AbortController | null>(null);
  const [bridge, setBridge] = useState('');
  const [status, setStatus] = useState<Status>();
  const [statusFailed, setStatusFailed] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [selectedId, setSelectedId] = useState(demo ? demoDeviceId : '');
  const [pairing, setPairing] = useState<{ code: string; expires: number }>();
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const preview = demo && selectedId === demoDeviceId;
  const selected = preview ? undefined : (status?.devices.find(({ id }) => id === selectedId) ??
    status?.devices.find(({ connected }) => connected) ?? status?.devices[0]);

  useEffect(() => {
    const element = dialog.current!;
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | undefined;
    const { signal } = controller;
    element.showModal();
    async function check() {
      const { address } = await request<{ address: string }>('/api/quest-bridge', { method: 'POST', signal });
      if (signal.aborted) return;
      setBridge(address);
      async function refresh() {
        try {
          const result = await request<Status>(address + '/admin/status', { signal });
          if (!signal.aborted) { setStatus(result); setStatusFailed(false); }
        } catch {
          if (!signal.aborted) { setStatus(undefined); setStatusFailed(true); }
        }
      }
      await refresh();
      if (!signal.aborted) timer = setInterval(() => void refresh(), 4000);
    }
    void check().catch((error) => {
      if (!signal.aborted) setConnectionError(error instanceof Error ? error.message : 'Quest 연결을 확인해 주세요.');
    });
    return () => {
      controller.abort();
      registration.current?.abort();
      clearInterval(timer);
      element.close();
    };
  }, []);

  function selectDevice(id: string) {
    setSelectedId(id);
    setProgress(undefined);
    setFeedback(undefined);
  }

  async function pair() {
    setFeedback(undefined);
    try {
      setPairing(await request(bridge + '/admin/pairing', { method: 'POST' }));
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : '연결 코드를 만들 수 없습니다.', error: true });
    }
  }

  async function publish() {
    if ((!preview && !selected?.connected) || registration.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    registration.current = controller;
    setBusy(true);
    setFeedback(undefined);
    try {
      if (preview) {
        setProgress(3);
        const timing = paceDemoProgress(2500, signal, setProgress);
        try {
          timing.report(100);
          await timing.wait();
          signal.throwIfAborted();
          setProgress(100);
          setFeedback({ text: '교범 등록이 완료되었습니다.', error: false });
        } finally {
          timing.dispose();
        }
      } else if (selected) {
        const entry = await onPublish(async (zip) => {
          const result = await request<{ entry: Training }>(`${bridge}/admin/devices/${selected.id}/trainings`, {
            method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: zip, signal,
          });
          return result.entry;
        });
        setFeedback({ text: `교범 등록이 완료되었습니다. ${selected.name}에서 ${entry.contentVersion} 버전을 확인해 주세요.`, error: false });
        const refreshed = await request<Status>(bridge + '/admin/status', { signal }).catch(() => undefined);
        if (refreshed) setStatus(refreshed);
      }
    } catch (error) {
      if (!signal.aborted) setFeedback({ text: error instanceof Error ? error.message : '교범을 등록할 수 없습니다.', error: true });
    } finally {
      registration.current = null;
      if (!signal.aborted) setBusy(false);
    }
  }

  return <Dialog ref={dialog} aria-labelledby="quest-export-title" onCancel={(event) => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <header><h2 id="quest-export-title">교범 내보내기</h2><ActionButton disabled={busy} onClick={onClose}>닫기</ActionButton></header>
    <Content>
      <h3>Meta Quest 앱</h3>
      <Muted>Quest 앱에서 PC에 연결한 뒤, 기기를 선택하고 교범을 등록하세요.</Muted>
      {!bridge && !connectionError && <Muted role="status">실제 Quest 연결 서비스 확인 중…</Muted>}
      {connectionError && !preview && <StateText $tone="danger" role="alert">{connectionError}</StateText>}
      {bridge && !status && <Muted role="status">{statusFailed
        ? 'PC의 Quest 연결 서비스에 접속할 수 없습니다. 연결을 다시 확인하고 있습니다.'
        : '연결 정보를 불러오는 중입니다.'}</Muted>}
      {(status || demo) && <Panel>
        {status && <div className="pairing">
          <Muted>Quest와 PC를 같은 네트워크에 연결하세요. Quest 앱의 PC 연결에서 이 PC를 선택하거나 주소를 입력하세요.</Muted>
          <strong>{status.pcName}</strong>
          <div>{status.addresses.length ? status.addresses.join(' · ') : '이 PC의 사설 LAN 주소를 찾을 수 없습니다.'}</div>
          <ActionButton disabled={busy || !status.addresses.length} onClick={() => void pair()}>페어링 코드 받기</ActionButton>
          {pairing && <strong role="status">코드 {pairing.code} · 5분 동안 1회 사용</strong>}
        </div>}
        <h4>Quest 기기 선택</h4>
        {demo || status?.devices.length ? <div className="devices" role="group" aria-label="Quest 기기 선택">
          {demo && <ActionButton $primary={preview} aria-pressed={preview} disabled={busy}
            onClick={() => selectDevice(demoDeviceId)}>Meta Quest 3 · 등록 시연</ActionButton>}
          {status?.devices.map((device) => <ActionButton key={device.id} $primary={selected?.id === device.id}
            aria-pressed={selected?.id === device.id} disabled={busy} onClick={() => selectDevice(device.id)}>
            {device.name} · {device.connected ? '최근 앱 연결 확인' : '앱 연결 확인 필요'}
          </ActionButton>)}
        </div> : <Muted>아직 이 PC와 페어링된 Quest 앱이 없습니다.</Muted>}
        {selected && <>
          <h4>{selected.name}에 배포된 교범</h4>
          {selected.trainings.length ? <ul>{selected.trainings.map((item) => <li key={item.trainingId}>
            {lessonText(item.title, 'ko') || item.trainingId} · {item.contentVersion}
          </li>)}</ul> : <Muted>이 PC에서 등록한 교범이 없습니다.</Muted>}
        </>}
      </Panel>}
      {preview && <Muted>등록 시연 모드 · 실제 기기 전송 없이 진행합니다.</Muted>}
      {preview && progress !== undefined && <Progress>
        <Muted role="status">{progress === 100 ? '등록 시연 완료' : progress < 30 ? '교범 ZIP 준비 중…'
          : progress < 80 ? 'Quest 기기로 전송 중…' : '교범 목록 등록 확인 중…'}</Muted>
        <progress aria-label="Quest 교범 등록 시연 진행률" max={100} value={progress} />
        <span aria-hidden="true">{progress}%</span>
      </Progress>}
      {feedback && <StateText $tone={feedback.error ? 'danger' : 'success'} role={feedback.error ? 'alert' : 'status'}>
        {feedback.text}
      </StateText>}
    </Content>
    <footer>
      <ActionButton disabled={busy} onClick={onDownload}>PC에 ZIP 다운로드</ActionButton>
      <ActionButton $primary disabled={busy || (!preview && !selected?.connected)} onClick={() => void publish()}>
        {busy ? '교범 등록 중…' : 'Quest 기기 등록'}
      </ActionButton>
    </footer>
  </Dialog>;
}

const Dialog = styled.dialog(({ theme }) => ({
  width: 'min(700px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 32px)', overflow: 'auto', padding: 0,
  background: theme.color.panel, color: theme.color.ink, border: '1px solid ' + theme.color.primaryLine,
  '&::backdrop': { background: 'rgba(0,0,0,.72)' },
  '& > header, & > footer': { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: theme.space[3], padding: theme.space[4], flexWrap: 'wrap' },
  '& > header': { borderBottom: '1px solid ' + theme.color.primaryLineWeak },
  '& > footer': { borderTop: '1px solid ' + theme.color.primaryLineWeak, justifyContent: 'flex-end' },
  '& h2, & h3, & h4': { margin: 0 },
}));
const Content = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[3], padding: theme.space[4] }));
const Progress = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: theme.space[2], fontVariantNumeric: 'tabular-nums',
  '& > :first-child': { gridColumn: '1 / -1' },
  '& progress': { width: '100%', height: 8, appearance: 'none', border: 0, borderRadius: 8, overflow: 'hidden',
    '&::-webkit-progress-bar': { background: theme.color.primaryLineWeak },
    '&::-webkit-progress-value': { background: theme.color.primary },
    '&::-moz-progress-bar': { background: theme.color.primary } },
}));
const Panel = styled.div(({ theme }) => ({
  display: 'grid', gap: theme.space[3], padding: theme.space[4], background: theme.color.bgEdge,
  '& .pairing': { display: 'grid', gap: theme.space[2], justifyItems: 'start' },
  '& .devices': { display: 'flex', flexWrap: 'wrap', gap: theme.space[2] },
  '& ul': { margin: 0, paddingInlineStart: theme.space[4], maxHeight: 130, overflow: 'auto' },
}));
