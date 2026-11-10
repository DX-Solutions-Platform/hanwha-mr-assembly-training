import { useEffect, useState } from 'react';
import { readPracticeSceneCard, readPracticeTraySettings, type PracticeCardGeometry, type PracticeSceneCard, type PracticeTraySettings, type TrayPoint } from './practiceTrayLayout';

type TraySettings = Pick<PracticeTraySettings, 'positions' | 'trayOffsets'>;

export function usePracticeTrayLayout(modelId: string, enabled: boolean) {
  const [saved, setSaved] = useState<TraySettings>({ positions: {}, trayOffsets: {} });
  const [captions, setCaptions] = useState<PracticeTraySettings['captions']>({});
  const [cards, setCards] = useState<PracticeTraySettings['cards']>({});
  const [draft, setDraft] = useState<TraySettings | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const endpoint = `/api/practice-layout/${modelId}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { controller.abort(); setStatus('error'); }, 5000);
    void fetch(endpoint, { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Load failed');
      const settings = readPracticeTraySettings(await response.json());
      if (!settings) throw new Error('Invalid layout');
      if (!controller.signal.aborted) {
        setSaved({ positions: settings.positions, trayOffsets: settings.trayOffsets });
        setCaptions(settings.captions);
        setCards(settings.cards);
        setStatus('ready');
      }
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('error');
    }).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [enabled, endpoint, loadAttempt]);

  function begin() { setMessage(''); setDraft(saved); }
  function cancel() { setMessage(''); setDraft(null); }
  function moveTray(key: string, point: TrayPoint) {
    setDraft((current) => {
      const settings = current ?? saved;
      return { ...settings, trayOffsets: { ...settings.trayOffsets, [key]: point } };
    });
    setMessage('');
  }
  function movePart(key: string, point: TrayPoint) {
    setDraft((current) => {
      const settings = current ?? saved;
      return { ...settings, positions: { ...settings.positions, [key]: point } };
    });
    setMessage('');
  }
  function resetTray(key: string, partKeys: readonly string[]) {
    setDraft((current) => {
      const settings = current ?? saved;
      const trayOffsets = { ...settings.trayOffsets };
      const positions = { ...settings.positions };
      delete trayOffsets[key];
      for (const part of partKeys) delete positions[part];
      return { positions, trayOffsets };
    });
    setMessage('');
  }
  function retry() { setStatus('loading'); setLoadAttempt((attempt) => attempt + 1); }

  async function save() {
    if (!draft || saving) return false;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft) });
      if (!response.ok) throw new Error('Save failed');
      setSaved(draft);
      setDraft(null);
      setMessage('이 STEP의 박스와 부품 배치를 저장했습니다.');
      return true;
    } catch {
      setMessage('배치를 저장하지 못했습니다. 화면에 있는 배치를 다시 저장할 수 있습니다.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveCaption(key: string, text: string) {
    try {
      const response = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, text }) });
      if (!response.ok) return false;
      setCaptions((current) => ({ ...current, [key]: text }));
      return true;
    } catch { return false; }
  }

  async function writeCard(key: string, id: string, change: { card: PracticeSceneCard | null; keepGeometry?: boolean } | { geometry: PracticeCardGeometry }) {
    try {
      const response = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, id, ...change }) });
      if (!response.ok) return false;
      const result = await response.json();
      if (result.key !== key || result.id !== id) return false;
      const card = readPracticeSceneCard(result.card);
      if (!card && result.card !== null) return false;
      setCards((current) => {
        const stage = { ...current[key] };
        if (card) stage[id] = card;
        else delete stage[id];
        return { ...current, [key]: stage };
      });
      return true;
    } catch { return false; }
  }

  function saveCard(key: string, id: string, card: PracticeSceneCard | null, keepGeometry = false) {
    return writeCard(key, id, { card, keepGeometry });
  }

  function adjustCard(key: string, id: string, geometry: PracticeCardGeometry) {
    return writeCard(key, id, { geometry });
  }

  return { ...(draft ?? saved), captions, cards, editing: draft !== null, status, saving, message, setMessage, begin, cancel, moveTray, movePart, resetTray, retry, save, saveCaption, saveCard, adjustCard };
}
