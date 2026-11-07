export type AssemblyKind = 'base' | 'flange' | 'bolt' | 'nut' | 'other';
export type Triple = [number, number, number];
export type TextTriple = [string, string, string];
export type ConnectionType = 'free' | 'fixed' | 'insert' | 'thread';
export interface AssemblyRelation { type: ConnectionType; parentId: string | null; targetAnchorId: string | null; ownAnchorId: string; }
export interface AssemblyModelRef { key: string; revision: string; size: Triple; }
export interface AssemblyPart { id: string; name: string; partNumber: string; kind: AssemblyKind; position: Triple; rotation: Triple; relation: AssemblyRelation; model?: AssemblyModelRef; }
export const LIBRARY_ASSEMBLY_ID = 'pdf-library-v1';
export interface AssemblyDocument {
  format: 'hanwha-assembly'; schemaVersion: 1; templateId: 'flange-base-m8-v1' | typeof LIBRARY_ASSEMBLY_ID;
  drawingSha256?: string;
  name: string; unit: 'mm'; angleUnit: 'deg'; updatedAt: string; partList: AssemblyPart[];
}
export interface AssemblyDraft { position: TextTriple; rotation: TextTriple; relation: AssemblyRelation; }
export interface AssemblyAnchor { id: string; label: string; position: Triple; }
export const CONNECTION_LIST: { value: ConnectionType; label: string }[] = [
  { value: 'free', label: '자유 배치' }, { value: 'fixed', label: '고정 결합' },
  { value: 'insert', label: '구멍에 삽입' }, { value: 'thread', label: '볼트에 너트 체결' },
];
export const KIND_LABEL: Record<AssemblyKind, string> = { base: '베이스판', flange: '플랜지', bolt: '볼트', nut: '너트', other: '부품' };
