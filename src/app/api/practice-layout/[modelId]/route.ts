import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PRACTICE_CARD_IMAGE_LIMIT, PRACTICE_LAYOUT_ENTRY_LIMIT, PRACTICE_STAGE_CARD_LIMIT, readPracticeCaption, readPracticeCardChange, readPracticeTraySettings, type PracticeTraySettings } from '@/features/drawing-upload/practice/practiceTrayLayout';
import { readLimitedBody } from '@/features/part-library/server/libraryStore';

export const runtime = 'nodejs';
const directory = join(process.cwd(), 'data', 'practice-layouts');
const pendingWrites = new Map<string, Promise<PracticeTraySettings>>();
type Context = { params: Promise<{ modelId: string }> };

async function readSettings(modelId: string): Promise<PracticeTraySettings> {
  try {
    const data = JSON.parse(await readFile(join(directory, `${modelId}.json`), 'utf8'));
    const settings = data?.version === 1 ? readPracticeTraySettings(data) : null;
    if (!settings) throw new Error('Invalid practice settings');
    return settings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { positions: {}, trayOffsets: {}, captions: {}, cards: {} };
    throw error;
  }
}

async function writeSettings(modelId: string, settings: PracticeTraySettings) {
  const temporary = join(directory, `${modelId}-${randomUUID()}.tmp`);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(temporary, JSON.stringify({ version: 1, modelId, ...settings }, null, 2) + '\n', 'utf8');
    await rename(temporary, join(directory, `${modelId}.json`));
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

async function updateSettings(modelId: string, update: (saved: PracticeTraySettings) => PracticeTraySettings) {
  const pending = pendingWrites.get(modelId) ?? Promise.resolve();
  const next = pending.catch(() => {}).then(async () => {
    const settings = update(await readSettings(modelId));
    await writeSettings(modelId, settings);
    return settings;
  });
  pendingWrites.set(modelId, next);
  try {
    return await next;
  } finally {
    if (pendingWrites.get(modelId) === next) pendingWrites.delete(modelId);
  }
}

function isSettingsWrite(modelId: string, request: Request) {
  return /^[a-f0-9]{64}$/.test(modelId) && request.headers.get('sec-fetch-site') !== 'cross-site' &&
    request.headers.get('content-type')?.startsWith('application/json');
}

export async function GET(_request: Request, { params }: Context) {
  const { modelId } = await params;
  if (!/^[a-f0-9]{64}$/.test(modelId)) return Response.json({}, { status: 400 });
  try { return Response.json(await readSettings(modelId)); }
  catch { return Response.json({}, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Context) {
  const { modelId } = await params;
  if (!isSettingsWrite(modelId, request)) return Response.json({}, { status: 400 });
  let layout;
  try { layout = readPracticeTraySettings(JSON.parse((await readLimitedBody(request, 256_000)).toString('utf8'))); }
  catch { return Response.json({}, { status: 400 }); }
  if (!layout) return Response.json({}, { status: 400 });
  const { positions, trayOffsets } = layout;
  try { return Response.json(await updateSettings(modelId, (saved) => ({ ...saved, positions, trayOffsets }))); }
  catch { return Response.json({}, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: Context) {
  const { modelId } = await params;
  if (!isSettingsWrite(modelId, request)) return Response.json({}, { status: 400 });
  let payload: unknown;
  try { payload = JSON.parse((await readLimitedBody(request, PRACTICE_CARD_IMAGE_LIMIT + 12_000)).toString('utf8')); }
  catch { return Response.json({}, { status: 400 }); }
  const cardChange = readPracticeCardChange(payload);
  if (cardChange) {
    const { key, id } = cardChange;
    try {
      const updated = await updateSettings(modelId, (saved) => {
        const stage = { ...saved.cards[key] };
        const existing = stage[id];
        if (cardChange.geometry) {
          if (!existing) throw new Error('Card missing');
          stage[id] = { ...existing, ...cardChange.geometry };
        } else if (cardChange.card) {
          if (cardChange.keepGeometry && !existing) throw new Error('Card missing');
          stage[id] = cardChange.keepGeometry
            ? { ...cardChange.card, position: existing.position, size: existing.size }
            : cardChange.card;
        } else delete stage[id];
        const cards = { ...saved.cards };
        if (Object.keys(stage).length) cards[key] = stage;
        else delete cards[key];
        if (Object.keys(stage).length > PRACTICE_STAGE_CARD_LIMIT || Object.keys(cards).length > PRACTICE_LAYOUT_ENTRY_LIMIT) throw new Error('Card limit');
        return { ...saved, cards };
      });
      return Response.json({ key, id, card: updated.cards[key]?.[id] ?? null });
    } catch { return Response.json({}, { status: 500 }); }
  }
  const caption = readPracticeCaption(payload);
  if (!caption) return Response.json({}, { status: 400 });
  const { key, text } = caption;
  try {
    await updateSettings(modelId, (saved) => {
      if (!(key in saved.captions) && Object.keys(saved.captions).length >= PRACTICE_LAYOUT_ENTRY_LIMIT) throw new Error('Caption limit');
      return { ...saved, captions: { ...saved.captions, [key]: text } };
    });
    return Response.json(caption);
  } catch { return Response.json({}, { status: 500 }); }
}
