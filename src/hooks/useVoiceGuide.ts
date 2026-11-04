'use client';
import { useCallback, useEffect, useState } from 'react';

export function useVoiceGuide() {
  const [isVoiceOn, setIsVoiceOn] = useState(true);
  const speak = useCallback((text: string) => {
    if (!isVoiceOn || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ko-KR'; utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [isVoiceOn]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return { isVoiceOn, toggleVoice: () => setIsVoiceOn((value) => !value), speak };
}
