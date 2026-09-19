// Everything on the board except the Composite itself is a pure function of the Composite.
// No director sets a share price, a gauge or a headline number.

import { COMPOSITE_OPEN, FIRMS, FLOOR, TIERS, type TierName } from './constants.ts';

export type Move = {
  id: string;
  /** Signed points actually applied, post-clamp. Never a percentage — see resolveDelta. */
  delta: number;
  tier: TierName;
  dir: 1 | -1;
  headline: string;
  author: string;
  /** Set on a move that undoes another, so the log can mark it. */
  undoes?: string | null;
  at: string;
};

/**
 * Turn a tier tap into points, against the Composite as it stands right now.
 *
 * The percentage exists only at this instant. What gets stored is points, because
 * undo appends the negation: -20% off 1000 is -200, and +200 gets you back to 1000,
 * where a stored +20% would only get you to 960.
 */
export function resolveDelta(composite: number, tier: TierName, dir: 1 | -1): number {
  const raw = composite * (TIERS[tier].pct / 100) * dir;
  const clamped = Math.max(FLOOR, composite + raw) - composite;
  return round2(clamped);
}

/**
 * Replay is a SUM, not a re-simulation. Deltas are stored post-clamp, so re-applying
 * the tier percentage or re-clamping per move here would double-apply them. Don't.
 */
export function replay(moves: Move[]): number {
  return round2(moves.reduce((c, m) => c + m.delta, COMPOSITE_OPEN));
}

export function priceOf(firmIndex: number, composite: number): number {
  const f = FIRMS[firmIndex];
  return round2(f.open * Math.pow(composite / COMPOSITE_OPEN, f.beta));
}

export type TapeEntry = {
  ticker: string;
  price: number;
  /** Change from this firm's opening price — same basis as the Composite's change from 1000. */
  pct: number;
  halted?: boolean;
};

export function tape(composite: number): TapeEntry[] {
  const entries: TapeEntry[] = FIRMS.map((f, i) => {
    const price = priceOf(i, composite);
    return { ticker: f.ticker, price, pct: round2(((price - f.open) / f.open) * 100) };
  });
  entries.push({ ticker: 'LEH', price: 0, pct: 0, halted: true });
  return entries;
}

export type Panic = 'LOW' | 'ELEVATED' | 'HIGH' | 'SEVERE';

export type Gauges = { jobs: number; homes: number; panic: Panic };

export function gauges(composite: number): Gauges {
  const d = Math.max(0, COMPOSITE_OPEN - composite) / COMPOSITE_OPEN;
  return {
    jobs: round2(4.8 + d * 12),
    homes: round2(0.5 + d * 3.5),
    panic:
      composite >= 950 ? 'LOW' : composite >= 850 ? 'ELEVATED' : composite >= 650 ? 'HIGH' : 'SEVERE',
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
