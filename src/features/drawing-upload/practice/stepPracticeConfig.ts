import type { StepPick, VectorTuple } from '@/features/drawing-upload-dev/model/stepTypes';

export interface PracticeTarget {
  partNumber: number;
  pick?: StepPick;
}

export interface PracticeMountDraft {
  placement?: PracticeTarget;
  support?: PracticeTarget;
  purpose: string;
}

export interface PracticeDraft {
  mounts: PracticeMountDraft[];
  fastening?: PracticeTarget;
  tool: string;
  torque: string;
  exampleTorque: boolean;
}

export type PracticeMount = Omit<PracticeMountDraft, 'placement' | 'support'> & {
  placement: Required<PracticeTarget>;
  support: Required<PracticeTarget>;
};

export type PracticeConfig = Omit<PracticeDraft, 'mounts' | 'fastening'> & {
  mounts: [PracticeMount, ...PracticeMount[]];
  fastening: Required<PracticeTarget>;
};

const emptyDraft: PracticeDraft = { mounts: [{ purpose: '' }], tool: '', torque: '', exampleTorque: false };
export const ATTACHMENT_POINT_TOLERANCE = 0.12;

function isPoint(value: unknown): value is VectorTuple {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

export function getPracticeTorque(value: unknown) {
  const torque = typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isFinite(torque) && torque > 0 ? torque : null;
}

function isTarget(target: PracticeTarget | undefined, partCount: number): target is Required<PracticeTarget> {
  return !!target && Number.isInteger(target.partNumber) &&
    target.partNumber >= 1 && target.partNumber <= partCount && isPoint(target.pick?.point) &&
    isPoint(target.pick?.normal) && Math.hypot(...target.pick.normal) > 0;
}

export function getAttachmentGap(placement?: PracticeTarget, support?: PracticeTarget) {
  const first = placement?.pick?.point, second = support?.pick?.point;
  if (!isPoint(first) || !isPoint(second)) return null;
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function hasSavedTools(draft: PracticeDraft, partCount: number) {
  return isTarget(draft.fastening, partCount) &&
    typeof draft.tool === 'string' && !!draft.tool.trim() && getPracticeTorque(draft.torque) !== null && typeof draft.exampleTorque === 'boolean';
}

export function isPracticeMountReady(mount: PracticeMountDraft, partCount: number): mount is PracticeMount {
  const gap = getAttachmentGap(mount.placement, mount.support);
  return isTarget(mount.placement, partCount) && isTarget(mount.support, partCount) && mount.placement.partNumber !== mount.support.partNumber &&
    gap !== null && gap <= ATTACHMENT_POINT_TOLERANCE && typeof mount.purpose === 'string' && !!mount.purpose.trim();
}

export function isPracticeReady(draft: PracticeDraft, partCount: number): draft is PracticeConfig {
  if (!hasSavedTools(draft, partCount) || !draft.mounts.length) return false;
  const installed = new Set([draft.mounts[0].support?.partNumber]);
  for (const mount of draft.mounts) {
    if (!isPracticeMountReady(mount, partCount) || !installed.has(mount.support.partNumber) || installed.has(mount.placement.partNumber)) return false;
    installed.add(mount.placement.partNumber);
  }
  return !installed.has(draft.fastening?.partNumber);
}

function storageKey(modelId: string) { return `step-practice-v1:${modelId}`; }

export function readPracticeDraft(modelId: string, partCount: number): PracticeDraft {
  try {
    const saved = window.localStorage.getItem(storageKey(modelId));
    if (!saved) return emptyDraft;
    const stored = JSON.parse(saved) as (PracticeDraft & PracticeMountDraft) | null;
    if (!stored) return emptyDraft;
    if (Array.isArray(stored.mounts)) return isPracticeReady(stored, partCount) ? stored : emptyDraft;
    const migrated: PracticeDraft = {
      mounts: [{ placement: stored.placement, support: stored.support, purpose: typeof stored.purpose === 'string' ? stored.purpose : '' }],
      fastening: stored.fastening, tool: stored.tool, torque: stored.torque, exampleTorque: stored.exampleTorque,
    };
    if (hasSavedTools(migrated, partCount) && isTarget(stored.placement, partCount)) return migrated;
  } catch { /* Opening a practice is still possible if local storage is unavailable. */ }
  return emptyDraft;
}

export function savePracticeConfig(modelId: string, config: PracticeConfig) {
  try {
    window.localStorage.setItem(storageKey(modelId), JSON.stringify(config));
    return true;
  } catch { return false; }
}
