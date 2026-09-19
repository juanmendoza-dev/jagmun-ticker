'use client';

import { useEffect, useRef, useState } from 'react';
import { COMPOSITE_OPEN, TIERS, TIER_ORDER, type TierName } from '@/lib/constants';
import { type BoardState, GAVEL_IN, type SessionStatus } from '@/lib/state';
import './panel.css';

const POLL_MS = 3000;

export default function Panel({ authed }: { authed: boolean }) {
  const [inside, setInside] = useState(authed);
  return inside ? <Controls /> : <Gate onIn={() => setInside(true)} />;
}

function Gate({ onIn }: { onIn: () => void }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passcode: code }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) onIn();
    else setErr('Wrong passcode.');
  };

  return (
    <form className="gate" onSubmit={submit}>
      <div className="title">JAG COMPOSITE · DAIS</div>
      <input
        type="password"
        inputMode="text"
        autoFocus
        placeholder="passcode"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn wide" type="submit" disabled={busy || !code}>
        ENTER
      </button>
      {err && <div className="err">{err}</div>}
    </form>
  );
}

function Controls() {
  const [state, setState] = useState<BoardState>(GAVEL_IN);
  const [headline, setHeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const synced = useRef(false);
  const cursor = useRef(-1);
  cursor.current = synced.current ? state.cursor : -1;

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/state?since=${cursor.current}`, { cache: 'no-store' });
        const body = await r.json();
        if (!alive || !r.ok) return;
        synced.current = true;
        if (body.state) setState(body.state);
        else if (body.status)
          setState((s) => (s.status === body.status ? s : { ...s, status: body.status }));
      } catch {
        /* keep what we have */
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), ...payload }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error ?? 'failed');
      setState(body.state);
      setHeadline('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(false);
      setArmed(null);
    }
  };

  /**
   * Systemic is a fifth of the economy in one tap, so it asks twice — tap once to arm,
   * again to fire. Everything smaller fires immediately; undo is right there.
   */
  const tap = (tier: TierName, dir: 1 | -1) => {
    const key = `${tier}${dir}`;
    if (tier === 'SYSTEMIC' && armed !== key) {
      setArmed(key);
      return;
    }
    void post({ tier, dir, headline });
  };

  const setStatus = async (status: SessionStatus) => {
    const r = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (r?.ok) setState((await r.json()).state);
  };

  const change = state.composite - COMPOSITE_OPEN;
  const undoneIds = new Set(state.moves.map((m) => m.undoes).filter(Boolean));

  return (
    <div className="panel">
      {state.ephemeral && (
        <div className="warn-strip">
          No database attached — moves live in memory and vanish on redeploy. Fine for trying it
          out, not for the conference.
        </div>
      )}

      <div className="panel-head">
        <div className="title">JAG COMPOSITE</div>
        <div className={`value num ${change < 0 ? 'down' : change > 0 ? 'up' : ''}`}>
          {state.composite.toFixed(2)}
        </div>
        <div className={`delta num ${change < 0 ? 'down' : change > 0 ? 'up' : ''}`}>
          {change === 0
            ? '—'
            : `${change < 0 ? '▼' : '▲'} ${signed(change)} (${signed((change / COMPOSITE_OPEN) * 100)}%)`}
        </div>
        <div className="status">
          {state.status === 'OPEN' ? 'IN SESSION' : state.status === 'CLOSED' ? 'MARKET CLOSED' : 'PRE-MARKET'}
        </div>
      </div>

      <div className="section-label">
        <span>ADD TO THE ECONOMY</span>
        <span>TAKE AWAY</span>
      </div>

      <div className="grid">
        {TIER_ORDER.map((tier) => (
          <Pair
            key={tier}
            tier={tier}
            armed={armed}
            busy={busy}
            onTap={tap}
          />
        ))}
      </div>

      <div className="headline-row">
        <label htmlFor="hl">HEADLINE — OPTIONAL</label>
        <input
          id="hl"
          type="text"
          placeholder="bailout passed"
          value={headline}
          maxLength={120}
          onChange={(e) => setHeadline(e.target.value)}
        />
      </div>

      <button
        className="btn wide"
        disabled={busy || state.cursor === 0}
        onClick={() => void post({ undo: true })}
      >
        ↶ UNDO LAST
      </button>

      {err && <div className="note down">{err}</div>}
      {armed && <div className="note">Tap again to confirm — that is a fifth of the economy.</div>}

      <div className="log">
        <h2>RECENT</h2>
        {state.moves.length === 0 && <div className="note">Nothing yet. The market is at its open.</div>}
        {state.moves.slice(0, 14).map((m) => (
          <div key={m.id} className={`row ${undoneIds.has(m.id) ? 'undone' : ''}`}>
            <span className="t num">{clock(m.at)}</span>
            <span className={m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : 'halted'}>
              {m.delta > 0 ? '▲' : m.delta < 0 ? '▼' : '·'}
            </span>
            <span className="num">{signed(m.delta)}</span>
            <span className="what">{m.undoes ? 'undone' : m.headline.replace(/^BREAKING: /, '')}</span>
          </div>
        ))}
      </div>

      <div className="session">
        {(['PRE', 'OPEN', 'CLOSED'] as SessionStatus[]).map((s) => (
          <button
            key={s}
            className={state.status === s ? 'on' : ''}
            onClick={() => void setStatus(s)}
          >
            {s === 'PRE' ? 'PRE-MARKET' : s === 'OPEN' ? 'OPEN' : 'CLOSE'}
          </button>
        ))}
      </div>
    </div>
  );
}

function Pair({
  tier,
  armed,
  busy,
  onTap,
}: {
  tier: TierName;
  armed: string | null;
  busy: boolean;
  onTap: (t: TierName, d: 1 | -1) => void;
}) {
  return (
    <>
      {([1, -1] as const).map((dir) => (
        <button
          key={dir}
          className={`btn ${dir > 0 ? 'up' : 'down'} ${armed === `${tier}${dir}` ? 'armed' : ''}`}
          disabled={busy}
          onClick={() => onTap(tier, dir)}
        >
          <span>{dir > 0 ? '▲' : '▼'}</span>
          <span>{tier}</span>
          <span className="pct num">
            {dir > 0 ? '+' : '−'}
            {TIERS[tier].pct}%
          </span>
        </button>
      ))}
    </>
  );
}

function signed(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}`;
}

function clock(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
