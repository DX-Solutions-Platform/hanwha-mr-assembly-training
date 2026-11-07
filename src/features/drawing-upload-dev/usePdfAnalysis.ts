'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzePdf } from './analyzePdf';
import type { AnalysisProgress, AnalysisStatus, DrawingPage, PdfAnalysisOptions } from './types';

export function usePdfAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pageList, setPageList] = useState<DrawingPage[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState<AnalysisProgress>({ task: 'file', completed: 0, total: 0 });
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [ocrMode, setOcrMode] = useState<'auto' | 'force'>('auto');
  const controllerRef = useRef<AbortController | null>(null);
  const urlSet = useRef(new Set<string>());
  const startedRef = useRef(0);
  const releaseImages = useCallback(() => { urlSet.current.forEach((url) => URL.revokeObjectURL(url)); urlSet.current.clear(); }, []);
  useEffect(() => () => { controllerRef.current?.abort(); releaseImages(); }, [releaseImages]);
  useEffect(() => {
    if (status !== 'running' && status !== 'loading') return;
    const id = window.setInterval(() => setElapsedMs(performance.now() - startedRef.current), 250);
    return () => window.clearInterval(id);
  }, [status]);

  const execute = useCallback(async (controller: AbortController, sourceFile: File, options: PdfAnalysisOptions) => {
    if (controller.signal.aborted) return;
    setFile(sourceFile); setStatus('running');
    const originalUrl = URL.createObjectURL(new Blob([sourceFile], { type: 'application/pdf' }));
    urlSet.current.add(originalUrl); setSourceUrl(originalUrl);
    try {
      await analyzePdf(sourceFile, controller.signal,
        (next) => { if (!controller.signal.aborted) setProgress(next); },
        (page) => {
          if (controller.signal.aborted) { URL.revokeObjectURL(page.imageUrl); return; }
          urlSet.current.add(page.imageUrl); setPageList((list) => [...list, page]);
        }, options);
      if (!controller.signal.aborted) { setStatus('complete'); setElapsedMs(performance.now() - startedRef.current); }
    } catch (reason) {
      if (controller.signal.aborted) return;
      const message = reason instanceof Error ? reason.message : 'PDF를 읽지 못했습니다.';
      setError(/password/i.test(message) ? '암호가 설정된 PDF입니다. 암호를 해제한 사본을 선택해 주세요.' : /invalid pdf|missing pdf/i.test(message) ? '손상되었거나 읽을 수 없는 PDF입니다. 원본 파일을 다시 선택해 주세요.' : message);
      setStatus('error'); setElapsedMs(performance.now() - startedRef.current);
    }
  }, []);

  const begin = useCallback(() => {
    controllerRef.current?.abort(); releaseImages();
    const controller = new AbortController(); controllerRef.current = controller;
    startedRef.current = performance.now();
    setFile(null); setSourceUrl(null); setPageList([]); setError(''); setElapsedMs(0);
    setProgress({ task: 'file', completed: 0, total: 0 });
    return controller;
  }, [releaseImages]);
  const start = useCallback((sourceFile: File, options: PdfAnalysisOptions = {}) => {
    const controller = begin(); setOcrMode(options.ocrMode ?? 'auto'); void execute(controller, sourceFile, options);
  }, [begin, execute]);
  const cancel = useCallback(() => {
    controllerRef.current?.abort(); setStatus('cancelled'); setElapsedMs(performance.now() - startedRef.current);
  }, []);
  return { file, sourceUrl, pageList, status, progress, error, elapsedMs, ocrMode, start, cancel };
}
