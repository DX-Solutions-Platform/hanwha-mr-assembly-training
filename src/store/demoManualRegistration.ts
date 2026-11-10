'use client';
import { useSyncExternalStore } from 'react';

export const NURI_MANUAL_ID = 'kslv2-nuri';
export const NURI_MANUAL_ZIP = 'kslv2-nuri_0.2.9.vrlesson.zip';
export const NURI_MANUAL_HREF = '/training/demo/textbook?registered=nuri';

const storageKey = 'dx_registered_nuri_manual';
const listeners = new Set<() => void>();
let registered = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getRegistered() {
  try { return registered || sessionStorage.getItem(storageKey) === '1'; }
  catch { return registered; }
}

export function registerNuriManual() {
  registered = true;
  try { sessionStorage.setItem(storageKey, '1'); } catch { /* Keep it available for this page session. */ }
  listeners.forEach((listener) => listener());
}

export function useRegisteredNuriManual() {
  return useSyncExternalStore(subscribe, getRegistered, () => false);
}
