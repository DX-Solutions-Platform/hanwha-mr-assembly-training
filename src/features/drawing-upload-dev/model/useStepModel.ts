'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readStep } from './readStep';
import type { StepModel, StepPhase, StepStatus } from './stepTypes';

export function useStepModel() {
  const [model, setModel] = useState<StepModel | null>(null);
  const [status, setStatus] = useState<StepStatus>('idle');
  const [phase, setPhase] = useState<StepPhase>('file');
  const [error, setError] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  const load = useCallback(async (file: File) => {
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    setStatus('running'); setPhase('file'); setError(''); setPendingName(file.name); setRetryFile(file);
    try {
      const next = await readStep(file, controller.signal, (nextPhase) => { if (!controller.signal.aborted) setPhase(nextPhase); });
      if (!controller.signal.aborted) { setModel(next); setSelectedId(null); setStatus('complete'); }
    } catch (reason) {
      if (!controller.signal.aborted) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'STEP을 읽지 못했습니다.'); }
    }
  }, []);
  const cancel = useCallback(() => { controllerRef.current?.abort(); setStatus('cancelled'); setError('STEP 읽기를 중지했습니다.'); }, []);
  return { model, status, phase, error, pendingName, selectedId, select: setSelectedId, load, cancel, retry: () => { if (retryFile) void load(retryFile); } };
}
