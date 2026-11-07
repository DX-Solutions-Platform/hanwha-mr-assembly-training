import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { appearanceSurface, type ModelAppearance } from '@/features/part-library/modelAppearance';
import { buildFlangeGeometry } from './buildFlangeGeometry';
import type { FlangeValues } from './flangeTypes';

export function FlangeMesh({ values, isWireframe, appearance }: { values: FlangeValues; isWireframe: boolean; appearance?: ModelAppearance }) {
  const { parameters } = values;
  const geometry = useMemo(() => buildFlangeGeometry({ parameters, part: { partNumber: '', name: '', material: '', quantity: '' } }), [parameters]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); return () => geometry.dispose(); }, [geometry, invalidate]);
  useEffect(() => { invalidate(); }, [isWireframe, appearance, invalidate]);
  return <mesh geometry={geometry}>
    <meshStandardMaterial {...appearanceSurface(appearance)} wireframe={isWireframe} />
  </mesh>;
}
