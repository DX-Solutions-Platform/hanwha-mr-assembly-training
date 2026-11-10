import type { StepAssemblyPart } from '../../drawing-upload-dev/model/stepAssemblyParts';
import type { DrawingRequest } from '../instructions/useStepDrawings';
import type { PracticeCardImage } from './practiceTrayLayout';
import { getPracticeGroupBounds } from './stepPracticeSequence';

export type PracticeCardFigures = Partial<Record<'during' | 'after', string | null>>;

export function getPracticeCardImageRequests(key: string, active: readonly StepAssemblyPart[], installed: readonly StepAssemblyPart[]): DrawingRequest[] {
  if (!active.length) return [];
  const assembly = [...new Map([...installed, ...active].map((part) => [part.number, part])).values()];
  const activeShapes = active.flatMap(({ shapeIds }) => shapeIds);
  return [
    { key: `${key}-during`, target: { bounds: getPracticeGroupBounds(active), shapeIds: activeShapes } },
    { key: `${key}-after`, target: { bounds: getPracticeGroupBounds(assembly), shapeIds: assembly.flatMap(({ shapeIds }) => shapeIds),
      highlightShapeIds: activeShapes } },
  ];
}

export function getPracticeCardImageSource(image: PracticeCardImage | null, figures: PracticeCardFigures) {
  if (!image) return undefined;
  return image.kind === 'upload' ? image.src : figures[image.kind];
}
