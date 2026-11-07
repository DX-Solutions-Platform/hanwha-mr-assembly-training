export interface SourceRect { x: number; y: number; width: number; height: number; }
export interface TextToken { text: string; rect: SourceRect; rotation: number; method?: 'ocr'; confidence?: number; baseline?: number; }
export interface TextLine { text: string; rect: SourceRect; tokenList: TextToken[]; }
export interface Evidence { pageNumber: number; text: string; rect: SourceRect; method?: 'ocr' | 'mixed'; confidence?: number; }
export interface OcrPageInfo { engine: string; status: 'complete' | 'empty' | 'failed'; confidence: number; wordCount: number; lowConfidenceWordCount: number; error?: string; }
export interface PartRecord {
  id: string;
  kind: 'table' | 'code';
  item: string;
  partNumber: string;
  name: string;
  quantity: number | null;
  quantityText: string;
  material: string;
  specification: string;
  source: Evidence;
}
export interface DimensionRecord {
  id: string;
  kind: 'diameter' | 'radius' | 'thread' | 'angle' | 'tolerance' | 'length' | 'candidate';
  value: string;
  unit: string | null;
  unitSource: string | null;
  source: Evidence;
}
export interface DrawingPage {
  pageNumber: number;
  width: number;
  height: number;
  imageUrl: string;
  textCount: number;
  lineList: TextLine[];
  partList: PartRecord[];
  dimensionList: DimensionRecord[];
  unit: string | null;
  unitSource: string | null;
  warningList: string[];
  ocr?: OcrPageInfo;
}
export type TaskId = 'file' | 'render' | 'text' | 'ocr' | 'parts' | 'dimensions' | 'finish';
export interface AnalysisProgress { task: TaskId; completed: number; total: number; pageNumber?: number; ocr?: { stage: 'loading' | 'recognizing'; progress: number }; }
export type AnalysisStatus = 'idle' | 'loading' | 'running' | 'complete' | 'cancelled' | 'error';
export interface PdfAnalysisOptions { ocrMode?: 'auto' | 'force'; }
export type ResultTab = 'parts' | 'dimensions' | 'text';
export type UploadMode = 'analysis' | 'review' | 'model' | 'generate' | 'drawing-draft' | 'assembly' | 'library-assembly' | 'product' | 'product-draft';
export const DIMENSION_LABEL: Record<DimensionRecord['kind'], string> = {
  diameter: '지름', radius: '반지름', thread: '나사', angle: '각도',
  tolerance: '공차', length: '길이', candidate: '수치 후보',
};
