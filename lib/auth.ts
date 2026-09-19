import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'jag_director';

function secret(): string {
  return process.env.SESSION_SECRET ?? process.env.DIRECTOR_PASSCODE ?? 'dev-secret';
}

function passcode(): string {
  // Dev convenience only; in production the env var is required (see checkPasscode).
  return process.env.DIRECTOR_PASSCODE ?? 'jagmun';
}

function token(): string {
  return createHmac('sha256', secret()).update('director').digest('hex');
}

export function checkPasscode(entered: string): boolean {
  if (process.env.NODE_ENV === 'production' && !process.env.DIRECTOR_PASSCODE) return false;
  const a = Buffer.from(entered);
  const b = Buffer.from(passcode());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionCookie() {
  return {
    name: COOKIE,
    value: token(),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 3,
  };
}

/** Server-side gate. Hiding the panel UI is not the gate; this is. */
export async function isDirector(): Promise<boolean> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return false;
  const expected = token();
  return c.length === expected.length && timingSafeEqual(Buffer.from(c), Buffer.from(expected));
}
