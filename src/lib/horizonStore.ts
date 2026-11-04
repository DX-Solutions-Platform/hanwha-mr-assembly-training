/** 배경 수평선 위치를 3D 카메라와 맞추기 위한 공유 저장소 (매 프레임 setState 없이 CSS 변수만 갱신) */
let backdropElement: HTMLElement | null = null;

export function registerHorizonElement(element: HTMLElement | null): () => void {
  backdropElement = element;
  return () => { if (backdropElement === element) backdropElement = null; };
}

export function setHorizonY(stageY: number) {
  backdropElement?.style.setProperty('--horizon-y', `${stageY.toFixed(1)}px`);
}
