export function stripFlangeAxisLines(ink: Uint8Array, width: number, height: number) {
  const straight = new Uint8Array(ink.length);
  const minimum = Math.max(48, Math.round(Math.min(width, height) * .065));
  let marked = false;
  const mark = (count: number, length: number, stride: number, step: number) => {
    for (let line = 0; line < count; line++) {
      const offset = line * stride;
      let start = 0;
      for (let position = 0; position <= length; position++) {
        if (position < length && ink[offset + position * step]) continue;
        if (position - start >= minimum) {
          for (let index = start; index < position; index++) straight[offset + index * step] = 1;
          marked = true;
        }
        start = position + 1;
      }
    }
  };
  mark(height, width, width, 1);
  mark(width, height, 1, width);
  if (!marked) return null;
  const cleaned = ink.slice();
  for (let index = 0; index < straight.length; index++) {
    if (!straight[index]) continue;
    const x = index % width, y = Math.floor(index / width);
    let connectsOutline = false;
    for (let delta = -4; delta <= 4 && !connectsOutline; delta++) {
      if (x + delta >= 0 && x + delta < width && ink[index + delta] && !straight[index + delta]) connectsOutline = true;
      if (y + delta >= 0 && y + delta < height && ink[index + delta * width] && !straight[index + delta * width]) connectsOutline = true;
    }
    // Keep the short crossing so the circle stroke stays connected.
    if (!connectsOutline) cleaned[index] = 0;
  }
  return cleaned;
}
