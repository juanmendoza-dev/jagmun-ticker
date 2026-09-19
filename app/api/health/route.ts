import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Hit this once after deploying. It proves the database is attached and writable
 * before a room full of delegates is looking at the board.
 */
export async function GET() {
  // Names only, never values — enough to tell "no database attached" apart from
  // "attached under a name we don't read".
  const seen = Object.keys(process.env)
    .filter((k) => /POSTGRES|DATABASE|^PG/.test(k))
    .sort();
  try {
    const db = store();
    const moves = await db.moves();
    return NextResponse.json({
      ok: true,
      store: db.ephemeral ? 'memory (dev only)' : 'postgres',
      moves: moves.length,
      status: await db.status(),
      passcodeSet: Boolean(process.env.DIRECTOR_PASSCODE),
      seen,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown', seen },
      { status: 500 },
    );
  }
}
