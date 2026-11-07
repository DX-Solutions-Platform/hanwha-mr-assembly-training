'use client';
import { useEffect, useState } from 'react';
import { ProjectIntro } from './ProjectIntro';
import { StartScreen } from './StartScreen';

export function TrainingEntryScreen({ initialStep = 0, initialView = 'intro' }: { initialStep?: number; initialView?: 'intro' | 'start' }) {
  const [hasFinishedIntro, setHasFinishedIntro] = useState(initialView === 'start');
  useEffect(() => {
    if ((window as Window & { __hanwhaIntroKeyboard?: boolean }).__hanwhaIntroKeyboard) return;
    const script = document.createElement('script');
    script.src = '/intro-keyboard.js'; document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);
  return hasFinishedIntro
    ? <StartScreen onReplay={() => setHasFinishedIntro(false)} />
    : <ProjectIntro initialStep={initialStep} onFinish={() => setHasFinishedIntro(true)} />;
}
