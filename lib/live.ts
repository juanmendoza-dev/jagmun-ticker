// The board must never look frozen. Between the dais's moves it keeps printing small
// changes, the way a real tape does — always display-only, never written to state.

/** Sigma and cap as fractions of the value, per print. */
export const COMPOSITE_NOISE = { sigma: 0.0012, cap: 0.0025 };
export const FIRM_NOISE = { sigma: 0.0025, cap: 0.006 };

/**
 * One step of mean-reverting noise. It pulls back toward zero every print, so the
 * displayed number wanders around the true value and can never walk away from it —
 * which is what keeps this honest as well as alive.
 */
export function nextNoise(
  prev: number,
  { sigma, cap }: { sigma: number; cap: number },
  rand: () => number = Math.random,
): number {
  const shock = (rand() * 2 - 1) * sigma;
  return clamp(prev * 0.78 + shock, -cap, cap);
}

/** Prints are irregular. A metronome reads as a progress bar, not a market. */
export function printDelay(min: number, max: number, rand: () => number = Math.random): number {
  return min + rand() * (max - min);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * The live session line. Samples of what the board is actually showing, so the chart
 * creeps along continuously instead of only stepping when the dais acts. Decimated
 * rather than truncated once it is long, so an eight-hour session keeps its whole shape
 * — `decimated` tells the caller to halve any indices it is holding into the series.
 */
export function pushSample(
  series: number[],
  value: number,
  max = 1200,
): { series: number[]; decimated: boolean } {
  const next = [...series, value];
  if (next.length <= max) return { series: next, decimated: false };
  return { series: next.filter((_, i) => i % 2 === 0), decimated: true };
}

/** Nice round gridline values covering [lo, hi], for the chart's price axis. */
export function gridLines(lo: number, hi: number, want = 5): number[] {
  const raw = (hi - lo) / want;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
