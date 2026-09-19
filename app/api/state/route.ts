import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { buildState } from '@/lib/state';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const since = Number(new URL(req.url).searchParams.get('since') ?? -1);
  const db = store();
  const [moves, status] = await Promise.all([db.moves(), db.status()]);

  // Nothing new and the session hasn't been opened or closed: say so cheaply. The
  // client keeps rendering what it already has.
  if (since === moves.length) return NextResponse.json({ unchanged: true, status });

  return NextResponse.json({ state: buildState(moves, status, db.ephemeral) });
}
