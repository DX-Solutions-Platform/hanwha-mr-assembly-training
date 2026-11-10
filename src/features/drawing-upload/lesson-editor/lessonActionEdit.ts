import { editApproachPose } from './lessonApproach';
import { lessonRecord, type LessonApproach, type PreviewAction, type PreviewPart } from './lessonPreviewData';

export type LessonActionChange = { approach: LessonApproach } | { turns: number; clockwise: boolean };

export function applyLessonActionChange(action: PreviewAction, parts: PreviewPart[], change: LessonActionChange) {
  if ('approach' in change) {
    const { directionDeg, tiltDeg, distanceM } = change.approach;
    if (action.kind !== 'attach' || ![directionDeg, tiltDeg, distanceM].every(Number.isFinite) ||
      directionDeg < -180 || directionDeg > 180 || tiltDeg < 0 || tiltDeg > 90 || distanceM <= 0) return;
    const pose = editApproachPose(action, parts, change.approach);
    if (!pose) return;
    return { data: { ...action.raw, approach: change.approach }, pose };
  }
  if ((action.kind !== 'fasten' && action.kind !== 'thread') || !Number.isFinite(change.turns) ||
    change.turns < .001 || change.turns > 1000) return;
  const requiredRotationDeg = Math.round(change.turns * 360_000) / 1000;
  const direction = change.clockwise ? 'clockwise_viewed_from_head' : 'counterclockwise_viewed_from_head';
  return { data: { ...action.raw, turn: { ...lessonRecord(action.raw.turn), direction, requiredRotationDeg } }, requiredRotationDeg };
}

export function synchronizeTurnText(value: unknown, before: PreviewAction, after: number, clockwise: boolean): unknown {
  if (Array.isArray(value)) return value.map((item) => synchronizeTurnText(item, before, after, clockwise));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key, synchronizeTurnText(item, before, after, clockwise),
  ]));
  if (typeof value !== 'string') return value;
  const changed = value.replace(/(\d+(?:[.,]\d+)?)(\s*)(°|도|바퀴|turns?\b)/gi, (original, digits, space, unit) => {
    const inTurns = unit === '바퀴' || /^turn/i.test(unit);
    const current = Number(digits.replace(',', '.'));
    const previous = (before.rotationDeg ?? NaN) / (inTurns ? 360 : 1);
    if (!Number.isFinite(previous) || Math.abs(current - previous) > .001) return original;
    const amount = Math.round(after / (inTurns ? 360 : 1) * 1000) / 1000;
    return amount + space + (/^turn/i.test(unit) ? (amount === 1 ? 'turn' : 'turns') : unit);
  });
  if (clockwise === before.clockwise) return changed;
  return changed.replace(/(?:반시계|시계)\s*방향|\b(?:counterclockwise|clockwise)\b/gi, (direction) => {
    const wasClockwise = !/^(?:반|counter)/i.test(direction);
    if (wasClockwise !== before.clockwise) return direction;
    return /시계/.test(direction) ? (clockwise ? '시계 방향' : '반시계 방향') : (clockwise ? 'clockwise' : 'counterclockwise');
  });
}
