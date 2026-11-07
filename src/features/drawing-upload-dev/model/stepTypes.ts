export const STEP_IMPORTER = 'occt-import-js@0.0.23/mesh-v1';
export const STEP_FILE_ACCEPT = '.step,.stp';
export const STEP_MAX_FILE_MB = 25;
export type VectorTuple = [number, number, number];
export interface StepPick { point: VectorTuple; normal: VectorTuple; }
export interface StepBounds { min: VectorTuple; max: VectorTuple; }
export interface StepNode { name: string; meshes: number[]; children: StepNode[]; }
export interface StepMesh {
  name: string; color: VectorTuple | null;
  position: Float32Array; index: Uint32Array; normal: Float32Array | null;
  origin: VectorTuple; bounds: StepBounds;
}
export interface StepShape {
  id: string; name: string; path: string; meshIndex: number;
  triangleCount: number; bounds: StepBounds;
}
export interface StepManifest {
  sha256: string; name: string; size: number; importer: typeof STEP_IMPORTER;
  unit: 'mm'; shapeList: StepShape[];
}
export interface StepModel { manifest: StepManifest; root: StepNode; meshList: StepMesh[]; bounds: StepBounds; }
export interface ModelLink { partKey: string; shapeId: string; }
export interface ReviewModelData { model: StepManifest | null; modelLinks: ModelLink[]; }
export type StepPhase = 'file' | 'engine' | 'convert' | 'geometry';
export type StepStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled';
