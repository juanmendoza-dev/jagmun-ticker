import { NextResponse } from 'next/server';
import { isDirector } from '@/lib/auth';
import { store } from '@/lib/db';
import { buildState, type SessionStatus } from '@/lib/state';

export const dynamic = 'force-dynamic';

const VALID: SessionStatus[] = ['PRE', 'OPEN', 'CLOSED'];

export async function POST(req: Request) {
  if (!(await isDirector())) return NextResponse.json({ error: 'passcode' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const status = body?.status as SessionStatus;
  if (!VALID.includes(status)) return NextResponse.json({ error: 'bad status' }, { status: 400 });

  const db = store();
  await db.setStatus(status);
  return NextResponse.json({ state: buildState(await db.moves(), status, db.ephemeral) });
}
