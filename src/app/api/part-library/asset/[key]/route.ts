import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hasLibraryAccess } from '@/features/part-library/server/libraryAccess';
import { createHistory, libraryDirectory, readLibrary, readLimitedBody, updateLibrary } from '@/features/part-library/server/libraryStore';
import { LIBRARY_MODEL_KEY, normalizeLibraryNumber } from '@/features/part-library/libraryTypes';
import { registerGeneratedModel } from '@/features/part-library/server/registerFlangeModel';

const unauthorized = () => Response.json({ error: '관리자 코드를 입력해 주세요.' }, { status: 401 });
const media = { glb: 'model/gltf-binary', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' } as const;
type Media = keyof typeof media;

function fileType(bytes: Buffer, kind: string): Media | null {
  if (kind === 'photo') {
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
    if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
  }
  return readGlbJson(bytes) ? 'glb' : null;
}

function readGlbJson(bytes: Buffer): Record<string, unknown> | null {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) return null;
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || jsonLength + 20 > bytes.length) return null;
  try {
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
    if (gltf.asset?.version !== '2.0') return null;
    // Only self-contained GLB assets may be rendered in the local application.
    const pending: unknown[] = [gltf];
    while (pending.length) {
      const entry = pending.pop();
      if (!entry || typeof entry !== 'object') continue;
      for (const [key, value] of Object.entries(entry)) {
        if (key === 'uri' && (typeof value !== 'string' || !value.startsWith('data:'))) return null;
        if (value && typeof value === 'object') pending.push(value);
      }
    }
    return gltf;
  } catch { return null; }
}

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!await hasLibraryAccess()) return unauthorized();
  const { key } = await params;
  if ((key !== 'flange' && key !== 'drawing') || request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  let bytes: Buffer;
  try { bytes = await readLimitedBody(request, 25 * 1024 * 1024); }
  catch { return Response.json({ error: '25 MB 이하의 GLB가 필요합니다.' }, { status: 413 }); }
  const gltf = readGlbJson(bytes);
  return gltf ? registerGeneratedModel(bytes, gltf) : Response.json({ error: '외부 파일 참조가 없는 GLB 2.0을 선택해 주세요.' }, { status: 400 });
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const isAssembly = new URL(request.url).searchParams.get('use') === 'assembly';
  if (isAssembly) {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || !LIBRARY_MODEL_KEY.test(key) ||
      !(await readLibrary()).some((row) => row.status === 'approved' && row.model?.key === key)) return new Response(null, { status: 404 });
  } else {
    if (!await hasLibraryAccess()) return unauthorized();
    if (!/^[\da-f-]{36}\.(glb|png|jpg|webp)$/.test(key) ||
      !(await readLibrary()).some((row) => row.model?.key === key || row.photo?.key === key)) return new Response(null, { status: 404 });
  }
  let bytes: Buffer;
  try { bytes = await readFile(join(libraryDirectory, key)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response(null, { status: 404 });
    throw error;
  }
  return new Response(new Uint8Array(bytes), { headers: {
    'Content-Type': media[key.split('.')[1] as Media], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
  } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!await hasLibraryAccess()) return unauthorized();
  const { key } = await params;
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (key !== 'model' && key !== 'photo')) return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  const query = new URL(request.url).searchParams;
  const number = normalizeLibraryNumber(query.get('number') ?? '');
  let bytes: Buffer;
  try { bytes = await readLimitedBody(request, (key === 'model' ? 25 : 8) * 1024 * 1024); }
  catch { return Response.json({ error: '파일 크기 제한을 확인하세요.' }, { status: 413 }); }
  const type = fileType(bytes, key);
  if (!type) return Response.json({ error: key === 'model' ? '외부 파일 참조가 없는 GLB 2.0을 선택해 주세요.' : 'PNG, JPEG 또는 WebP 사진을 선택해 주세요.' }, { status: 400 });
  try {
    const result = await updateLibrary(async (parts) => {
      const part = parts.find((row) => row.partNumber === number);
      if (!part) return null;
      const asset = { key: randomUUID() + '.' + type, name: (query.get('name') ?? '').slice(0, 200) };
      await writeFile(join(libraryDirectory, asset.key), bytes);
      part[key] = asset;
      part.history = [createHistory(part.revision, query.get('role'), key === 'model' ? '3D 모델 등록·교체' : '부품 사진 등록·교체'), ...part.history].slice(0, 100);
      return asset;
    });
    return result ? Response.json(result) : Response.json({ error: '등록된 부품을 찾지 못했습니다.' }, { status: 404 });
  } catch { return Response.json({ error: '파일을 저장하지 못했습니다.' }, { status: 500 }); }
}
