import type { PreviewAction } from './lessonPreviewData';

export function motionRange(value: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

export function smoothMotion(value: number) {
  return value * value * (3 - 2 * value);
}

export function motionPhase(progress: number, count: number) {
  const position = progress * count;
  const index = Math.max(0, Math.min(count - 1, Math.floor(position)));
  return { index, local: Math.min(1, position - index) };
}

export function lessonMotionDuration(action?: PreviewAction) {
  switch (action?.kind) {
    case 'attach': return 4300;
    case 'fasten': return Math.min(32000, Math.max(3500, action.boltOrder.length * 1800));
    case 'thread': return 5200;
    case 'inspect': return Math.min(12000, Math.max(4300, (action.surface?.sectors ?? 1) * 580));
    case 'touch': return Math.min(30000, Math.max(3500, action.points.length * (520 + Math.max(0, action.dwellS ?? .35) * 1000)));
    default: return 4200;
  }
}

export function turnProgress(action: PreviewAction, progress: number) {
  if (action.kind === 'thread') {
    const turns = Math.min(10, Math.max(1, Math.ceil(Math.abs(action.rotationDeg ?? 0) / 160)));
    const regrip = motionPhase(motionRange(progress, .15, .87), turns);
    return (regrip.index + smoothMotion(motionRange(regrip.local, .05, .72))) / turns;
  }
  return smoothMotion(motionRange(motionPhase(progress, Math.max(1, action.boltOrder.length)).local, .22, .82));
}

export function motionLabel(action: PreviewAction, progress: number) {
  switch (action.kind) {
    case 'attach': return progress < .18 ? '부품 잡기' : progress < .68 ? '장착 위치로 이동' : progress < .88 ? '정렬하고 삽입' : '손 놓기';
    case 'fasten': {
      const count = Math.max(1, action.boltOrder.length);
      const { index, local } = motionPhase(progress, count);
      return (index + 1) + ' / ' + count + ' · ' + (local < .22 ? '공구 대기' : local < .82 ? '회전해 체결' : '공구 빼기');
    }
    case 'thread': return progress < .15 ? '나사산 맞추기' : progress < .87 ? '손으로 돌려 끼우기' : '손 놓기';
    case 'inspect': return progress < .12 ? '검사등 가져오기' : progress < .9 ? '검사등으로 표면 훑기' : '검사 마무리';
    case 'touch': {
      const count = Math.max(1, action.points.length);
      const { index, local } = motionPhase(progress, count);
      const contact = action.tool === 'brush' ? '브러시로 도포' : action.tool === 'pen' ? '마커로 표시' : '지점에 접촉';
      return (index + 1) + ' / ' + count + ' · ' + (local < .32 ? '접촉 위치로 이동' : local < .86 ? contact : '공구 들어 올리기');
    }
    default: return action.label;
  }
}
