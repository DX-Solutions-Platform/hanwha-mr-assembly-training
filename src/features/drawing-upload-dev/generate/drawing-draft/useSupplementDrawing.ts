import { useEffect, useRef, useState } from 'react';
import { analyzePdf } from '../../analyzePdf';
import type { DrawingPage } from '../../types';

interface Supplement { name: string; pages: DrawingPage[]; url: string; }
const release = (source: Supplement) => { source.pages.forEach((page) => URL.revokeObjectURL(page.imageUrl)); URL.revokeObjectURL(source.url); };

export function useSupplementDrawing() {
  const [source, setSource] = useState<Supplement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<Supplement | null>(null), request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); if (current.current) release(current.current); }, []);
  const load = async (file: File) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const next: Supplement = { name: file.name, pages: [], url: URL.createObjectURL(file) };
    setLoading(true); setError('');
    try {
      await analyzePdf(file, controller.signal, () => {}, (page) => next.pages.push(page));
      controller.signal.throwIfAborted();
      if (current.current) release(current.current);
      current.current = next; setSource(next);
      return true;
    } catch (reason) {
      release(next);
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '보조 치수 도면을 읽지 못했습니다.');
      return false;
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };
  return { source, loading, error, load };
}
