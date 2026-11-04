export type Vec3 = [number, number, number];
export type ShapeKind = 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus' | 'capsule';
export type MaterialKey =
  | 'steel' | 'darkSteel' | 'aluminum' | 'paintBlue' | 'paintOrange' | 'paintWhite' | 'rubber' | 'copper'
  | 'glass' | 'wood' | 'woodDark' | 'plastic' | 'pcb' | 'carbon' | 'battery';

/** 반복 부품(볼트·블레이드·좌석 등)은 InstancedMesh 1개로 그려 부하를 줄입니다 */
export interface RepeatSpec { count: number; mode: 'ring' | 'line' | 'grid'; radius?: number; axis?: 'x' | 'y' | 'z'; step?: Vec3; columns?: number; rowStep?: Vec3; }

/**
 * 크기 규칙
 * box [가로, 높이, 깊이] · cylinder [윗반지름, 아랫반지름, 높이] · cone [반지름, 높이]
 * sphere [반지름] · torus [반지름, 두께] · capsule [반지름, 길이]
 * repeat의 step은 부품 회전이 적용된 로컬 좌표 기준입니다.
 */
export interface PartSpec {
  name: string; spec?: string; sectionIndex: number; shape: ShapeKind; size: number[];
  position: Vec3; rotation?: Vec3; scale?: Vec3; material: MaterialKey; repeat?: RepeatSpec;
  /** 지정하면 자동 계산 대신 이 방향으로 펼쳐짐 */
  explode?: Vec3;
}

export interface SectionSpec { code: string; name: string; summary: string; cardIndex: number; explode?: Vec3; }
export interface ExteriorSpec { name: string; anchor: Vec3; }

export interface ModelSpec {
  id: string;
  /** diagonal: 세로로 긴 제품(유압 펌프) · radial: 중심에서 사방으로(차량·드론) */
  explodeMode: 'diagonal' | 'radial';
  explodeScale: number;
  viewDistance: number;
  sectionList: SectionSpec[];
  partList: PartSpec[];
  exteriorList?: ExteriorSpec[];
}
