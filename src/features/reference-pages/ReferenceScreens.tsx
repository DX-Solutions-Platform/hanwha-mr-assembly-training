'use client';
import { useEffect, useState, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { loadReferenceThree } from '@/features/education-select/referenceThree';
import { ReferenceBoundary, type ReferenceProps } from './referenceRuntime';
const Drawing = dynamic(() => import('./generated/DrawingUploadReference'), { ssr: false });
const Cards = dynamic(() => import('./generated/TrainingMenuReference'), { ssr: false });
const Stool = dynamic(() => import('./generated/StoolTrainingReference'), { ssr: false });
const Complex = dynamic(() => import('./generated/ComplexExplodeReference'), { ssr: false });
const Hud = dynamic(() => import('./generated/HudPrototypeReference'), { ssr: false });
const Guide = dynamic(() => import('./generated/DesignGuideReference'), { ssr: false });
function ReferencePage({ component: Component, scroll = false, ...props }: ReferenceProps & { component: ComponentType<ReferenceProps>; scroll?: boolean; }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let active = true; void loadReferenceThree().then(() => { if (active) setReady(true); }).catch(console.error); return () => { active = false; }; }, []);
  return <ReferenceBoundary $scroll={scroll}>{ready && <Component {...props} />}</ReferenceBoundary>;
}
export function DrawingReferenceScreen() { return <ReferencePage component={Drawing} />; }
export function CardsReferenceScreen() { return <ReferencePage component={Cards} driveMenu />; }
export function StoolReferenceScreen() { return <ReferencePage component={Stool} />; }
export function ComplexReferenceScreen() { return <ReferencePage component={Complex} />; }
export function HudReferenceScreen({ cardIndex }: { cardIndex: number; }) { return <ReferencePage component={Hud} cardIndex={cardIndex} />; }
export function GuideReferenceScreen() { return <ReferencePage component={Guide} scroll />; }
