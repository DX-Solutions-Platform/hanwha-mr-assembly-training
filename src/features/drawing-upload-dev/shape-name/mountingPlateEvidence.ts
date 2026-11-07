export interface InkComponent {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function findComponents(ink: Uint8Array, width: number, height: number, labels?: Int32Array) {
  const seen = new Uint8Array(ink.length);
  const queue = new Int32Array(ink.length);
  const components: InkComponent[] = [];
  for (let first = 0; first < ink.length; first++) {
    if (!ink[first] || seen[first]) continue;
    let size = 1;
    let left = width, top = height, right = 0, bottom = 0;
    queue[0] = first;
    seen[first] = 1;
    for (let cursor = 0; cursor < size; cursor++) {
      const index = queue[cursor];
      const x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (let row = Math.max(0, y - 1); row <= Math.min(height - 1, y + 1); row++) {
        for (let column = Math.max(0, x - 1); column <= Math.min(width - 1, x + 1); column++) {
          const next = row * width + column;
          if (!ink[next] || seen[next]) continue;
          seen[next] = 1;
          queue[size++] = next;
        }
      }
    }
    if (size >= 20) {
      components.push({ left, top, right, bottom });
      if (labels) for (let cursor = 0; cursor < size; cursor++) labels[queue[cursor]] = components.length;
    }
  }
  return components;
}

const area = ({ left, top, right, bottom }: InkComponent) => (right - left) * (bottom - top);

export function hasMountingPlateEvidence(ink: Uint8Array, width: number, height: number) {
  const components = findComponents(ink, width, height);
  const face = components.reduce<InkComponent | null>((largest, component) => !largest || area(component) > area(largest) ? component : largest, null);
  if (!face) return false;
  const { left, top, right, bottom } = face;
  const faceWidth = right - left, faceHeight = bottom - top;
  if (Math.min(faceWidth, faceHeight) < 36) return false;
  const horizontalCoverage = (y: number, direction: number) => {
    let count = 0;
    for (let x = left; x <= right; x++) {
      if (ink[y * width + x] || ink[(y + direction) * width + x] || ink[(y + direction * 2) * width + x]) count++;
    }
    return count / (faceWidth + 1);
  };
  const verticalCoverage = (x: number, direction: number) => {
    let count = 0;
    for (let y = top; y <= bottom; y++) {
      if (ink[y * width + x] || ink[y * width + x + direction] || ink[y * width + x + direction * 2]) count++;
    }
    return count / (faceHeight + 1);
  };
  if (Math.min(horizontalCoverage(top, 1), horizontalCoverage(bottom, -1), verticalCoverage(left, 1), verticalCoverage(right, -1)) < .72) return false;
  // A side view of a bracket may be rectangular. Require holes inside the dominant outline.
  return components.filter((hole) => {
    const w = hole.right - hole.left, h = hole.bottom - hole.top;
    return hole.left > left + 3 && hole.right < right - 3 && hole.top > top + 3 && hole.bottom < bottom - 3
      && Math.min(w, h) >= 8 && Math.max(w, h) < Math.min(faceWidth, faceHeight) / 3
      && w / h >= .7 && w / h <= 1.43;
  }).length >= 2;
}
