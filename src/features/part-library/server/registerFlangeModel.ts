import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFlangeDraft } from '@/features/drawing-upload-dev/generate/flangeModel';
import { FLANGE_FIELD_LIST, type FlangeInputs } from '@/features/drawing-upload-dev/generate/flangeTypes';
import { normalizeLibraryNumber, toLibraryMatch, type LibraryPartInput } from '../libraryTypes';
import { createHistory, libraryDirectory, parseLibraryPart, updateLibrary } from './libraryStore';

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readRegistration(gltf: Record<string, unknown>) {
  if (!Array.isArray(gltf.nodes) || !Array.isArray(gltf.meshes) || !gltf.meshes.length) return null;
  const metadata = gltf.nodes.map((node) => record(record(node)?.extras)).filter((entry) =>
    entry?.generationMethod === 'parametric-flange-from-pdf' || entry?.generationMethod === 'outline-flange-from-pdf' ||
    entry?.generationMethod === 'drawing-outline-from-pdf' || entry?.generationMethod === 'step-stool-from-pdf' ||
    entry?.generationMethod === 'orthographic-hull-from-pdf' || entry?.generationMethod === 'isometric-blocks-from-pdf');
  const info = metadata.length === 1 ? metadata[0] : null;
  if (!info || info.modelRole === 'finished-product' || info.parameterUnit !== 'mm' || info.reviewStatus !== 'confirmed' ||
    typeof info.confirmedAt !== 'string' || !Number.isFinite(Date.parse(info.confirmedAt)) ||
    typeof info.documentSha256 !== 'string' || !/^[a-f\d]{64}$/.test(info.documentSha256) ||
    typeof info.documentName !== 'string' || !info.documentName.trim() || typeof info.sourcePage !== 'number' || !Number.isInteger(info.sourcePage) ||
    info.sourcePage < 1 || info.sourcePage > 200) return null;
  const part = record(info.part), parameters = record(info.parameters);
  if (!part || !parameters) return null;
  const { partNumber, name, material, quantity } = part;
  if (typeof partNumber !== 'string' || typeof name !== 'string' || typeof material !== 'string' || typeof quantity !== 'string') return null;
  if (!/^[1-9]\d{0,3}$/.test(quantity) && quantity !== '10000') return null;
  let dimensionList: LibraryPartInput['dimensionList'];
  if (info.template === 'isometric-blocks-v1' && info.generationMethod === 'isometric-blocks-from-pdf' ||
      info.template === 'orthographic-hull-v1' && info.generationMethod === 'orthographic-hull-from-pdf' ||
      info.template === 'step-stool-v1' && info.generationMethod === 'step-stool-from-pdf' ||
      info.template === 'drawing-outline-v1' && info.generationMethod === 'drawing-outline-from-pdf') {
    const axes = [['width', '가로'], ['height', '세로'], ['depth', info.template === 'drawing-outline-v1' ? '두께·깊이' : '깊이']] as const;
    if (axes.some(([axis]) => typeof parameters[axis] !== 'number' || parameters[axis] < .1 || parameters[axis] > 5000)) return null;
    dimensionList = axes.map(([axis, label]) => ({ value: label + ' ' + parameters[axis], unit: 'mm' }));
  } else {
    if (info.template !== 'flange-v1' || (info.generationMethod !== 'parametric-flange-from-pdf' && info.generationMethod !== 'outline-flange-from-pdf') ||
      FLANGE_FIELD_LIST.some(({ key }) => typeof parameters[key] !== 'number')) return null;
    const inputs = Object.fromEntries(FLANGE_FIELD_LIST.map(({ key }) => [key, String(parameters[key])])) as FlangeInputs;
    const { values } = parseFlangeDraft({ part: { partNumber: normalizeLibraryNumber(partNumber), name, material, quantity }, parameters: inputs });
    if (!values) return null;
    dimensionList = FLANGE_FIELD_LIST.map(({ key, symbol, unit }) => ({ value: symbol + ' ' + values.parameters[key], unit }));
  }
  return parseLibraryPart({
    partNumber, name, material, specification: '', category: 'custom',
    revision: 'A', status: 'approved', usage: info.documentName.slice(0, 2000),
    source: info.documentName.slice(0, 1850) + ' · ' + info.sourcePage + '쪽 · ' + info.documentSha256,
    dimensionList, appearance: info.appearance,
  });
}

export async function registerGeneratedModel(bytes: Buffer, gltf: Record<string, unknown>) {
  const registration = readRegistration(gltf);
  if (!registration) return Response.json({ error: '치수와 검토 확정 정보가 들어 있는 GLB가 필요합니다.' }, { status: 400 });
  let createdPath: string | undefined;
  try {
    const match = await updateLibrary(async (parts) => {
      const previous = parts.find((part) => part.partNumber === registration.partNumber);
      if (previous?.model) {
        const current = previous.status === 'approved' ? await readFile(join(libraryDirectory, previous.model.key)).catch(() => null) : null;
        return current?.equals(bytes) ? toLibraryMatch(previous) : null;
      }
      const model = { key: randomUUID() + '.glb', name: registration.partNumber.slice(0, 180) + '-drawing.glb' };
      createdPath = join(libraryDirectory, model.key);
      await writeFile(createdPath, bytes, { flag: 'wx' });
      const values: LibraryPartInput = previous ? {
        ...previous, material: registration.material, status: 'approved', appearance: registration.appearance ?? previous.appearance,
        dimensionList: [...registration.dimensionList, ...previous.dimensionList.filter(({ value }) => !registration.dimensionList.some((item) => value.startsWith(item.value.slice(0, item.value.lastIndexOf(' ') + 1))))],
        source: previous.source || registration.source,
      } : registration;
      const entry = { ...values, model, history: [createHistory(values.revision, undefined, 'PDF 모델 검토·GLB 등록 · ' + registration.usage.slice(0, 100)), ...(previous?.history ?? [])].slice(0, 100) };
      if (previous) parts[parts.indexOf(previous)] = entry;
      else parts.push(entry);
      return toLibraryMatch(entry);
    });
    return match ? Response.json({ match }) : Response.json({ error: '같은 부품번호에 GLB가 이미 등록되어 있습니다. 현재 라이브러리에서 확인해 주세요.' }, { status: 409 });
  } catch {
    if (createdPath) await unlink(createdPath).catch(() => {});
    return Response.json({ error: 'GLB를 라이브러리에 등록하지 못했습니다.' }, { status: 500 });
  }
}
