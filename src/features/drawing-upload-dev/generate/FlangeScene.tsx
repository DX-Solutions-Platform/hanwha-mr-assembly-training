'use client';
import { OrbitControls } from '@react-three/drei';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { PreviewOutline } from '@/components/scene/PreviewOutline';
import { theme } from '@/styles/theme';
import { FlangeMesh } from './FlangeMesh';
import { FlangeCamera } from './FlangeCamera';
import type { FlangeValues } from './flangeTypes';
import type { ModelAppearance } from '@/features/part-library/modelAppearance';

export default function FlangeScene({ values, isWireframe, command, appearance }: { values: FlangeValues; isWireframe: boolean; command: number; appearance?: ModelAppearance }) {
  return <SceneCanvas frameloop="demand" resize={{ offsetSize: true }} camera={{ fov: 35, position: [150, -200, 250], up: [0, 0, 1], near: .01, far: 10000 }}>
    <ambientLight intensity={1.25} color={theme.color.ink} />
    <directionalLight position={[50, -80, 150]} intensity={2.5} color={theme.color.ink} />
    <directionalLight position={[-100, 50, 80]} intensity={1} color={theme.color.primarySoft} />
    <FlangeMesh values={values} isWireframe={isWireframe} appearance={appearance} />
    <OrbitControls makeDefault enableDamping />
    <FlangeCamera parameters={values.parameters} command={command} />
    <PreviewOutline color={appearance?.color} />
  </SceneCanvas>;
}
