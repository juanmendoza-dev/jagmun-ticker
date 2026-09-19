import { NextResponse } from 'next/server';
import { isDirector } from '@/lib/auth';
import { TIERS, type TierName } from '@/lib/constants';
import { store } from '@/lib/db';
import { type Move, replay, resolveDelta } from '@/lib/derive';
import { buildState } from '@/lib/state';

export const dynamic = 'force-dynamic';

const GENERIC_UP = 'MARKETS RALLY ON COMMITTEE ACTION';
const GENERIC_DOWN = 'MARKETS SLIDE AS COMMITTEE STALLS';

export async function POST(req: Request) {
  if (!(await isDirector())) return NextResponse.json({ error: 'passcode' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const db = store();
  const moves = await db.moves();

  // A duplicate id is a phone retrying on bad wifi, not an error. Hand back current
  // state with a 200 so the director doesn't see a failure for a move that landed.
  if (moves.some((m) => m.id === body.id)) {
    return NextResponse.json({ state: buildState(moves, await db.status(), db.ephemeral) });
  }

  const composite = replay(moves);
  let move: Move;

  if (body.undo) {
    const target = [...moves].reverse().find((m) => !m.undoes && !isUndone(moves, m.id));
    if (!target) return NextResponse.json({ error: 'nothing to undo' }, { status: 409 });
    move = {
      id: body.id,
      // The exact negation of the stored points, which is why moves store points.
      delta: -target.delta,
      tier: target.tier,
      dir: (target.dir === 1 ? -1 : 1) as 1 | -1,
      headline: `CORRECTION: ${target.headline}`,
      author: String(body.author ?? 'dais').slice(0, 40),
      undoes: target.id,
      at: new Date().toISOString(),
    };
  } else {
    const tier = body.tier as TierName;
    const dir = body.dir === 1 ? 1 : body.dir === -1 ? -1 : null;
    if (!TIERS[tier] || dir === null) {
      return NextResponse.json({ error: 'bad tier' }, { status: 400 });
    }
    const headline = String(body.headline ?? '').trim().slice(0, 120);
    move = {
      id: body.id,
      delta: resolveDelta(composite, tier, dir),
      tier,
      dir,
      headline: headline ? `BREAKING: ${headline.toUpperCase()}` : dir > 0 ? GENERIC_UP : GENERIC_DOWN,
      author: String(body.author ?? 'dais').slice(0, 40),
      undoes: null,
      at: new Date().toISOString(),
    };
  }

  const inserted = await db.append(move);
  const fresh = inserted ? [...moves, move] : await db.moves();
  return NextResponse.json({ state: buildState(fresh, await db.status(), db.ephemeral) });
}

/** A move is already undone if some later move points at it. */
function isUndone(moves: Move[], id: string): boolean {
  return moves.some((m) => m.undoes === id);
}
