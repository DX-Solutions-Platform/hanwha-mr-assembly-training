'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styled from 'styled-components';
import { registerHorizonElement } from '@/lib/horizonStore';
import { StarField } from './StarField';
import { TwinkleStarList } from './TwinkleStarList';
import { ShootingStarList } from './ShootingStarList';
import { PlanetRim } from './PlanetRim';
import { SunGlow } from './SunGlow';
import { CURVED_HORIZON_Y } from './backdropLayout';

const FLATTEN_MS = 1200;

interface HorizonBackdropProps { isFlat?: boolean; hasIntro?: boolean; }

/**
 * 우주 배경 (Horizon Bloom 오렌지 변형)
 * - 둥근 지구: 테두리 빛이 오른쪽 → 왼쪽으로 6초간 채워지고 해가 밝아짐
 * - isFlat: 지구가 평평해져 수평선이 되고, 이후 HorizonSync가 카메라에 맞춰 높이를 갱신
 */
export function HorizonBackdrop({ isFlat = false, hasIntro = true }: HorizonBackdropProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tracking, setTracking] = useState({ isFlat, isReady: false });
  if (tracking.isFlat !== isFlat) setTracking({ isFlat, isReady: false });

  useEffect(() => registerHorizonElement(rootRef.current), []);
  useEffect(() => {
    if (!isFlat) return;
    const timerId = setTimeout(() => setTracking({ isFlat, isReady: true }), FLATTEN_MS);
    return () => clearTimeout(timerId);
  }, [isFlat]);

  return (
    <Root ref={rootRef} style={{ '--horizon-y': `${CURVED_HORIZON_Y - 150}px` } as CSSProperties}>
      <StarField />
      <TwinkleStarList />
      <ShootingStarList />
      <PlanetRim isFlat={isFlat} isTracking={isFlat && tracking.isFlat && tracking.isReady} hasIntro={hasIntro} />
      <SunGlow isFlat={isFlat} hasIntro={hasIntro} />
    </Root>
  );
}

const Root = styled.div`position: absolute; inset: 0; overflow: hidden; background: linear-gradient(180deg, #020203 0%, #070505 60%, #120804 100%);`;
