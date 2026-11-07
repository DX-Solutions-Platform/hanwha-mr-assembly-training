import { useMemo } from 'react';
import type { Matrix4 } from 'three';
import { theme } from '@/styles/theme';
import { assemblyPreviewMatrix } from './assemblyTransforms';
import type { AssemblyPart } from './assemblyTypes';
import type { LibraryAssemblyModel } from './loadLibraryAssemblyModel';

export function LibraryAssemblyInstance({ part, model, matrix, isSelected, isExploded, onSelect }: {
  part: AssemblyPart; model: LibraryAssemblyModel; matrix: Matrix4; isSelected: boolean; isExploded: boolean; onSelect: (id: string) => void;
}) {
  const object = useMemo(() => model.scene.clone(true), [model]);
  return <group matrixAutoUpdate={false} matrix={assemblyPreviewMatrix(part, matrix, isExploded)} onClick={(event) => {
    if (event.delta > 4) return;
    event.stopPropagation();
    onSelect(part.id);
  }}>
    <primitive object={object} dispose={null} />
    {isSelected && <mesh raycast={() => null}><boxGeometry args={model.size} /><meshBasicMaterial color={theme.color.primary} wireframe transparent opacity={.55} /></mesh>}
  </group>;
}
