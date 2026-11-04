/** Demo 1 HUD.dc.html의 체결/계기/저항 수식. */
export function angularDelta(angle: number, previous: number) {
  let delta = angle - previous; if (delta > Math.PI) delta -= Math.PI * 2; if (delta < -Math.PI) delta += Math.PI * 2; return delta;
}
export function tighten(progress: number, delta: number) {
  const multiplier = progress < 0.7 ? 1 : Math.max(0.22, 1 - (progress - 0.7) / 0.3 * 0.78);
  return { progress: delta > 0 ? Math.min(1, progress + delta * multiplier / (Math.PI * 3)) : progress, rotation: delta > 0 ? delta * multiplier : 0, resistance: 1 - multiplier };
}
export const displayedTorque = (progress: number) => progress < 0.82 ? progress / 0.82 * 2.5 : 2.5 + (progress - 0.82) / 0.18 * 9.5;
export const displayedResistance = (progress: number) => progress < 0.7 ? progress / 0.7 * 0.2 : 0.2 + (progress - 0.7) / 0.3 * 0.8;
export const overTorque = (radians: number, warned: boolean) => ({ warn: radians > 0.45 && !warned, torque: 12 + radians * 4 });
export const BOLT_ORDER = [0, 2, 1, 3] as const;
