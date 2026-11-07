import { hasLibraryAccess } from '@/features/part-library/server/libraryAccess';
import { createHistory, parseLibraryPart, readLibrary, readLimitedBody, updateLibrary } from '@/features/part-library/server/libraryStore';
import { normalizeLibraryNumber, type LibraryPartInput } from '@/features/part-library/libraryTypes';
import { readModelAppearance } from '@/features/part-library/modelAppearance';

const unauthorized = () => Response.json({ error: '관리자 코드를 입력해 주세요.' }, { status: 401 });
export async function GET() {
  if (!await hasLibraryAccess()) return unauthorized();
  return Response.json({ parts: await readLibrary() });
}

export async function PATCH(request: Request) {
  if (!await hasLibraryAccess()) return unauthorized();
  if (request.headers.get('sec-fetch-site') === 'cross-site' || !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  let input;
  try { input = JSON.parse((await readLimitedBody(request, 4096)).toString('utf8')); }
  catch { return Response.json({ error: '외관 설정을 읽지 못했습니다.' }, { status: 400 }); }
  const appearance = readModelAppearance(input?.appearance);
  if (!input || typeof input.partNumber !== 'string' || input.partNumber.length > 200 || typeof input.material !== 'string' ||
    !input.material.trim() || input.material.length > 200 || (!appearance && input.appearance !== null)) return Response.json({ error: '부품번호·재질·외관을 확인해 주세요.' }, { status: 400 });
  try {
    const updated = await updateLibrary((parts) => {
      const part = parts.find((entry) => entry.partNumber === normalizeLibraryNumber(input.partNumber));
      if (!part) return false;
      part.material = input.material.trim();
      if (appearance) part.appearance = appearance;
      else delete part.appearance;
      part.history = [createHistory(part.revision, input.role, '재질·모델 외관 수정'), ...part.history].slice(0, 100);
      return true;
    });
    return updated ? Response.json({ ok: true }) : Response.json({ error: '등록된 부품을 찾지 못했습니다.' }, { status: 404 });
  } catch { return Response.json({ error: '외관을 저장하지 못했습니다.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await hasLibraryAccess()) return unauthorized();
  if (request.headers.get('sec-fetch-site') === 'cross-site' || !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  let input;
  try { input = JSON.parse((await readLimitedBody(request, 2_000_000)).toString('utf8')); }
  catch { return Response.json({ error: '등록할 정보를 읽지 못했습니다.' }, { status: 400 }); }
  if (!input || !Array.isArray(input.parts) || !input.parts.length || input.parts.length > 1000 || (input.replace === true && input.parts.length !== 1)) return Response.json({ error: '등록할 부품을 확인하세요.' }, { status: 400 });
  const parts = input.parts.map(parseLibraryPart) as (LibraryPartInput | null)[];
  if (parts.some((part) => !part) || new Set(parts.map((part) => part?.partNumber)).size !== parts.length) return Response.json({ error: '부품번호·품명·승인 재질을 확인해 주세요.' }, { status: 400 });
  try {
    const result = await updateLibrary((stored) => {
      const byNumber = new Map(stored.map((part, index) => [part.partNumber, index]));
      let saved = 0, skipped = 0;
      for (const part of parts as LibraryPartInput[]) {
        const index = byNumber.get(part.partNumber);
        const previous = index === undefined ? null : stored[index];
        if (previous && input.replace !== true) { skipped++; continue; }
        const history = createHistory(part.revision, input.role, previous ? '부품 정보 수정' : '부품 등록');
        const record = { ...previous, ...part, history: [history, ...(previous?.history ?? [])].slice(0, 100) };
        if (index === undefined) stored.push(record);
        else stored[index] = record;
        saved++;
      }
      return { saved, skipped };
    });
    return Response.json(result);
  } catch { return Response.json({ error: '라이브러리에 저장하지 못했습니다.' }, { status: 500 }); }
}
