type Point = readonly [number, number];

export interface StepStoolProfile {
  stepHeight: number;
  boardThickness: number;
}

// Landmarks for the supported two-step frame view, in a normalized reference rectangle.
// The two platforms must be separate, with feet both under the lower step and behind it.
const landmarks = {
  topRear: [[83, 286], [323, 260]],
  topSide: [[323, 260], [478, 275]],
  topFront: [[241, 302], [478, 275]],
  topUnderside: [[241, 318], [478, 291]],
  stepFront: [[294, 554], [563, 512]],
  stepSide: [[232, 545], [294, 554]],
  rearLeg: [[93, 307], [40, 750]],
  nearLeg: [[267, 602], [268, 791]],
  farLeg: [[553, 533], [580, 741]],
} as const satisfies Record<string, readonly [Point, Point]>;

export function recognizeStepStool(ink: Uint8Array, width: number, height: number): StepStoolProfile | null {
  if (height < 90 || width / height < .9 || width / height > 1.12) return null;
  const sample = ([start, end]: readonly [Point, Point]) => {
    const [x0, y0] = [(start[0] - 40) * (width - 1) / 540, (start[1] - 260) * (height - 1) / 536];
    const dx = (end[0] - start[0]) * (width - 1) / 540;
    const dy = (end[1] - start[1]) * (height - 1) / 536;
    const vertical = Math.abs(dy) > Math.abs(dx);
    const search = Math.ceil(height * .027), tolerance = Math.max(1, Math.round(height * .004));
    let best = { score: -1, offset: 0 };
    for (let offset = -search; offset <= search; offset++) {
      let hits = 0;
      for (let index = 1; index <= 24; index++) {
        const at = .08 + index * .84 / 25;
        const x = Math.round(x0 + dx * at) + (vertical ? offset : 0);
        const y = Math.round(y0 + dy * at) + (vertical ? 0 : offset);
        for (let delta = -tolerance; delta <= tolerance; delta++) {
          const sx = x + (vertical ? delta : 0), sy = y + (vertical ? 0 : delta);
          if (sx >= 0 && sx < width && sy >= 0 && sy < height && ink[sy * width + sx]) { hits++; break; }
        }
      }
      const score = hits / 24 - Math.abs(offset) / height;
      if (score > best.score) best = { score, offset };
    }
    return best;
  };
  const { topRear, topSide, topFront, topUnderside, stepFront, stepSide, rearLeg, nearLeg, farLeg } =
    Object.fromEntries(Object.entries(landmarks).map(([key, edge]) => [key, sample(edge)])) as Record<keyof typeof landmarks, ReturnType<typeof sample>>;
  if (Math.min(topRear.score, topSide.score, topFront.score, topUnderside.score, stepFront.score, stepSide.score,
    rearLeg.score, nearLeg.score, farLeg.score) < .70) return null;
  const boardThickness = 16 / 536 + (topUnderside.offset - topFront.offset) / height;
  const stepHeight = 242 / 536 - stepFront.offset / height;
  if (boardThickness < .013 || boardThickness > .055) return null;
  return { stepHeight, boardThickness };
}
