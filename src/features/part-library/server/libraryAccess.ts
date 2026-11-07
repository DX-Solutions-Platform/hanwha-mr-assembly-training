import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = 'hanwha_part_library';
const TTL = 60 * 60 * 8;
const globalState = globalThis as typeof globalThis & { hanwhaLibrarySessions?: Map<string, number>; hanwhaLibraryFailures?: number[] };
const sessions = globalState.hanwhaLibrarySessions ??= new Map();
const failures = globalState.hanwhaLibraryFailures ??= [];

export async function hasLibraryAccess() {
  const token = (await cookies()).get(COOKIE)?.value;
  return !!token && (sessions.get(token) ?? 0) > Date.now();
}

export async function unlockLibrary(code: unknown, secure: boolean) {
  const now = Date.now();
  while (failures.length && failures[0] < now - 60_000) failures.shift();
  if (failures.length >= 5) return 429;
  const expected = Buffer.from(process.env.PART_LIBRARY_ADMIN_CODE ?? '0000');
  const actual = Buffer.from(typeof code === 'string' && code.length <= 64 ? code : '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    failures.push(now);
    return 401;
  }
  for (const [token, expiry] of sessions) if (expiry <= now) sessions.delete(token);
  const jar = await cookies();
  sessions.delete(jar.get(COOKIE)?.value ?? '');
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, now + TTL * 1000);
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: TTL });
  return 200;
}

export async function lockLibrary() {
  const jar = await cookies();
  sessions.delete(jar.get(COOKIE)?.value ?? '');
  jar.delete(COOKIE);
}
