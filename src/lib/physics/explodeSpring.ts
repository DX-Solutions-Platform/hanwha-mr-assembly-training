export interface SpringState { value: number; velocity: number; }
export interface SpringConfig { stiffness: number; damping: number; kick: number; }

/**
 * 펼침 스프링: 처음 빠르게 출발 → 천천히 안착, 끝 지점 흔들림은 작게 (감쇠비 약 0.8)
 * (확정: 스프링 + 회전 분리, 시작을 조금 더 빠르게)
 */
export const EXPLODE_SPRING: SpringConfig = { stiffness: 38, damping: 9.8, kick: 2.9 };
export const FLY_OUT_SEC = 1.0;

export function createSpring(value = 0): SpringState { return { value, velocity: 0 }; }

export function stepSpring(state: SpringState, target: number, deltaTime: number, config: SpringConfig = EXPLODE_SPRING) {
  const stepTime = Math.min(deltaTime, 1 / 30);
  const force = (target - state.value) * config.stiffness - state.velocity * config.damping;
  state.velocity += force * stepTime;
  state.value += state.velocity * stepTime;
}

/** 목표가 바뀌는 순간 초기 속도를 더해 "파악" 퍼지는 느낌 */
export function kickSpring(state: SpringState, direction: 1 | -1, config: SpringConfig = EXPLODE_SPRING) {
  state.velocity += direction * config.kick;
}

/** 펼치는 동안만 살짝 돌았다가 제자리로 (회전 분리) */
export function getSeparationSpin(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return Math.sin(clamped * Math.PI) * 0.38;
}
