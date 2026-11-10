import { unzip, type Unzipped } from 'three/addons/libs/fflate.module.js';

type SourceFile = { path: string; bytes: number; sha256: string };
const preparedLessonHash = 'dc90ccbc1a06d2d9499b08e500a35946b4a2fbe6c9e41c15a922d27acd115db5';
const preparedArchiveHash = '6fe049d45947b2e2a60b907dd029de34cb3bfb3e7f0f35e1c54086793ae30b73';

function hasPreparedLesson(files: readonly SourceFile[] | undefined) {
  return files?.some(({ path, sha256 }) => path === 'lesson.json' && sha256 === preparedLessonHash);
}

export function drawingStepKey(section: string, step: string) {
  return JSON.stringify([section, step]);
}

export async function loadPreparedLessonDocument(files: readonly SourceFile[] | undefined, zip: Blob, signal: AbortSignal) {
  if (!hasPreparedLesson(files)) return;
  try {
    const digest = await crypto.subtle.digest('SHA-256', await zip.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
    signal.throwIfAborted();
    if (sha256 !== preparedArchiveHash) return;
    const response = await fetch('/examples/training-demo/prepared-drawing.pdf', { signal });
    if (!response.ok) return;
    const blob = await response.blob();
    signal.throwIfAborted();
    return blob;
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}

export async function loadPreparedLessonFigures(files: readonly SourceFile[] | undefined, signal: AbortSignal) {
  if (!files || !hasPreparedLesson(files)) return;
  try {
    const response = await fetch('/examples/training-demo/drawing-figures.zip', { signal });
    if (!response.ok) return;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const cache = await new Promise<Unzipped>((resolve, reject) => {
      unzip(bytes, (error, figures) => error ? reject(error) : resolve(figures));
    });
    signal.throwIfAborted();
    const index = JSON.parse(new TextDecoder().decode(cache['manifest.json'])) as { files: SourceFile[] };
    const source = new Map(files.map((file) => [file.path, file]));
    if (index.files.length !== source.size || !index.files.every(({ path, sha256, bytes }) =>
      source.get(path)?.sha256 === sha256 && source.get(path)?.bytes === bytes)) return;
    return cache;
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}
