import { NextResponse } from 'next/server';
import { isDirector } from '@/lib/auth';
import { store } from '@/lib/db';
import { buildState } from '@/lib/state';

export const dynamic = 'force-dynamic';

/**
 * Wipe the session back to 1000.00 and PRE-MARKET. Between conferences, or after a
 * practice run. Unlike undo this is not reversible, which is why the panel makes you
 * tap twice for it and keeps it away from the tier buttons.
 */
export async function POST() {
  if (!(await isDirector())) return NextResponse.json({ error: 'passcode' }, { status: 401 });

  const db = store();
  await db.reset();
  return NextResponse.json({ state: buildState([], 'PRE', db.ephemeral) });
}
