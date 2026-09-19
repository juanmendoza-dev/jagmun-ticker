import { COMPOSITE_OPEN } from './constants.ts';
import { type Move, replay, round2 } from './derive.ts';

export type SessionStatus = 'PRE' | 'OPEN' | 'CLOSED';

export type BoardState = {
  composite: number;
  /** Number of moves applied. The polling cursor is just this number. */
  cursor: number;
  status: SessionStatus;
  /** Newest first. */
  moves: Move[];
  /** The Composite after each move, starting at the open. Shape for the session chart. */
  chart: number[];
  /** True only if the server is running without a database, which must never happen in prod. */
  ephemeral?: boolean;
};

export function buildState(
  moves: Move[],
  status: SessionStatus,
  ephemeral?: boolean,
): BoardState {
  const chart = [COMPOSITE_OPEN];
  let c = COMPOSITE_OPEN;
  for (const m of moves) {
    c = round2(c + m.delta);
    chart.push(c);
  }
  return {
    composite: replay(moves),
    cursor: moves.length,
    status,
    moves: [...moves].reverse(),
    chart,
    ephemeral,
  };
}

export const GAVEL_IN: BoardState = buildState([], 'PRE');
