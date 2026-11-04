/**
 * 3D 렌더링 픽셀 예산 (저사양 PC · Quest 3 기준)
 * 화면이 커질수록(QHD·4K) 렌더 배율을 낮춰 GPU 부하를 FHD 수준으로 유지합니다.
 */
export const MAX_RENDER_PIXELS = 1920 * 1080 * 1.25;
export const MIN_RENDER_DPR = 0.5;
export const MAX_RENDER_DPR = 1.5;
/** PerformanceMonitor가 프레임 저하를 감지하면 한 단계씩 낮춥니다 */
export const RENDER_QUALITY_STEP_LIST = [1, 0.85, 0.7, 0.55] as const;

export function getRenderDpr(cssWidth: number, cssHeight: number, deviceDpr: number): number {
  const budgetDpr = Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, cssWidth * cssHeight));
  return Math.min(MAX_RENDER_DPR, Math.max(MIN_RENDER_DPR, Math.min(deviceDpr, budgetDpr)));
}
