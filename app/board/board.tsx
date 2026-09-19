'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPOSITE_OPEN,
  EXPLAINER,
  FLOOR,
  OPENING_CRAWL,
  TIER_ORDER,
  type TierName,
} from '@/lib/constants';
import { gauges, resolveDelta, tape } from '@/lib/derive';
import { type BoardState, GAVEL_IN } from '@/lib/state';
import './board.css';

const POLL_MS = 1500;
/** How long the board must go untouched before the idle wobble starts. */
const IDLE_AFTER_MS = 12_000;

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
        else if (body.status) setState((s) => (s.status === body.status ? s : { ...s, status: body.status }));
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

  const idle = status !== 'CLOSED' && Date.now() - lastMoveAt(state) > IDLE_AFTER_MS;
  const shown = useAnimatedComposite(composite, idle && status === 'OPEN');

  const g = gauges(composite);
  const entries = tape(composite);
  const change = composite - COMPOSITE_OPEN;
  const pct = (change / COMPOSITE_OPEN) * 100;

  // Only the recent ones. The rail scrolls in a fixed 90s, so letting this grow with
  // the session would have the crawl flying past unreadably by the afternoon. The full
  // log lives on the panel.
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
        <div className="tape">
          <div className="tape-rail">
            {[0, 1].map((copy) => (
              <div key={copy} style={{ display: 'flex' }} aria-hidden={copy === 1}>
                {entries.map((e) => (
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
                        <span>{e.price.toFixed(2)}</span>
                        <span className={dirClass(e.pct)}>{signed(e.pct, 1)}%</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="stage">
          <div className="masthead">
            <div className="title">JAG COMPOSITE</div>
            <div className={`chip ${status === 'CLOSED' ? 'closed' : ''}`}>
              <span className="dot" />
              {status === 'CLOSED' ? 'MARKET CLOSED' : status === 'PRE' ? 'PRE-MARKET' : 'IN SESSION'}
              <Clock />
            </div>
          </div>

          <div className="readout">
            <div className={`composite num ${change < 0 ? 'down' : change > 0 ? 'up' : ''}`}>
              {shown.toFixed(2)}
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
            <SessionChart points={state.chart} />
          </div>

          <div className="gauges">
            <Gauge label="JOBS" value={`${g.jobs.toFixed(1)}%`} bad={g.jobs > 4.8} />
            <Gauge label="HOMES LOST" value={`${g.homes.toFixed(2)}M`} bad={g.homes > 0.5} />
            <Gauge label="PUBLIC PANIC" value={g.panic} bad={g.panic !== 'LOW'} arrowless />
          </div>

          {bar && fresh && <div className={`bar ${fresh.dir > 0 ? 'good' : ''}`}>{fresh.headline}</div>}

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
  const x = (i: number) => (i / (series.length - 1)) * w;
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  const last = series[series.length - 1];
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
        stroke={last < COMPOSITE_OPEN ? 'var(--down)' : 'var(--up)'}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
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

/**
 * Eases the rendered number toward its target, which gives the ~1.5s count-up on a move.
 * While idle it also wobbles ±0.3% so the screen is never frozen during unmoderated
 * caucus. The wobble is display-only — it never touches stored state, or eight hours of
 * it would random-walk the index and replay could not reproduce the board.
 */
function useAnimatedComposite(target: number, drifting: boolean): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const wobble = useRef(0);
  const seeded = useRef(false);

  // A board opened mid-session should already be showing the real number, not count
  // up to it from the open. Only moves that land while we are watching animate.
  useEffect(() => {
    if (seeded.current || target === COMPOSITE_OPEN) return;
    seeded.current = true;
    current.current = target;
    setShown(target);
  }, [target]);

  useEffect(() => {
    if (!drifting) {
      wobble.current = 0;
      return;
    }
    const id = setInterval(() => {
      wobble.current = (Math.random() - 0.5) * 2 * 0.003 * target;
    }, 2600);
    return () => clearInterval(id);
  }, [drifting, target]);

  // A browser that isn't painting — minimised, on another desktop, screen asleep —
  // pauses requestAnimationFrame. Without this the headline number would sit at a stale
  // value until someone looked at it. Timers keep firing, so snap on them instead.
  const lastFrame = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (performance.now() - lastFrame.current < 1000) return;
      current.current = target;
      setShown(target);
    }, 700);
    return () => clearInterval(id);
  }, [target]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const step = (now: number) => {
      lastFrame.current = now;
      const dt = Math.min(now - prev, 100);
      prev = now;
      const goal = target + wobble.current;
      const k = 1 - Math.exp(-dt / 320);
      const next = current.current + (goal - current.current) * k;
      current.current = Math.abs(goal - next) < 0.005 ? goal : next;
      setShown(current.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return shown;
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

function lastMoveAt(s: BoardState): number {
  const at = s.moves[0]?.at;
  return at ? new Date(at).getTime() : 0;
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
    composite: Math.round((s.composite + delta) * 100) / 100,
    cursor: s.cursor + 1,
    moves: [move, ...s.moves],
    chart: [...s.chart, Math.round((s.composite + delta) * 100) / 100],
  };
}
