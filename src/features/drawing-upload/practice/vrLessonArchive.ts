import { unzip, unzipSync, zip, type Unzipped } from 'three/addons/libs/fflate.module.js';

type FileEntry = { path: string; bytes: number; sha256: string };
type Manifest = Record<string, unknown> & { files?: FileEntry[] };
export const VR_LESSON_MAX_MB = 200;
const byteLimit = VR_LESSON_MAX_MB * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

async function describeFile(path: string, data: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return { path, bytes: data.byteLength, sha256: Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('') };
}

export async function packVrLesson(entries: Unzipped, manifest: Manifest) {
  const previous = new Map(manifest.files?.map((entry) => [entry.path, entry]));
  const files = await Promise.all(Object.entries(entries).filter(([path]) => !path.endsWith('/')).map(async ([path, data]) => ({
    ...previous.get(path), ...await describeFile(path, data),
  })));
  const manifestBytes = encoder.encode(JSON.stringify({ ...manifest, files }, null, 2));
  const archive = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    zip({ ...entries, 'manifest.json': manifestBytes }, { level: 3 }, (error, data) => error ? reject(error) : resolve(data));
  });
  return new Blob([archive], { type: 'application/zip' });
}

export async function readVrLessonArchive(file: File, synchronousUnzip = false) {
  if (!file.name.toLowerCase().endsWith('.vrlesson.zip') || file.size > byteLimit) {
    throw new Error(`\`.vrlesson.zip\` 형식의 ${VR_LESSON_MAX_MB}MB 이하 파일을 선택하세요.`);
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const paths = new Set<string>();
  let size = 0;
  unzipSync(data, {
    filter: ({ name, size: compressedSize, originalSize }) => {
      const path = name.replace(/\/$/, '');
      const key = path.toLowerCase();
      size += Math.max(compressedSize, originalSize);
      if (!path || /[\\:\x00-\x1f]/.test(path) || path.split('/').some((part) => !part || part === '.' || part === '..' || part === '__proto__') ||
        paths.has(key) || paths.size >= 4096 || size > byteLimit) {
        throw new Error('교육 ZIP의 파일 경로, 개수 또는 압축 해제 용량을 확인해 주세요.');
      }
      paths.add(key);
      return false;
    },
  });
  const unpacked = synchronousUnzip ? unzipSync(data) : await new Promise<Unzipped>((resolve, reject) => {
    unzip(data, (error, entries) => error ? reject(error) : resolve(entries));
  });
  const { 'manifest.json': manifestBytes, 'lesson.json': lessonBytes, ...assets } = unpacked;
  if (!manifestBytes || !lessonBytes) throw new Error('교육 ZIP에서 manifest.json과 lesson.json을 찾을 수 없습니다.');
  const manifest = JSON.parse(decoder.decode(manifestBytes));
  if (manifest?.packageType !== 'dx-vr-training' || !['0.1.0', '0.2.0'].includes(manifest.formatVersion) || manifest.lessonFile !== 'lesson.json' ||
    typeof manifest.trainingId !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(manifest.trainingId) ||
    typeof manifest.contentVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(manifest.contentVersion) || !Array.isArray(manifest.files)) {
    throw new Error('지원하는 VR 교육 패키지 형식인지 확인해 주세요.');
  }
  const entries = { ...assets, 'lesson.json': lessonBytes };
  const payloads = Object.entries(entries).filter(([path]) => !path.endsWith('/'));
  const declared = new Map<string, FileEntry>(manifest.files.map((entry: FileEntry) => [entry?.path, entry]));
  if (payloads.length !== manifest.files.length || declared.size !== payloads.length) throw new Error('교육 ZIP의 파일 목록이 일치하지 않습니다.');
  for (const [path, bytes] of payloads) {
    const expected = declared.get(path);
    const actual = await describeFile(path, bytes);
    if (expected?.bytes !== actual.bytes || expected.sha256 !== actual.sha256) throw new Error(`교육 ZIP에서 ${path} 파일을 검증하지 못했습니다.`);
  }
  return { manifest: manifest as Manifest & { trainingId: string; contentVersion: string }, lesson: JSON.parse(decoder.decode(lessonBytes)) as unknown, assets };
}

export function encodeVrLesson(lesson: object) {
  return encoder.encode(JSON.stringify(lesson, null, 2));
}
