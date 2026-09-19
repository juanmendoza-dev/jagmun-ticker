# JAG Composite Board — Spec v2

Live market display for the **2008 Financial Stock Market Crash** crisis committee at JAGMUN III.
Crisis Director: Juan Mendoza.

> **This is the whole spec.** One board on the projector, one admin panel on the directors'
> phones, hosted on Vercel. v1 was much bigger and is deliberately gone — see [§9](#9-what-v1-had-that-this-doesnt).

---

## 1. The entire product, in one paragraph

A projector shows one number: the **JAG Composite**, opening at `1000.00`. Directors open an
admin panel on their phone, judge how the committee is doing — quality of debate, quality of the
backrooms, overall flow — and add points to the economy or take them away. The board reacts: the
number moves, the firm tape moves with it, a headline scrolls. Nothing else in the system needs a
decision from anybody.

Two rules govern every choice below:

1. **One number.** Committee performance and the simulated economy are the same number. Good
   committee, market up. Bad committee, market down.
2. **Directors press one of eight buttons.** Up or down, at four sizes. No typing a number, no
   per-firm controls, no forms. If a thing isn't one of those eight buttons, the board derives it.

---

## 2. The board (`/board`)

Fixed 16:9, dark ground, runs unattended on a projector for eight hours. Three bands: the top and
bottom never stop moving, the middle is the number.

```
┌───────────────────────────────────────────────────────────────┐
│ ▼WFC 23.36 -18.0%  ▼BAC 16.95 -23.3%  ▼MCO 26.93 -19.4% ...  │  TAPE
├───────────────────────────────────────────────────────────────┤
│ JAG COMPOSITE                                                 │
│ ▼ 847.30   ▼ -152.70 (-15.27%)                                │  quote line
│  ····················································· OPEN 1000
│  ╲                                              ┌──────┐      │
│   ╲___●___                                      │847.30│      │  THE CHART
│           ╲______●________╱▔▔▔╲____●______      └──────┘      │
│  09:12                                    11:48              │
│  JOBS 6.63% ▲      HOMES LOST 1.03M ▲      PUBLIC PANIC HIGH  │
├───────────────────────────────────────────────────────────────┤
│ BREAKING: TREASURY STALLS ON RESCUE PACKAGE                   │  CRAWL
└───────────────────────────────────────────────────────────────┘
```

- **The chart is the middle of the board**, not a sparkline under a number. Filled area under the
  line, a price axis down the right, the 1000 open drawn and labelled, a tag riding the live value,
  a pulsing head at the drawing end, and a ring on the line at every point where a director
  actually moved the market. It is a market chart, and it should read as one from the back of the
  room. At the debrief a delegate can point at a step and say *that's when we let the bank fail*.
- **The Composite** — a quote line above the chart, ≥ 120px. Opens at `1000.00`. This is the only
  fact a delegate needs: *we started at a thousand, we're at 847, higher is better.*
- **The change** — beside it, from the 1000.00 open, with arrow and sign.
- **Three gauges** — jobs, homes lost, public panic. Derived ([§4](#4-everything-else-is-derived)),
  not controlled.
- **Tape** — the six firms plus `LEH 0.00 HALTED`, scrolling, seamless loop. Derived. Each
  percentage is change from that firm's opening price, the same basis as the Composite's change
  from 1000 — not change since the last move, which would flicker.
- **Crawl** — headlines, most recent first, scrolling, business-news register.
- **Status chip** — `IN SESSION` plus a clock, so the room knows this is live and not a slide.
- **`VALUES APPROXIMATE`** — small, low-contrast, always present. Opening share prices are
  historically plausible but unverified, and this is going in front of a faculty advisor.

### 2.1 Visual rules (non-negotiable)

- **Dark ground, always.** No light theme, no toggle. A light theme washes out on cheap AV.
- **Never color alone.** Every up/down value carries an arrow (`▲`/`▼`) *and* a sign. Some
  delegates are colorblind and red/green is not a universal convention.
- **Tabular figures everywhere** (`font-variant-numeric: tabular-nums`) so digits don't jitter.
- **Color means one thing each:** green up, red down, grey halted. Nothing else gets color.
- **The board never stops printing.** Not "it animates when the dais acts" — a market that only
  moves on command reads as a slide. Between moves the Composite keeps printing new values at
  irregular intervals (~0.4–1.0s), every firm on the tape prints on its own separate clock
  (~0.7–2.4s) and lights its cell as it does, the session line keeps being drawn, and a direction
  pip beside the headline number flips with each print. Something is always moving.
- **Prints are display-only and bounded.** The noise is mean-reverting and capped at ±0.25% for
  the Composite, ±0.6% for a firm, so the display wanders around the true value and can never walk
  away from it. It never touches stored state — otherwise eight hours of wobble would random-walk
  the index and replay could not reproduce the board.
- **A print must never be mistaken for a move.** The cap is well under a Tier 1 (±1%), and a real
  move additionally counts up over ~1.6s, flashes, and writes a headline. Two vocabularies, so the
  room can tell "the market is alive" from "we just did something."
- Respect `prefers-reduced-motion` on the continuous scrollers.

### 2.2 Motion

| Size | Board behavior |
|---|---|
| *(between moves)* | The tape prints continuously — see §2.1. Never nothing. |
| Small / Real | Number counts to its new value over ~1.5s, flashing its direction color. |
| Major | Same, harder flash, plus a full-width headline bar for ~10s. |
| Systemic | Breaking-news takeover: headline full screen, the move, then back. A ±20% move should stop conversation in the room. |

Every move writes a headline to the crawl. Optional but high value: an opening bell, a closing
bell, and one klaxon reserved for Systemic. Nothing else, or it becomes noise.

---

## 3. The admin panel (`/panel`)

One page, phone-first, behind a passcode. Usable one-handed, standing, without instructions.

```
┌─────────────────────────────────────────────┐
│            JAG COMPOSITE                    │
│              847.30                         │
│            ▼ -152.70  (-15.27%)             │
│                                             │
│   ADD TO THE ECONOMY   TAKE AWAY            │
│   ┌─────────────┐   ┌─────────────┐         │
│   │  ▲  SMALL   │   │  ▼  SMALL   │  ±1%    │
│   │  ▲  REAL    │   │  ▼  REAL    │  ±3%    │
│   │  ▲  MAJOR   │   │  ▼  MAJOR   │  ±8%    │
│   │  ▲ SYSTEMIC │   │  ▼ SYSTEMIC │  ±20%   │
│   └─────────────┘   └─────────────┘         │
│                                             │
│   HEADLINE  [ optional, one line ]          │
│                                             │
│   ↶ UNDO LAST                               │
├─────────────────────────────────────────────┤
│ RECENT                                      │
│ 15:42  ▼ REAL    committee stalling         │
│ 15:38  ▲ MAJOR   strong backroom deal       │
└─────────────────────────────────────────────┘
```

Eight buttons, a text field, an undo, a log. That is the entire control surface.

| Size | Move | When a director reaches for it |
|---|---|---|
| Small | ±1% | A speech landed, or the room went quiet. Nudges. |
| Real | ±3% | A directive with teeth passed, or debate is visibly dragging. |
| Major | ±8% | A serious bloc deal came out of the backrooms, or the committee fell apart. |
| Systemic | ±20% | The session-defining moment, good or bad. Rare — a handful per conference. |

**Headline** is one optional text field. Type `bailout passed` and the crawl reads
`BREAKING: BAILOUT PASSED`. Leave it blank and a generic line is used
(`MARKETS RALLY ON COMMITTEE ACTION` / `MARKETS SLIDE AS COMMITTEE STALLS`). No canned-reason
menus, no pools — a director who has three seconds types nothing and taps a button.

**Undo** appends a reversing move rather than rewriting history, so the log stays honest and the
board animates back. One tap. A phone in a dim room produces fat-fingers; this is not optional.

**A move is stored as points, not as a percentage.** The tier is a percentage at the instant the
director taps — resolved against the current Composite, clamped at the floor — and what gets
written is the signed point delta actually applied. Undo appends its exact negation. Storing the
percentage instead would break undo outright: −20% off 1000 is 800, and +20% off 800 is 960, not
1000.

**Session control** sits at the bottom, small and out of the way: `OPEN` / `CLOSE`. Closing
freezes the board at `MARKET CLOSED — 847.30`; opening the next session resumes from that close.
If directors want the market to gap overnight, they tap a move before gavelling in.

---

## 4. Everything else is derived

No director ever sets a share price, a gauge, or a firm's health. All of it is a pure function of
the Composite, computed on render. This is what keeps the system at zero complexity while still
looking like a market.

**Firm prices.** Each firm has an opening price and a sensitivity, both committed constants:

```
price = open_price × (composite / 1000) ^ beta
```

| Ticker | Company | Open | Beta |
|---|---|---|---|
| `WFC` | Wells Fargo | 28.50 | 1.2 |
| `BAC` | Bank of America | 22.10 | 1.6 |
| `MCO` | Moody's | 33.40 | 1.3 |
| `NYT` | New York Times Co. | 13.90 | 0.8 |
| `WPO` | Washington Post Co. | 402.00 | 0.6 |
| `GE`  | General Electric | 27.30 | 1.0 |

Banks fall faster than newspapers, which is both true and legible on the tape without anybody
configuring it. `LEH` is pinned at `0.00 / HALTED`, grey, no arrow, always in the tape — it costs
nothing and is a standing reminder in the room of what failure looks like.

The tape prints live noise on top of these derived prices ([§2.1](#21-visual-rules-non-negotiable)),
which is display-only. The number the gauges and the tape are derived *from* is always the true
Composite.

**Gauges**, with `D = max(0, 1000 − composite)`:

| Gauge | Formula | At 1000 | At 400 |
|---|---|---|---|
| Jobs (unemployment) | `4.8% + D/1000 × 12` | 4.8% | 12.0% |
| Homes lost (foreclosures) | `0.5M + D/1000 × 3.5` | 0.5M | 2.6M |
| Public panic | bands: ≥950 `LOW`, ≥850 `ELEVATED`, ≥650 `HIGH`, else `SEVERE` | LOW | SEVERE |

**Floor at 400.** The Composite cannot go below it. Hitting it is Great Depression II and the
board says so, full screen, once.

---

## 5. Delegates

All fifteen positions still exist in the committee; the board does not model them individually.
Six delegates run a firm that is on the tape, so they watch their own ticker move with the
Composite. The other nine hold policy seats, and their work reaches the board the same way
everything else does: a director judges it and presses a button.

This is a deliberate trade. v1 gave all fifteen a personal dial and the panel needed a screen per
seat to drive it. One number is the thing that fits in the time available, and one number is what
the room can actually read.

---

## 6. Build

- **Next.js on Vercel.** One deployment, two routes: `/board` (projector) and `/panel` (phones).
- **Managed Postgres** (Vercel's, Neon, whatever's attached) holding one session row and an
  append-only `moves` table. A conference is a couple hundred rows. Don't over-engineer this.
- **Polling, not websockets** — serverless can't hold a socket. `GET /api/state?since=<n>` every
  1.5s from the board, 3s from the panel. A cursor is a number, so reconnects are free.
- **State is derived by replaying moves** over the committed gavel-in constants — the Composite is
  1000 plus the sum of every stored point delta. That's what makes undo and a mid-conference
  restart both work, and it's ~20 lines. Because deltas are points, replay is exact.
- **Each move carries a client-generated id** with a unique constraint, so a phone retrying on bad
  wifi can't double-apply a Systemic.
- **One passcode**, shared by the directors, exchanged for a signed httpOnly cookie. The URL is
  public on Vercel; without this, anyone who guesses it can tank the market mid-session. Rotate it
  between conferences.
- **No model, no API key, no image storage.** Nothing to configure, nothing to bill.

### 6.1 Built

All of it, in this order:

1. `/board` rendering from a hardcoded state object, with the derived tape and gauges.
2. Postgres, `POST /api/move`, `GET /api/state?since=`, board polls.
3. `/panel` — the eight buttons, the recent list, undo.
4. Passcode.
5. Headline field, session open/close, the Systemic takeover, `/api/health`.

The original plan, kept because it's the order to redo it in if it ever gets rewritten:

### 6.1a Order to build in

1. `/board` renders from a hardcoded state object, with the derived tape and gauges. No server.
2. Postgres, `POST /api/move`, `GET /api/state?since=`, board polls. *Now the projector moves.*
3. `/panel` — the eight buttons, the recent list, undo.
4. Passcode.
5. Headline field, session open/close, the Systemic takeover.

Step 3 is already a usable system. Everything after it is polish.

### 6.2 Degrading

The board holds its state in memory and keeps rendering, scrolling, drifting and animating with
no network at all. If the wifi dies mid-session the projector keeps running on its last state and
a director drives it from keyboard controls on the board laptop itself (which must have entered the
passcode once, like any other director device). Local moves made during an outage are discarded on
reconnect in favour of the server's record — the alternative is a projector that disagrees with the
database for the rest of the day. If everything dies, the
Composite goes on a whiteboard at each crisis update — the promise in the background guide still
gets kept.

---

## 7. The explainer screen

A **How to read this board** screen, on a key (`H`) for the minutes before gavel-in. It is not the
default view: the chart owns the middle of the board, because a room that walks in to a live market
has already understood most of the explanation.

> Big number is the economy. It starts at 1000 — higher is better. Under it: how many people have
> jobs, how many families are losing their homes, and how panicked the public is. Up top, the
> banks and newspapers you're running. When this committee does something good, the number goes
> up. When it does something bad, it goes down. That's it.

If that paragraph is enough for a delegate to read the board, the design works.

---

## 8. Decisions

| # | Question | Answer |
|---|---|---|
| 1 | Who uses the panel? | Dais only. Delegates write paper notes as normal. |
| 2 | Are moves approved by anyone? | No. Direct action, undo is one tap. |
| 3 | Rate-limited? | No. Small trusted dais. |
| 4 | Multiple directors at once? | Fine. Moves append, never overwrite. Each row shows who tapped it. |
| 5 | Floor / game over? | Yes, 400. Announced full screen. |
| 6 | Does the board feed awards? | No. Consequence and atmosphere only. |
| 7 | Do directors need a rubric for what's "good"? | No. Their judgment of debate, backrooms and flow *is* the input. That's the design. |

---

## 9. What v1 had that this doesn't

Cut, on purpose, to fit the time available. None of it is coming back for JAGMUN III.

| Cut | Why |
|---|---|
| Nine profile screens, auto-rotation, force-cuts to a firm | One screen. Nothing to rotate. |
| Per-firm price and health controls, three-event receipts | Prices are derived; health was a second dial nobody has time to turn. |
| The nine policy instruments as editable fields | Directors judge policy work and press a button like everything else. |
| Credibility ratings per government seat, and their multiplier | A whole second scoring system for nine seats. |
| Taxpayer Bill and its dampening rule on positive moves | The best idea in v1 and the most expensive. It needs its own control and its own math. |
| Reason menus and committed headline pools | One optional text field replaces them. |
| LLM in the loop (Gemini), note queue, approval gate | There is no model. Every move is a human pressing a button, so there's nothing to approve. |
| Two passcode roles (view + director) | One code. |

---

## 10. Acceptance criteria

1. A director can move the market from their phone in under five seconds, with no typing.
2. Every move writes a headline to the crawl and animates the number.
3. Any move can be undone in one tap.
4. The tape and gauges move with the Composite, with nobody configuring them.
5. The §7 explainer paragraph is enough for a finance-illiterate delegate to read the board.
6. The headline number is readable from the back of a committee room.
7. With wifi off, the board keeps scrolling, drifting and rendering its last state.
8. Restarting the app and replaying the moves reproduces the board exactly.
