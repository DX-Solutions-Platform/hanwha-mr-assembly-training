'use client';

import { loadReferenceThree } from '@/features/education-select/referenceThree';
import { PortedLogic, type ReferenceProps } from '@/features/reference-pages/referenceRuntime';
import { analyzePdf } from '@/features/drawing-upload-dev/analyzePdf';
import { readStep } from '@/features/drawing-upload-dev/model/readStep';
import { lookupLibraryNumbers } from '@/features/drawing-upload-dev/review/libraryReview';
import type { VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';
import type { DrawingPage } from '@/features/drawing-upload-dev/types';
import { normalizeLibraryNumber, type LibraryMatch } from '@/features/part-library/libraryTypes';
import { cloneFlowProject, fromStepModel, type FlowProject, type FlowStep } from './flowProject';
import { captureFastenerGeometry } from './flowFastenerContacts';
import { classifyFlowSteps, flowGeometryKey, rememberFlowStepActions, type CatalogPart } from './flowStepClassification';
import { saveFlowTraining } from './flowTrainingStore';

export interface FlowSession {
  project?: FlowProject;
  plan?: FlowStep[][];
  readSteps?: () => FlowStep[][] | undefined;
}

export interface DrawingFlowProps extends ReferenceProps {
  session: FlowSession;
  start?: number;
  tools?: boolean;
  onOpenSteps?: (tools: boolean | null) => void;
  onNavigate?: (screen: number) => void;
  onTraining?: (project: FlowProject) => void;
}

interface FlowAssets {
  FLOW_DATA: { shaper: FlowProject };
  PartLib7: { seed(): CatalogPart[] };
}

let assetLoad: Promise<FlowAssets> | undefined;
function loadScript(name: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/drawing-flow/' + name + '.js';
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); reject(new Error('3D 자료를 불러오지 못했습니다.')); };
    document.head.appendChild(script);
  });
}

export function loadFlowAssets() {
  assetLoad ??= (async () => {
    await loadReferenceThree();
    await loadScript('flow-engine');
    await loadScript('flow-train');
    await loadScript('flow-data');
    await loadScript('shaper-hq');
    await loadScript('shaper-full');
    await loadScript('shaper-tex');
    await loadScript('part-library7');
    return window as unknown as FlowAssets;
  })();
  return assetLoad;
}

export const escapeFlowHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

const stepPhases = { file: 1, engine: 2, convert: 3, geometry: 6 };
const flowStepMaxMb = 50;

export class FlowLogic extends PortedLogic<DrawingFlowProps> {
  declare E?: { suspended: boolean };
  declare pr?: FlowProject;
  declare go: (screen: number) => void;
  declare loadFlowProject: (project: FlowProject) => void;
  declare bootP?: Promise<void>;
  protected demo = false;
  private file?: File;
  private stepJob?: AbortController;
  private pdfJob?: AbortController;
  private pdfPages: DrawingPage[] = [];
  private closed = false;
  private contactGeometry?: { project: FlowProject; geometry: ReturnType<typeof captureFastenerGeometry> };

  flowKey(name: string) {
    return 'hanwha-drawing-flow.v1.' + (this.props.session.project?.key ?? 'sample') + '.' + name;
  }

  rememberStepActions(plan: FlowStep[][]) {
    if (this.pr) rememberFlowStepActions(this.pr, plan);
  }

  protected getFlowContactGeometry() {
    const project = this.pr;
    const { THREE } = window as unknown as { THREE?: Parameters<typeof captureFastenerGeometry>[0] };
    if (!project || !THREE) return;
    if (this.contactGeometry?.project === project) return this.contactGeometry.geometry;
    type BuiltPiece = FlowProject['pieces'][number] & Omit<Parameters<typeof captureFastenerGeometry>[1][number], 'hardware'>;
    const pieces = project.pieces as BuiltPiece[];
    if (pieces.some(piece => !piece.obj || !piece.home || !piece.q)) return;
    const geometry = captureFastenerGeometry(THREE, pieces.map(piece => {
      const part = project.parts[piece.part];
      return { obj: piece.obj, home: piece.home, q: piece.q, hardware: !!(part?.fastenerPart ?? part?.std) };
    }));
    this.contactGeometry = { project, geometry };
    return geometry;
  }

  openFlow() { this.closed = false; }

  setFlowTrainingActive(active: boolean) {
    if (this.E) this.E.suspended = active;
  }

  async flowSample() {
    await this.bootP;
    if (this.closed) return;
    this.file = undefined;
    this.demo = true;
    const sample = (await loadFlowAssets()).FLOW_DATA.shaper;
    this.loadFlowProject({ ...sample, key: 'shaper-reference', ko: '소형 금속 성형기', code: 'DX-ASM-SHP-001' });
    const files = this.files().filter((entry) => entry.kind === 'PDF');
    this.updateReferenceState({ files: [{ name: '소형 금속 성형기 · 시연 모델', size: 0, kind: 'STEP' }, ...files], ferr: '' });
  }

  private files() {
    return this.referenceState.files as { name: string; size: number; kind: 'STEP' | 'PDF' }[];
  }

  async pickFlowFiles(list: File[]) {
    if (this.stepJob || !list.length) return;
    const step = list.filter((file) => /\.(?:step|stp)$/i.test(file.name));
    const pdf = list.filter((file) => /\.pdf$/i.test(file.name));
    if (step.length > 1 || pdf.length > 1 || step.length + pdf.length !== list.length) {
      this.updateReferenceState({ ferr: 'STEP과 PDF를 각각 한 파일씩 선택해 주세요.' });
      return;
    }
    if (step[0]?.size > flowStepMaxMb * 1024 * 1024) {
      this.updateReferenceState({ ferr: flowStepMaxMb + ' MB 이하의 STEP 파일을 선택해 주세요.' });
      return;
    }
    if (pdf[0]?.size > 50 * 1024 * 1024) {
      this.updateReferenceState({ ferr: '50 MB 이하의 PDF 파일을 선택해 주세요.' });
      return;
    }
    const files = this.files().filter(({ kind }) => (kind === 'STEP' ? !step.length : !pdf.length));
    if (step.length) {
      this.file = step[0];
      this.demo = false;
      files.unshift({ name: this.file.name, size: this.file.size, kind: 'STEP' });
    }
    if (pdf.length) files.push({ name: pdf[0].name, size: pdf[0].size, kind: 'PDF' });
    this.updateReferenceState({ files, ferr: '', ...(step.length ? { visited: 0, plan: null } : {}) });
    if (pdf.length) await this.readFlowPdf(pdf[0]);
  }

  private clearFlowPdf() {
    this.pdfJob?.abort();
    this.pdfJob = undefined;
    this.pdfPages.forEach((page) => URL.revokeObjectURL(page.imageUrl));
    this.pdfPages = [];
  }

  private async readFlowPdf(file: File) {
    this.clearFlowPdf();
    const job = new AbortController();
    this.pdfJob = job;
    this.updateReferenceState({ loading: true, pages: [], npg: 0, pdfInfo: '' });
    try {
      await analyzePdf(file, job.signal, () => {}, (page) => this.pdfPages.push(page));
      const rows = this.pdfPages.reduce((total, page) => total + page.partList.filter((part) => part.kind === 'table').length, 0);
      const dimensions = this.pdfPages.reduce((total, page) => total + page.dimensionList.filter((item) => item.kind !== 'candidate').length, 0);
      this.updateReferenceState({
        loading: false, pages: this.pdfPages.map((page) => page.imageUrl), npg: this.pdfPages.length,
        pdfInfo: this.pdfPages.length + '쪽 · 부품표 ' + rows + '행 · 치수 표기 ' + dimensions + '개',
      });
    } catch (error) {
      if (job.signal.aborted) return;
      this.clearFlowPdf();
      this.updateReferenceState({
        loading: false, files: this.files().filter(({ kind }) => kind !== 'PDF'),
        ferr: error instanceof Error ? error.message : 'PDF를 읽지 못했습니다.',
      });
    } finally {
      if (this.pdfJob === job) this.pdfJob = undefined;
    }
  }

  removeFlowFile(index: number) {
    const files = this.files().slice();
    const removed = files.splice(index, 1)[0];
    if (removed?.kind === 'STEP') {
      this.file = undefined;
      this.demo = false;
    }
    if (removed?.kind === 'PDF') {
      this.clearFlowPdf();
      this.updateReferenceState({ pages: [], npg: 0, loading: false, pdfInfo: '' });
    }
    this.updateReferenceState({ files, ferr: '' });
  }

  cancelStepRead() {
    this.stepJob?.abort();
    this.stepJob = undefined;
    this.go(-1);
  }

  async startFlowStep() {
    const file = this.file;
    if (this.stepJob || this.referenceState.loading || (!file && !this.demo)) return;
    this.go(1);
    if (!file) return;
    const job = new AbortController();
    this.stepJob = job;
    const started = performance.now();
    const timer = this.repeat(() => this.updateReferenceState({ readMs: performance.now() - started }), 250);
    try {
      await this.bootP;
      const model = await readStep(file, job.signal, (phase) => this.updateReferenceState({ p: stepPhases[phase] }), flowStepMaxMb);
      if (job.signal.aborted) return;
      const project = this.mergePdfEvidence(fromStepModel(model));
      const numbers = Object.values(project.parts).map(part => normalizeLibraryNumber(part.pn));
      const [assets, geometryKey, library] = await Promise.all([
        loadFlowAssets(), flowGeometryKey(project),
        lookupLibraryNumbers(numbers, job.signal).catch(() => ({ matches: new Map<string, LibraryMatch>() })),
      ]);
      if (job.signal.aborted) return;
      project.geometryKey = geometryKey;
      classifyFlowSteps(project, assets.PartLib7.seed(), library.matches);
      this.loadFlowProject(project);
      this.updateReferenceState({ p: 9 }, () => this.go(3));
    } catch (error) {
      if (job.signal.aborted) return;
      this.go(-1);
      this.updateReferenceState({ ferr: error instanceof Error ? error.message : 'STEP을 읽지 못했습니다.' });
    } finally {
      clearInterval(timer);
      if (this.stepJob === job) this.stepJob = undefined;
    }
  }

  private mergePdfEvidence(project: FlowProject) {
    const evidence = new Map<string, string | null>();
    const normalize = (text: string) => text.normalize('NFKC').trim().toLowerCase();
    for (const page of this.pdfPages) {
      for (const row of page.partList) {
        if (row.kind !== 'table' || !row.partNumber || !row.name) continue;
        const key = normalize(row.partNumber);
        const previous = evidence.get(key);
        evidence.set(key, previous === undefined || previous === row.name ? row.name : null);
      }
    }
    for (const part of Object.values(project.parts)) {
      const name = evidence.get(normalize(part.pn));
      if (name) {
        part.ko = name.trim().slice(0, 120);
        part.src = 'STEP · PDF 부품표';
      }
    }
    return project;
  }

  private trainingProject() {
    if (!this.pr) return;
    const project = cloneFlowProject(this.pr);
    const meta = this.referenceState.meta as { prod?: string; dno?: string } | undefined;
    project.ko = meta?.prod?.trim() || project.ko;
    project.code = meta?.dno?.trim() || project.code;
    const holes = this.referenceState.hOv as Record<string, VectorTuple> | undefined;
    const plans = (this.referenceState.plan ?? []) as FlowStep[][];
    project.sections = project.sections.flatMap((section, index) => {
      if (section.final) return [];
      const steps = (plans[index] ?? section.steps).filter((step) => !step.del && !step.blank && project.parts[step.part]);
      for (const step of steps) {
        for (const index of step.pcs ?? section.idx.filter((index) => project.pieces[index].part === step.part)) {
          const piece = project.pieces[index];
          if (holes?.[index]) piece.p = holes[index];
          else if (step.off) {
            const [x, y, z] = step.off;
            const [px, py, pz] = this.pr!.pieces[index].p;
            piece.p = [px + x, py + y, pz + z];
          }
        }
      }
      return steps.length ? [{ ...section, steps }] : [];
    });
    return project.sections.length ? project : undefined;
  }

  async publishFlowTraining() {
    if (this.referenceState.publishing) return;
    const project = this.trainingProject();
    if (!project) return;
    this.updateReferenceState({ publishing: true, pdfMsg: '교육장을 저장하는 중입니다.' });
    try {
      await saveFlowTraining(project);
      this.updateReferenceState({ pdfMsg: '' });
      this.go(2);
    } catch {
      this.updateReferenceState({ pdfMsg: '이 브라우저에 교육장을 저장하지 못했습니다. 저장 공간을 확인해 주세요.' });
    } finally {
      this.updateReferenceState({ publishing: false });
    }
  }

  launchFlowTraining() {
    const project = this.trainingProject();
    if (project) this.props.onTraining?.(project);
  }

  disposeFlowFiles() {
    this.closed = true;
    this.stepJob?.abort();
    this.clearFlowPdf();
  }
}

export function localPlanSuggestion(query: string, index: number, length: number) {
  const target = /앞|위로|먼저/.test(query) ? index - 1 : /뒤|아래로|나중/.test(query) ? index + 1 : -1;
  if (target < 0 || target >= length) return null;
  return { summary: (index + 1) + '번 단계를 ' + (target + 1) + '번 위치로 이동합니다.', target };
}
