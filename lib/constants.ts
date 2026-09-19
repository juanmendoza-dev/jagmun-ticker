// The gavel-in snapshot. Every starting value the board has lives here, so restarting
// the app mid-conference reproduces minute zero exactly (spec AC#8).

export const COMPOSITE_OPEN = 1000;

/** Great Depression II. The Composite cannot go below it. */
export const FLOOR = 400;

export type TierName = 'SMALL' | 'REAL' | 'MAJOR' | 'SYSTEMIC';

/** The four sizes on the panel. A director never types a number. */
export const TIERS: Record<TierName, { pct: number; label: string }> = {
  SMALL: { pct: 1, label: 'SMALL' },
  REAL: { pct: 3, label: 'REAL' },
  MAJOR: { pct: 8, label: 'MAJOR' },
  SYSTEMIC: { pct: 20, label: 'SYSTEMIC' },
};

export const TIER_ORDER: TierName[] = ['SMALL', 'REAL', 'MAJOR', 'SYSTEMIC'];

export type Firm = {
  ticker: string;
  name: string;
  open: number;
  /** How far this firm moves on a given swing in the Composite. Banks > newspapers. */
  beta: number;
};

export const FIRMS: Firm[] = [
  { ticker: 'WFC', name: 'Wells Fargo', open: 28.5, beta: 1.2 },
  { ticker: 'BAC', name: 'Bank of America', open: 22.1, beta: 1.6 },
  { ticker: 'MCO', name: "Moody's", open: 33.4, beta: 1.3 },
  { ticker: 'NYT', name: 'New York Times Co.', open: 13.9, beta: 0.8 },
  { ticker: 'WPO', name: 'Washington Post Co.', open: 402.0, beta: 0.6 },
  { ticker: 'GE', name: 'General Electric', open: 27.3, beta: 1.0 },
];

/** Lehman. Permanently halted, grey, no arrow. Costs nothing and sets the tone. */
export const LEHMAN = { ticker: 'LEH', name: 'Lehman Brothers' };

export const HEADLINE_UP = 'MARKETS RALLY ON COMMITTEE ACTION';
export const HEADLINE_DOWN = 'MARKETS SLIDE AS COMMITTEE STALLS';

/** Seeded so the crawl is never empty at gavel-in. */
export const OPENING_CRAWL = [
  'BREAKING: TREASURY STALLS ON RESCUE PACKAGE',
  'MARKETS SLIDE AS CONGRESS DELAYS VOTE',
  "MOODY'S PLACES BANK OF AMERICA ON REVIEW FOR DOWNGRADE",
  'SEC WEIGHS EMERGENCY BAN ON SHORT SELLING OF FINANCIALS',
  'FED EXTENDS EMERGENCY LENDING WINDOW',
];

export const EXPLAINER = `Big number is the economy. It starts at 1000 — higher is better. Under it: how many people have jobs, how many families are losing their homes, and how panicked the public is. Up top, the banks and newspapers you're running. When this committee does something good, the number goes up. When it does something bad, it goes down. That's it.`;
