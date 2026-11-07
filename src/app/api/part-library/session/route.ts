import { lockLibrary, unlockLibrary } from '@/features/part-library/server/libraryAccess';
import { readLimitedBody } from '@/features/part-library/server/libraryStore';

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  try {
    const { code } = JSON.parse((await readLimitedBody(request, 1024)).toString('utf8'));
    const status = await unlockLibrary(code, new URL(request.url).protocol === 'https:');
    return Response.json(status === 200 ? { ok: true } : { error: status === 429 ? '입력 횟수를 초과했습니다. 1분 뒤 다시 시도하세요.' : '관리자 코드가 맞지 않습니다.' }, { status });
  } catch { return Response.json({ error: '관리자 코드를 입력해 주세요.' }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  await lockLibrary();
  return Response.json({ ok: true });
}
