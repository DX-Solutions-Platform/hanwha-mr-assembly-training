import type { ReferenceThree, ReferenceTexture } from './referenceThree';
import type { SelectionProduct } from './selectionProducts';

export function createSelectionRing(T: ReferenceThree, product: SelectionProduct, fontFamily: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.translate(256, 256);
  context.scale(0.5, 0.5);

  const pale = '#ffd9bd', orange = '#f37321';
  function arc(radius: number, start: number, end: number, color: string, width: number) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.arc(0, 0, radius, start, end);
    context.stroke();
  }
  arc(370, -Math.PI * 0.42, Math.PI * 1.36, pale, 46);
  arc(370, Math.PI * 1.36 + 0.06, Math.PI * 1.36 + 0.28, orange, 46);
  arc(330, 0, Math.PI * 2, pale, 3);
  arc(445, -Math.PI * 0.95, -Math.PI * 0.05, pale, 5);
  arc(445, Math.PI * 0.08, Math.PI * 0.32, orange, 20);

  context.fillStyle = pale;
  context.font = `500 30px ${fontFamily}`;
  const caption = product.kind === 'nuri' ? 'KSLV-II · 3D MANUAL'
    : `HANWHA · ${product.isCustom ? 'NEW' : product.code} · ${product.cardCount} CARDS`;
  Array.from(caption).forEach((character, index) => {
    context.save();
    context.rotate(-Math.PI * 0.36 + index * 0.034);
    context.fillText(character, -8, -470);
    context.restore();
  });
  const texture = new T.CanvasTexture(canvas) as ReferenceTexture;
  texture.encoding = T.sRGBEncoding;
  const material = new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  const ring = new T.Mesh(new T.PlaneGeometry(0.945, 0.945), material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  return ring;
}
