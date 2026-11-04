'use client';
import { Grid } from '@react-three/drei';

/** 바닥 눈금판 (회색 눈금) — 멀어질수록 사라져 수평선과 이어짐 */
export function InfiniteGrid() {
  return <Grid infiniteGrid cellSize={0.1} sectionSize={1} cellColor="#2b2f33" sectionColor="#5b6168" fadeDistance={40} fadeStrength={1.2} cellThickness={0.5} sectionThickness={0.8} />;
}
