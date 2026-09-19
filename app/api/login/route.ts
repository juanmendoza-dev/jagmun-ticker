import { NextResponse } from 'next/server';
import { checkPasscode, sessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!checkPasscode(String(body?.passcode ?? ''))) {
    return NextResponse.json({ error: 'wrong passcode' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie());
  return res;
}
