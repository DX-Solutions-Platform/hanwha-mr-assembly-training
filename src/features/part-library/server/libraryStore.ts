import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CATEGORY_LABEL, ROLE_LIST, normalizeLibraryNumber, type LibraryPart, type LibraryPartInput, type LibraryRole } from '../libraryTypes';
import { readModelAppearance } from '../modelAppearance';

export const libraryDirectory = process.env.PART_LIBRARY_DATA_DIR || join(process.cwd(), 'data', 'part-library');
const databasePath = join(libraryDirectory, 'parts.json');
const globalState = globalThis as typeof globalThis & { hanwhaLibraryWrites?: Promise<unknown> };
export async function readLibrary(): Promise<LibraryPart[]> {
  try { return JSON.parse(await readFile(databasePath, 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export function updateLibrary<T>(update: (parts: LibraryPart[]) => Promise<T> | T): Promise<T> {
  const write = (globalState.hanwhaLibraryWrites ?? Promise.resolve()).then(async () => {
    const parts = await readLibrary();
    await mkdir(libraryDirectory, { recursive: true });
    const result = await update(parts);
    const temporary = join(libraryDirectory, randomUUID() + '.tmp');
    await writeFile(temporary, JSON.stringify(parts, null, 2), 'utf8');
    await rename(temporary, databasePath);
    return result;
  });
  globalState.hanwhaLibraryWrites = write.catch(() => {});
  return write;
}

export function parseLibraryPart(raw: unknown): LibraryPartInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const read = (key: string, limit = 2000) => {
    const value = row[key];
    if (typeof value !== 'string' || value.length > limit) throw new Error('Invalid part field');
    return value.trim();
  };
  try {
    const partNumber = normalizeLibraryNumber(read('partNumber', 200));
    const name = read('name');
    const category = read('category') as LibraryPartInput['category'];
    const status = read('status') as LibraryPartInput['status'];
    if (!partNumber || !name || /^미지정 부품\s/.test(name) || !Object.hasOwn(CATEGORY_LABEL, category) || !['approved', 'pending'].includes(status)) return null;
    const material = read('material');
    if (status === 'approved' && !material) return null;
    if (!Array.isArray(row.dimensionList) || row.dimensionList.length > 1000) return null;
    const dimensionList = row.dimensionList.map((dimension) => {
      if (!dimension || typeof dimension.value !== 'string' || !dimension.value.trim() || dimension.value.length > 300 || typeof dimension.unit !== 'string' || !dimension.unit.trim() || dimension.unit.length > 40) throw new Error('Invalid dimension');
      return { value: dimension.value.trim(), unit: dimension.unit.trim() };
    });
    const appearance = row.appearance === undefined ? undefined : readModelAppearance(row.appearance);
    if (appearance === null) return null;
    const { assemblyAction } = row;
    if (assemblyAction !== undefined && assemblyAction !== null && assemblyAction !== 'place' && assemblyAction !== 'fasten') return null;
    return { partNumber, name, material, category, status, specification: read('specification'), revision: read('revision', 32) || 'A', source: read('source'), usage: read('usage'), dimensionList, ...(appearance ? { appearance } : {}), ...(assemblyAction !== undefined ? { assemblyAction } : {}) };
  } catch {
    return null;
  }
}

export function createHistory(revision: string, role: unknown, action: string) {
  return { date: new Date().toISOString(), revision, role: ROLE_LIST.includes(role as LibraryRole) ? role as LibraryRole : ROLE_LIST[0], action };
}

export async function readLimitedBody(request: Request, maximum: number) {
  if (!request.body || Number(request.headers.get('content-length')) > maximum) throw new Error('파일 크기 제한을 초과했습니다.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return Buffer.concat(chunks);
      length += value.length;
      if (length > maximum) {
        await reader.cancel();
        throw new Error('파일 크기 제한을 초과했습니다.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
}
