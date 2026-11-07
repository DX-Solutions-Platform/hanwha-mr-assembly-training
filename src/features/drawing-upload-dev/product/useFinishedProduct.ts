import { useEffect, useState } from 'react';
import { readFinishedProduct, saveFinishedProduct, type FinishedProduct, type FinishedProductChange } from './finishedProductStore';

export function useFinishedProduct(hash: string | undefined) {
  const [state, setState] = useState<{ hash: string; record: FinishedProduct | null; error?: string } | null>(null);
  useEffect(() => {
    if (!hash) return;
    let active = true;
    void readFinishedProduct(hash).then((record) => {
      if (active) setState({ hash, record });
    }).catch(() => {
      if (active) setState({ hash, record: null, error: '브라우저에서 완제품 기록을 읽지 못했습니다.' });
    });
    return () => { active = false; };
  }, [hash]);
  const current = hash && state?.hash === hash ? state : null;
  const save = async (change: FinishedProductChange) => {
    if (!hash || !current || current.error) throw new Error('완제품 저장소를 열 수 없습니다.');
    const record = await saveFinishedProduct(hash, change);
    setState((previous) => previous?.hash === hash ? { hash, record } : previous);
  };
  return { record: current?.record ?? null, ready: !!current, error: current?.error, save };
}
