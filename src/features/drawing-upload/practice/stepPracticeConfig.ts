import type { StepBounds, StepPick, VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';

export interface PracticeTarget {
  partNumber: number;
  pick?: StepPick;
}

export interface PracticeDraft {
  placement?: PracticeTarget;
  fastening?: PracticeTarget;
  tool: string;
  torque: string;
  exampleTorque: boolean;
}

export type PracticeConfig = Omit<PracticeDraft, 'placement' | 'fastening'> & {
  placement: Required<PracticeTarget>;
  fastening: Required<PracticeTarget>;
};

const emptyDraft: PracticeDraft = { tool: '', torque: '', exampleTorque: false };

function isPoint(value: unknown): value is VectorTuple {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

export function isPracticeReady(draft: PracticeDraft, partCount: number): draft is PracticeConfig {
  const isTarget = (target?: PracticeTarget) => !!target && Number.isInteger(target.partNumber) &&
    target.partNumber >= 1 && target.partNumber <= partCount && isPoint(target.pick?.point) &&
    isPoint(target.pick?.normal) && Math.hypot(...target.pick.normal) > 0;
  const torque = typeof draft.torque === 'string' && /^\d+(?:\.\d+)?$/.test(draft.torque.trim()) ? Number(draft.torque) : NaN;
  return isTarget(draft.placement) && isTarget(draft.fastening) && draft.placement?.partNumber !== draft.fastening?.partNumber &&
    typeof draft.tool === 'string' && !!draft.tool.trim() && Number.isFinite(torque) && torque > 0 && typeof draft.exampleTorque === 'boolean';
}

function storageKey(modelId: string) { return `step-practice-v1:${modelId}`; }

export function readPracticeDraft(modelId: string, partCount: number): PracticeDraft {
  try {
    const saved = window.localStorage.getItem(storageKey(modelId));
    const draft = saved && JSON.parse(saved) as PracticeDraft;
    if (draft && isPracticeReady(draft, partCount)) return draft;
  } catch { /* Opening a practice is still possible if local storage is unavailable. */ }
  return emptyDraft;
}

export function savePracticeConfig(modelId: string, config: PracticeConfig) {
  try {
    window.localStorage.setItem(storageKey(modelId), JSON.stringify(config));
    return true;
  } catch { return false; }
}

export function getPracticeFocus(modelBounds: StepBounds, partBounds: StepBounds, anchor: VectorTuple, scale: number): StepBounds {
  const radius = Math.max(...partBounds.max.map((value, axis) => value - partBounds.min[axis]), 0.025 / scale) * 1.65;
  const point = anchor.map((value, axis) => value / scale + (modelBounds.min[axis] + modelBounds.max[axis]) / 2);
  return { min: point.map((value) => value - radius) as VectorTuple, max: point.map((value) => value + radius) as VectorTuple };
}
