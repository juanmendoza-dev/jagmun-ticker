import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPOSITE_OPEN, FLOOR } from './constants.ts';
import { type Move, gauges, replay, resolveDelta, tape } from './derive.ts';

function move(delta: number): Move {
  return { id: String(Math.random()), delta, tier: 'REAL', dir: 1, headline: '', author: 't', at: '' };
}

test('a fresh session sits at the open', () => {
  assert.equal(replay([]), COMPOSITE_OPEN);
});

test('replay is the sum of the deltas', () => {
  assert.equal(replay([move(-30), move(-80), move(12.5)]), 902.5);
});

test('a tier resolves against the composite as it stands', () => {
  assert.equal(resolveDelta(1000, 'SYSTEMIC', -1), -200);
  assert.equal(resolveDelta(800, 'SYSTEMIC', 1), 160);
  assert.equal(resolveDelta(1000, 'SMALL', -1), -10);
});

test('undo of a systemic move lands exactly back where it started', () => {
  const down = resolveDelta(1000, 'SYSTEMIC', -1);
  const after = replay([move(down)]);
  assert.equal(after, 800);
  // Undo appends the negation of the stored delta, not a +20% of 800.
  assert.equal(replay([move(down), move(-down)]), 1000);
});

test('a move clamped at the floor still undoes exactly', () => {
  const at = 450;
  const down = resolveDelta(at, 'SYSTEMIC', -1); // -90 raw, clamped to -50
  assert.equal(down, -50);
  assert.equal(at + down, FLOOR);
  assert.equal(at + down + -down, at);
});

test('a down move at the floor writes nothing and undoes to a no-op', () => {
  const down = resolveDelta(FLOOR, 'MAJOR', -1);
  assert.equal(down, 0);
  assert.equal(replay([move(down), move(-down)]), COMPOSITE_OPEN);
});

test('the floor holds', () => {
  let c = 1000;
  for (let i = 0; i < 40; i++) c += resolveDelta(c, 'SYSTEMIC', -1);
  assert.equal(c, FLOOR);
});

test('banks fall further than newspapers on the same swing', () => {
  const t = tape(847.3);
  const byTicker = Object.fromEntries(t.map((e) => [e.ticker, e]));
  assert.equal(byTicker.WFC.price, 23.36);
  assert.equal(byTicker.BAC.price, 16.95);
  assert.equal(byTicker.MCO.price, 26.93);
  assert.equal(byTicker.NYT.price, 12.17);
  assert.equal(byTicker.WPO.price, 363.96);
  assert.equal(byTicker.GE.price, 23.13);
  assert.ok(byTicker.BAC.pct < byTicker.WPO.pct);
});

test('nothing is green while the composite is down', () => {
  for (const e of tape(847.3)) assert.ok(e.pct <= 0, `${e.ticker} was up`);
});

test('at the open every firm sits at its opening price', () => {
  for (const e of tape(COMPOSITE_OPEN)) {
    if (e.halted) continue;
    assert.equal(e.pct, 0);
  }
});

test('lehman never moves', () => {
  const leh = tape(400).find((e) => e.ticker === 'LEH');
  assert.deepEqual(leh, { ticker: 'LEH', price: 0, pct: 0, halted: true });
});

test('gauges track the composite down', () => {
  assert.deepEqual(gauges(1000), { jobs: 4.8, homes: 0.5, panic: 'LOW' });
  assert.deepEqual(gauges(847.3), { jobs: 6.63, homes: 1.03, panic: 'HIGH' });
  assert.equal(gauges(900).panic, 'ELEVATED');
  assert.deepEqual(gauges(400), { jobs: 12, homes: 2.6, panic: 'SEVERE' });
});

test('a composite above the open does not improve the gauges', () => {
  assert.deepEqual(gauges(1200), { jobs: 4.8, homes: 0.5, panic: 'LOW' });
});
