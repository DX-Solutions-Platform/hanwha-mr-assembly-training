import { normalizeLibraryNumber, toLibraryMatch } from '@/features/part-library/libraryTypes';
import { readLibrary, readLimitedBody } from '@/features/part-library/server/libraryStore';

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  let numbers: unknown;
  try { ({ numbers } = JSON.parse((await readLimitedBody(request, 256_000)).toString('utf8'))); }
  catch { return Response.json({ error: '부품번호 목록을 읽지 못했습니다.' }, { status: 400 }); }
  if (!Array.isArray(numbers) || numbers.length > 1000 || numbers.some((value) => typeof value !== 'string' || value.length > 200)) return Response.json({ error: '부품번호 목록이 올바르지 않습니다.' }, { status: 400 });
  const wanted = new Set(numbers.map(normalizeLibraryNumber));
  const parts = (await readLibrary()).filter((part) => wanted.has(part.partNumber));
  return Response.json({
    matches: parts.filter((part) => part.status === 'approved').map(toLibraryMatch),
    existingModelNumbers: parts.filter((part) => part.model).map((part) => part.partNumber),
  });
}
