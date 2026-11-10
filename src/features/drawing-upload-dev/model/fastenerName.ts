export function isScrewOrBolt(name: string): boolean {
  const label = name.replace(/_/g, ' ');
  return /\b(?:bolt|screw)\b|볼트|나사/i.test(label)
    || (/\btorx\b/i.test(label) && /\bm\s*\d+(?:\.\d+)?\s*[x×]\s*\d/i.test(label));
}
