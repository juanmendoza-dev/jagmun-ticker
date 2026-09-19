import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPOSITE_NOISE, FIRM_NOISE, gridLines, nextNoise, printDelay, pushSample } from './live.ts';

test('noise never exceeds its cap, however long it runs', () => {
  let n = 0;
  for (let i = 0; i < 20_000; i++) {
    n = nextNoise(n, COMPOSITE_NOISE);
    assert.ok(Math.abs(n) <= COMPOSITE_NOISE.cap, `escaped at step ${i}: ${n}`);
  }
});

test('noise reverts toward the true value instead of walking away', () => {
  // With no fresh shocks it decays to nothing, so the board always comes home.
  let n = FIRM_NOISE.cap;
  for (let i = 0; i < 40; i++) n = nextNoise(n, FIRM_NOISE, () => 0.5);
  assert.ok(Math.abs(n) < 1e-6, `still at ${n}`);
});

test('a print is always smaller than the smallest move a director can make', () => {
  // Tier 1 is 1%. Noise must never be mistaken for somebody pressing a button.
  assert.ok(COMPOSITE_NOISE.cap * 2 < 0.01);
});

test('prints are irregular', () => {
  assert.equal(printDelay(400, 900, () => 0), 400);
  assert.equal(printDelay(400, 900, () => 1), 900);
});

test('the live series decimates rather than dropping its history', () => {
  let s: number[] = [];
  for (let i = 0; i < 5000; i++) s = pushSample(s, i, 100).series;
  assert.ok(s.length <= 100);
  assert.equal(s[0], 0, 'still starts at the session open');
  assert.ok(s[s.length - 1] > 4900, 'and ends at the latest print');
});

test('decimation is announced so held indices can be halved with it', () => {
  const short = pushSample([1, 2], 3, 100);
  assert.deepEqual(short, { series: [1, 2, 3], decimated: false });
  const full = pushSample([1, 2, 3], 4, 3);
  assert.equal(full.decimated, true);
  assert.deepEqual(full.series, [1, 3]);
});

test('gridlines land on round numbers inside the range', () => {
  const g = gridLines(847, 1012);
  assert.ok(g.length >= 3 && g.length <= 8, `got ${g.length}: ${g}`);
  assert.ok(g[0] >= 847 && g[g.length - 1] <= 1012);
  assert.ok(g.every((v) => Number.isInteger(v / (g[1] - g[0]))), 'evenly spaced round values');
});

test('gridlines survive a flat market', () => {
  assert.ok(gridLines(1000, 1000.2).length >= 1);
});
