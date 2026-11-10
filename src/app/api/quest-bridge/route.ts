import { openQuestBridge } from '@/features/drawing-upload/lesson-editor/server/questBridge';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  const host = request.headers.get('host');
  if (!/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(origin) ||
      (origin !== `http://${host}` && origin !== `https://${host}`) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ message: '교범을 만드는 PC에서 localhost로 접속해 주세요.' }, { status: 403 });
  }
  try {
    return Response.json({ address: await openQuestBridge(origin) });
  } catch (error) {
    console.error('Cannot start Quest bridge', error);
    return Response.json({ message: 'Quest 연결을 시작할 수 없습니다. 웹 서버를 확인해 주세요.' }, { status: 503 });
  }
}
