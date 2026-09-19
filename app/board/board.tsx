'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPOSITE_OPEN,
  EXPLAINER,
  FIRMS,
  FLOOR,
  OPENING_CRAWL,
  TIER_ORDER,
  type TierName,
} from '@/lib/constants';
import { gauges, resolveDelta, tape } from '@/lib/derive';
import { COMPOSITE_NOISE, FIRM_NOISE, nextNoise, printDelay, pushSample } from '@/lib/live';
import { type BoardState, GAVEL_IN } from '@/lib/state';
import './board.css';

const POLL_MS = 1500;
/** How long a move takes to count up before the number goes back to printing. */
const MOVE_MS = 1600;

export default function Board({ initial = GAVEL_IN }: { initial?: BoardState }) {
  const [state, setState] = useState<BoardState>(initial);
  const [offline, setOffline] = useState(false);
  const [denied, setDenied] = useState(false);
  const [explainerOverride, setExplainerOverride] = useState<boolean | null>(null);
  const [tier, setTier] = useState<TierName>('REAL');
  const synced = useRef(false);
  /** The newest move id at first sync — everything older than this is history. */
  const baseline = useRef<string | null>(null);

  useScaleToViewport();
  const { composite, status, moves } = state;
  const latest = moves[0];

  // Poll. On any failure we keep the last good state and keep rendering — the board
  // must survive the wifi dying mid-session (spec AC#7), not blank out.
  // After a local apply during an outage our cursor is ahead of the server's, so a
  // plain `since=cursor` could match by coincidence and answer "unchanged" — leaving
  // the projector quietly wrong for the rest of the session. Force a full resync.
  const diverged = useRef(false);
  const cursorRef = useRef(-1);
  cursorRef.current = synced.current && !diverged.current ? state.cursor : -1;
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/state?since=${cursorRef.current}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const body = await r.json();
        if (!alive) return;
        synced.current = true;
        if (body.state) {
          diverged.current = false;
          setState(body.state);
          if (!baseline.current) baseline.current = body.state.moves[0]?.id ?? 'none';
        }
        // An unchanged poll still carries the session status, which the dais can flip
        // between moves.
        else if (body.status)
          setState((s) => (s.status === body.status ? s : { ...s, status: body.status }));
        setOffline(false);
      } catch {
        if (alive) setOffline(true);
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Keyboard fallback for the board laptop, for when the wifi is gone and the phones
  // can't reach the server (spec §6.2). 1-4 pick a size, arrows fire it.
  const fire = useCallback(
    async (dir: 1 | -1) => {
      try {
        const r = await fetch('/api/move', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: crypto.randomUUID(), tier, dir, author: 'board' }),
        });
        // A 401 is not an outage. Applying locally here would move the projector and
        // nothing else, so refuse and say why: this laptop needs the passcode.
        if (r.status === 401) return setDenied(true);
        if (!r.ok) throw new Error(String(r.status));
        const body = await r.json();
        if (body.state) setState(body.state);
        setDenied(false);
      } catch {
        setOffline(true);
        diverged.current = true;
        setState((s) => applyLocally(s, tier, dir));
      }
    },
    [tier],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) return setTier(TIER_ORDER[n - 1]);
      if (e.key === 'ArrowUp') return void fire(1);
      if (e.key === 'ArrowDown') return void fire(-1);
      if (e.key.toLowerCase() === 'h') return setExplainerOverride((v) => !(v ?? preMarket.current));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fire]);

  // Pre-market, the board is the explainer — it's what delegates read while they file
  // in, and nobody has to remember to press a key for it. H overrides either way.
  const preMarket = useRef(false);
  preMarket.current = status === 'PRE';
  const explainer = explainerOverride ?? status === 'PRE';

  // The tape runs whenever the market is open. At the closing bell it freezes, which is
  // the whole point of a closing bell.
  const live = status !== 'CLOSED';
  const { shown, tick, moving } = useLiveComposite(composite, live);
  const series = useLiveSeries(state.chart, shown, live);

  const g = gauges(shown);
  const change = shown - COMPOSITE_OPEN;
  const pct = (change / COMPOSITE_OPEN) * 100;

  const headlines = useMemo(
    () => [...moves.slice(0, 8).map((m) => m.headline).filter(Boolean), ...OPENING_CRAWL],
    [moves],
  );

  // Reloading the projector an hour after a Systemic must not replay its breaking-news
  // takeover. Only moves that arrive after the first sync are choreographed.
  const fresh = latest && baseline.current && latest.id !== baseline.current ? latest : undefined;
  const takeover = useRecentMove(fresh?.id, fresh?.tier === 'SYSTEMIC' ? 7000 : 0);
  const bar = useRecentMove(fresh?.id, fresh?.tier === 'MAJOR' ? 10_000 : 0);
  const atFloor = composite <= FLOOR;
  const floorAlert = useRecentMove(atFloor ? 'floor' : undefined, atFloor ? 9000 : 0);

  return (
    <div className="shell">
      <div className="frame" id="frame">
        <Tape composite={composite} live={live} />

        <div className="stage">
          <div className="masthead">
            <div className="title">JAG COMPOSITE</div>
            <div className={`chip ${status === 'CLOSED' ? 'closed' : ''}`}>
              <span className="dot" />
              {status === 'CLOSED'
                ? 'MARKET CLOSED'
                : status === 'PRE'
                  ? 'PRE-MARKET'
                  : 'IN SESSION'}
              <Clock />
            </div>
          </div>

          <div className="readout">
            <div className="composite-row">
              <span
                key={tick.seq}
                className={`pip ${tick.dir > 0 ? 'up' : tick.dir < 0 ? 'down' : 'flat'}`}
              >
                {tick.dir > 0 ? '▲' : tick.dir < 0 ? '▼' : '·'}
              </span>
              <span
                className={`composite num ${moving ? 'counting' : ''} ${
                  change < 0 ? 'down' : change > 0 ? 'up' : ''
                }`}
              >
                {shown.toFixed(2)}
              </span>
              {/* Mirrors the pip so the number itself stays centred on the screen. */}
              <span className="pip-spacer" aria-hidden="true" />
            </div>
            <div
              key={latest?.id ?? 'open'}
              className={`change num flash ${change < 0 ? 'down' : change > 0 ? 'up' : ''}`}
            >
              {change === 0 ? '—' : `${change < 0 ? '▼' : '▲'} ${signed(change, 2)}`}
              {change !== 0 && ` (${signed(pct, 2)}%)`}
            </div>
            {status === 'CLOSED' && (
              <div className="closed-banner">MARKET CLOSED — {composite.toFixed(2)}</div>
            )}
            <SessionChart points={series} />
          </div>

          <div className="gauges">
            <Gauge label="JOBS" value={`${g.jobs.toFixed(1)}%`} bad={g.jobs > 4.8} />
            <Gauge label="HOMES LOST" value={`${g.homes.toFixed(2)}M`} bad={g.homes > 0.5} />
            <Gauge label="PUBLIC PANIC" value={g.panic} bad={g.panic !== 'LOW'} arrowless />
          </div>

          {bar && fresh && (
            <div className={`bar ${fresh.dir > 0 ? 'good' : ''}`}>{fresh.headline}</div>
          )}

          <div className="keyhint">
            1–4 SIZE · ↑↓ MOVE · H EXPLAINER — NOW: {tier}
            {denied ? ' · LOCKED — OPEN /panel AND ENTER THE PASSCODE' : offline ? ' · OFFLINE' : ''}
          </div>
          <div className="approx">VALUES APPROXIMATE</div>
          {state.ephemeral && <div className="warn">NO DATABASE — STATE WILL NOT SURVIVE</div>}

          {takeover && fresh && (
            <div className={`takeover ${fresh.dir > 0 ? 'good' : ''}`}>
              <div className="kicker">BREAKING</div>
              <div className="line">{strip(fresh.headline)}</div>
              <div className="move num">
                {fresh.dir > 0 ? '▲' : '▼'} {signed(fresh.delta, 2)} ON THE JAG COMPOSITE
              </div>
            </div>
          )}

          {floorAlert && (
            <div className="floor-alert">
              <div className="big">GREAT DEPRESSION II</div>
              <div className="sub">THE JAG COMPOSITE HAS HIT ITS FLOOR AT {FLOOR}</div>
            </div>
          )}

          {explainer && (
            <div className="explainer">
              <h2>HOW TO READ THIS BOARD</h2>
              <p>{EXPLAINER}</p>
            </div>
          )}
        </div>

        <div className="crawl">
          <div className="crawl-rail">
            {[0, 1].map((copy) => (
              <div key={copy} style={{ display: 'flex' }} aria-hidden={copy === 1}>
                {headlines.map((h, i) => (
                  <div key={`${copy}-${i}`} className="crawl-item">
                    {h.toUpperCase()}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── the tape ──────────────────────────────────────────────────────── */

/**
 * Each firm prints on its own clock, so the tape never moves in lockstep — that is the
 * difference between a market and a slideshow. Lehman is exempt: it is halted.
 */
function Tape({ composite, live }: { composite: number; live: boolean }) {
  const ticks = useFirmTicks(live);
  const base = tape(composite);

  const entries = base.map((e, i) => {
    if (e.halted) return e;
    const firm = FIRMS[i];
    const price = round2(e.price * (1 + ticks[i].noise));
    return { ...e, price, pct: round2(((price - firm.open) / firm.open) * 100) };
  });

  return (
    <div className="tape">
      <div className="tape-rail">
        {[0, 1].map((copy) => (
          <div key={copy} style={{ display: 'flex' }} aria-hidden={copy === 1}>
            {entries.map((e, i) => (
              <div key={e.ticker} className="tape-entry num">
                {e.halted ? (
                  <>
                    <span className="tk halted">{e.ticker}</span>
                    <span className="halted">0.00</span>
                    <span className="halted">HALTED</span>
                  </>
                ) : (
                  <>
                    <span className={`arrow ${dirClass(e.pct)}`}>
                      {e.pct < 0 ? '▼' : e.pct > 0 ? '▲' : '·'}
                    </span>
                    <span className="tk">{e.ticker}</span>
                    <span
                      key={`${ticks[i].seq}`}
                      className={
                        ticks[i].dir > 0 ? 'blip-up' : ticks[i].dir < 0 ? 'blip-down' : undefined
                      }
                    >
                      {e.price.toFixed(2)}
                    </span>
                    <span className={dirClass(e.pct)}>{signed(e.pct, 1)}%</span>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type Tick = { noise: number; dir: number; seq: number };

/** One independent, irregular print loop per firm. */
function useFirmTicks(live: boolean): Tick[] {
  const [ticks, setTicks] = useState<Tick[]>(() => FIRMS.map(() => ({ noise: 0, dir: 0, seq: 0 })));

  useEffect(() => {
    if (!live) return;
    const stops = FIRMS.map((_, i) => {
      let handle: ReturnType<typeof setTimeout>;
      const schedule = () => {
        handle = setTimeout(() => {
          setTicks((prev) => {
            const next = [...prev];
            const noise = nextNoise(prev[i].noise, FIRM_NOISE);
            next[i] = { noise, dir: Math.sign(noise - prev[i].noise), seq: prev[i].seq + 1 };
            return next;
          });
          schedule();
        }, printDelay(700, 2400));
      };
      schedule();
      return () => clearTimeout(handle);
    });
    return () => stops.forEach((stop) => stop());
  }, [live]);

  return ticks;
}

/* ── the headline number ───────────────────────────────────────────── */

/**
 * Two kinds of motion, deliberately different so the room can tell them apart:
 *
 * - **Prints.** Between moves the number keeps printing small changes at irregular
 *   intervals, mean-reverting around the true value. Capped well under a Tier 1 move,
 *   so a print can never be mistaken for the dais having done something.
 * - **Moves.** When the dais acts, the number counts smoothly to its new value over
 *   ~1.6s and the change line flashes.
 *
 * Neither ever writes to stored state — the server's number is the real one, and
 * replaying the moves still reproduces the board exactly.
 */
function useLiveComposite(target: number, live: boolean) {
  const [shown, setShown] = useState(target);
  const [tick, setTick] = useState({ dir: 0, seq: 0 });
  const [moving, setMoving] = useState(false);
  const eased = useRef(target);
  const noise = useRef(0);
  const movingUntil = useRef(0);
  const lastFrame = useRef(0);
  const seeded = useRef(false);

  // A board opened mid-session should already be showing the real number, not count
  // up to it from the open. Only moves that land while we are watching animate.
  useEffect(() => {
    if (seeded.current || target === COMPOSITE_OPEN) return;
    seeded.current = true;
    eased.current = target;
    setShown(target);
  }, [target]);

  useEffect(() => {
    movingUntil.current = performance.now() + MOVE_MS;
    setMoving(true);
    const id = setTimeout(() => setMoving(false), MOVE_MS);
    return () => clearTimeout(id);
  }, [target]);

  // The print loop runs on timers, not frames, so it keeps going when the browser stops
  // painting — a projector laptop that dozed off must not wake showing a stale number.
  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>;
    const print = () => {
      handle = setTimeout(
        () => {
          const now = performance.now();
          // If frames are paused the count-up can't ease, so land it here instead.
          if (now - lastFrame.current > 1000) eased.current = target;
          noise.current = live ? nextNoise(noise.current, COMPOSITE_NOISE) : 0;
          const value = eased.current + noise.current * target;
          setShown((prev) => {
            setTick((t) => ({ dir: Math.sign(round2(value) - round2(prev)), seq: t.seq + 1 }));
            return value;
          });
          print();
        },
        live ? printDelay(420, 1000) : 900,
      );
    };
    print();
    return () => clearTimeout(handle);
  }, [target, live]);

  // Frames only smooth the count-up between prints; they are never the source of truth.
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const step = (now: number) => {
      lastFrame.current = now;
      const dt = Math.min(now - prev, 100);
      prev = now;
      const k = 1 - Math.exp(-dt / 320);
      const next = eased.current + (target - eased.current) * k;
      eased.current = Math.abs(target - next) < 0.005 ? target : next;
      if (now < movingUntil.current) setShown(eased.current + noise.current * target);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return { shown, tick, moving };
}

/** Samples what the board is showing, so the session line creeps along continuously. */
function useLiveSeries(moveChart: number[], shown: number, live: boolean): number[] {
  const [series, setSeries] = useState<number[]>(moveChart);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  // A board opened mid-session starts from the real session so far, then grows.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || moveChart.length <= 1) return;
    seeded.current = true;
    setSeries(moveChart);
  }, [moveChart]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setSeries((s) => pushSample(s, shownRef.current)), 1200);
    return () => clearInterval(id);
  }, [live]);

  return series;
}

/* ── pieces ────────────────────────────────────────────────────────── */

function Gauge({
  label,
  value,
  bad,
  arrowless,
}: {
  label: string;
  value: string;
  bad: boolean;
  arrowless?: boolean;
}) {
  return (
    <div>
      <div className="gauge-label">{label}</div>
      <div className={`gauge-value num ${bad ? 'down' : ''}`}>
        <span>{value}</span>
        {!arrowless && bad && <span className="arrow down">▲</span>}
      </div>
    </div>
  );
}

function SessionChart({ points }: { points: number[] }) {
  const w = 1728;
  const h = 128;
  const series = points.length > 1 ? points : [COMPOSITE_OPEN, COMPOSITE_OPEN];
  const lo = Math.min(...series, COMPOSITE_OPEN) - 12;
  const hi = Math.max(...series, COMPOSITE_OPEN) + 12;
  // Inset so the pulsing head at the live end isn't half-clipped by the edge.
  const x = (i: number) => (i / (series.length - 1)) * (w - 14);
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  const last = series[series.length - 1];
  const down = last < COMPOSITE_OPEN;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <line
        x1={0}
        x2={w}
        y1={y(COMPOSITE_OPEN)}
        y2={y(COMPOSITE_OPEN)}
        stroke="var(--ink-faint)"
        strokeWidth={1.5}
        strokeDasharray="10 12"
      />
      <polyline
        points={series.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        fill="none"
        stroke={down ? 'var(--down)' : 'var(--up)'}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* The drawing end of the line, pulsing, so the eye knows it is still being drawn. */}
      <circle
        className="chart-head"
        cx={x(series.length - 1)}
        cy={y(last)}
        r={6}
        fill={down ? 'var(--down)' : 'var(--up)'}
      />
    </svg>
  );
}

function Clock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const set = () =>
      setT(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    set();
    const id = setInterval(set, 10_000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">{t}</span>;
}

/** True for `ms` after `key` changes. Drives the Major bar and the Systemic takeover. */
function useRecentMove(key: string | undefined, ms: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!key || ms <= 0) {
      setOn(false);
      return;
    }
    setOn(true);
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [key, ms]);
  return on;
}

/** Scale the 1920x1080 frame to fit whatever the projector actually is. */
function useScaleToViewport() {
  useEffect(() => {
    const fit = () => {
      const el = document.getElementById('frame');
      if (!el) return;
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      el.style.transform = `translate(${(window.innerWidth - 1920 * s) / 2}px, ${
        (window.innerHeight - 1080 * s) / 2
      }px) scale(${s})`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
}

/** The takeover already says BREAKING in 46px letters; it needn't say it twice. */
function strip(headline: string): string {
  return headline.replace(/^BREAKING:\s*/, '');
}

/** Zero is neither up nor down — at the open, nothing on the tape should read green. */
function dirClass(n: number): string {
  return n < 0 ? 'down' : n > 0 ? 'up' : 'flat';
}

function signed(n: number, dp: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(dp)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Last-resort local apply, used only when the POST failed and the room is watching. */
function applyLocally(s: BoardState, tier: TierName, dir: 1 | -1): BoardState {
  const delta = resolveDelta(s.composite, tier, dir);
  const move = {
    id: crypto.randomUUID(),
    delta,
    tier,
    dir,
    headline: dir > 0 ? 'MARKETS RALLY ON COMMITTEE ACTION' : 'MARKETS SLIDE AS COMMITTEE STALLS',
    author: 'board',
    at: new Date().toISOString(),
  };
  return {
    ...s,
    composite: round2(s.composite + delta),
    cursor: s.cursor + 1,
    moves: [move, ...s.moves],
    chart: [...s.chart, round2(s.composite + delta)],
  };
}
