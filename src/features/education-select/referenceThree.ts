import type * as Three from 'three';

/** 원본의 선택·분해·실습·공구와 이식한 시안 페이지가 같은 r149 인스턴스를 공유합니다. */
export type ReferenceThree = typeof Three & { sRGBEncoding: number };
export type ReferenceRenderer = Three.WebGLRenderer & { outputEncoding: number };
export type ReferenceTexture = Three.CanvasTexture & { encoding: number };

let referencePromise: Promise<ReferenceThree> | null = null;

export function loadReferenceThree(): Promise<ReferenceThree> {
  if (referencePromise) return referencePromise;
  referencePromise = new Promise((resolve, reject) => {
    const referenceWindow = window as Window & { THREE?: ReferenceThree };
    if (referenceWindow.THREE?.REVISION === '149') { resolve(referenceWindow.THREE); return; }
    const script = document.createElement('script');
    script.src = '/vendor/three-r149.min.js';
    script.async = true;
    const fail = (message: string) => {
      window.clearTimeout(timeout); script.onload = null; script.onerror = null;
      referencePromise = null; script.remove(); reject(new Error(message));
    };
    const timeout = window.setTimeout(() => fail('Reference three r149 loading timed out'), 10_000);
    script.onload = () => {
      if (referenceWindow.THREE?.REVISION !== '149') { fail('three r149 did not initialize'); return; }
      window.clearTimeout(timeout); script.onload = null; script.onerror = null; resolve(referenceWindow.THREE);
    };
    script.onerror = () => fail('Could not load reference three r149');
    document.head.appendChild(script);
  });
  return referencePromise;
}
