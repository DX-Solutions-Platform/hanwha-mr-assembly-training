'use client';
import { useCallback, useEffect, useReducer } from 'react';
import { createIntroNavigation, INTRO_ENTER_MS, INTRO_EXIT_MS, introNavigationReducer } from './introNavigation';

export function useIntroNavigation(initialStep: number) {
  const [navigation, dispatch] = useReducer(introNavigationReducer, initialStep, createIntroNavigation);
  useEffect(() => {
    if (navigation.phase === 'idle') return;
    const isLeaving = navigation.phase === 'leaving';
    const timeout = window.setTimeout(() => dispatch({ type: isLeaving ? 'exitDone' : 'enterDone' }), isLeaving ? INTRO_EXIT_MS : INTRO_ENTER_MS);
    return () => window.clearTimeout(timeout);
  }, [navigation.phase, navigation.index]);
  const move = useCallback((delta: number) => {
    dispatch({ type: 'move', delta, isImmediate: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }, []);
  return { ...navigation, move };
}
