# JAG Composite — Control Panel Spec v1

Companion to [`jag-composite-board-design-spec.md`](jag-composite-board-design-spec.md) ("the
design spec"). That document specifies **what the board shows** and stands unchanged. This one
specifies the **manual control panel** the dais drives it with, and the hosting shape for Vercel.

> **Scope is deliberately small.** No scanning, no photo capture, no model in the loop. Buttons.
> The design spec §9 already requires manual tier buttons as the network fallback; this makes them
> the entire control surface.

---

## 1. What this is

One page, phone-first, behind a passcode. A director opens it and can:

1. **Move the market up or down**, at a chosen size.
2. **Move one firm**, or one policy instrument.
3. **Switch what the board is showing** — the top switcher.

That is the whole product. A director should be able to use it one-handed, standing, without
reading instructions.

---

## 2. The panel

```
┌─────────────────────────────────────────────┐
│ COMP │ WFC │ BAC │ MCO │ NYT │ WPO │ GE │   │  ← top switcher (§3)
│      │ POLICY │ MAIN ST │ AUTO ▸           │
├─────────────────────────────────────────────┤
│                                             │
│            JAG COMPOSITE                    │
│              847.30                         │
│            ▼ -152.70  (-15.27%)             │
│                                             │
│   MOVE THE MARKET                           │
│   ┌─────────────┐   ┌─────────────┐         │
│   │  ▲  SMALL   │   │  ▼  SMALL   │  ±1%    │
│   ├─────────────┤   ├─────────────┤         │
│   │  ▲  REAL    │   │  ▼  REAL    │  ±3%    │
│   ├─────────────┤   ├─────────────┤         │
│   │  ▲  MAJOR   │   │  ▼  MAJOR   │  ±8%    │
│   ├─────────────┤   ├─────────────┤         │
│   │  ▲ SYSTEMIC │   │  ▼ SYSTEMIC │  ±20%   │
│   └─────────────┘   └─────────────┘         │
│                                             │
│   WHY?  [ pick a reason ]        (optional) │
│                                             │
│   ↶ UNDO LAST                               │
├─────────────────────────────────────────────┤
│ RECENT                                      │
│ 15:42  ▼ REAL   Committee stalling   Juan   │
│ 15:38  ▲ MAJOR  Bailout passed       Juan   │
└─────────────────────────────────────────────┘
```

The four sizes are the design spec §6 impact tiers, relabeled in plain language. **The director
never types a number** — that was the point of the tier table and it stays the point here.

### 2.1 Firm and policy targets

Tapping a firm in the top switcher swaps the middle of the panel to that firm's controls: the same
four-tier up/down pair, plus a health selector (`HEALTHY / SHAKY / FAILING / COLLAPSED`) and a
one-line event to append to that firm's three-event receipt.

Tapping **POLICY** gives the nine government instruments from design spec §4.2 as direct fields —
Fed Funds Rate, emergency lending, Taxpayer Bill, FDIC limit, problem-bank count, short-selling
toggle, three bill-status state machines, GDP and consumer confidence. Set the value, it lands on
the Policy Board.

### 2.2 Headlines

Every move writes to the crawl (design spec §8), so every move needs a headline. Two ways:

- **Reason menu** — pick one (`Strong debate`, `Committee stalling`, `Bailout passed`, `Chaos`,
  `Bank in trouble`, …), each mapping to a small pool of business-news-register headlines written
  once and committed to the repo. One tap, no typing.
- **Type your own** — a text field for when the canned line won't do.

Skipping both is allowed; a generic market-move headline is used.

### 2.3 Per-delegate standing — how you punish a specific person

The six firm delegates already have a personal scoreboard: their share price and health bar. The
nine government delegates have none, so a director has no way to make a bad crisis note land on the
delegate who wrote it. This closes that gap.

**Every government seat carries a credibility rating**, using the same four-state vocabulary as firm
health so the room only has to learn one thing:

```
firms:        HEALTHY  →  SHAKY  →  FAILING  →  COLLAPSED
government:   TRUSTED  →  CREDIBLE  →  DOUBTED  →  DISCREDITED
```

Everyone opens at `CREDIBLE`. Cox writes a note that would have made the crisis worse, the director
taps Cox and taps down: Cox goes to `DOUBTED`, and it is on the Policy Board next to his
short-selling toggle for the rest of the session.

This is historically real, not a gamified punishment invented for the committee — in 2008 the market
priced whether the Fed, Treasury and the SEC knew what they were doing, and Cox in particular was
widely judged to have lost the room. Delegates do not need that explained to feel it.

**Credibility has teeth, or it is just a shaming bar.** It scales how much that delegate's actions
move the Composite:

| Standing | Their actions move the market at |
|---|---|
| `TRUSTED` | 125% |
| `CREDIBLE` | 100% |
| `DOUBTED` | 75% |
| `DISCREDITED` | 50% |

So a discredited Paulson can still pass TARP — it just does half of what it should, because nobody
believes him. That is the lesson, and it arrives without a lecture.

**`DISCREDITED` is recoverable.** Unlike `COLLAPSED`, which is terminal for a firm, a government
delegate can climb back with good play. A delegate written off in hour one must have a road back, or
they spend the rest of the conference with nothing to do.

On the panel: selecting any delegate gives the same up/down pair. For a firm delegate it moves the
share price; for a government delegate it moves credibility. One gesture, two renderings. A director
does not have to remember which kind of seat they are punishing.

Each standing change can optionally ripple to the Composite as a Tier 1 move — a checkbox, on by
default, because a delegate losing the room usually does move the market a little.

**One caution worth taking on deliberately:** this puts a named delegate's `DISCREDITED` on a
projector in front of thirty people. The design spec §10 decision #3 already accepted that trade for
firm health bars, and the answer here is the same — the positions are the substance. But the panel
carries a **hide names on Policy Board** toggle for the case where a beginner is visibly struggling
and the bar would do more harm than good.

### 2.4 Undo

One tap undoes the last move. Undo appends a reversing move rather than rewriting history, so the
recent list stays honest and the board animates back.

---

## 3. The top switcher

A persistent row across the top of the panel: `COMPOSITE · WFC · BAC · MCO · NYT · WPO · GE ·
POLICY · MAIN ST · AUTO`.

Two jobs at once, which is why it earns the space:

- **It targets the controls** — whatever is selected is what the buttons below move.
- **It drives the projector.** Selecting a market cuts the board to that screen and **locks** it
  there. `AUTO` releases the lock and resumes the design spec §3.10 rotation.

So "let me look at Wells Fargo" and "put Wells Fargo on the big screen" are the same gesture. If the
director wants to inspect a firm without projecting it, long-press — the panel switches, the board
does not.

`LEH` appears in the switcher greyed out and unselectable, matching its permanent `HALTED` state.

---

## 4. Build

### 4.1 Stack

- **Next.js on Vercel**, one deployment, two routes: `/board` (projector) and `/panel` (phones).
- **Vercel Postgres** holds the session state and a flat list of moves. A session is maybe 200 rows.
- **Polling, not websockets** — serverless can't hold a socket. `GET /api/state?since=<n>` every
  1.5s on the board, 3s on the panel. A cursor is just a number, so reconnects are free.
- **No model, no API key, no image storage.** Nothing to configure, nothing to bill.

### 4.2 State

Session state is a single row, plus an append-only `moves` table. State is **derived by replaying
moves over the gavel-in snapshot** (design spec §7.1), which is what makes undo and a mid-conference
restart work. Each move carries a client-generated `id` with a unique constraint, so a phone that
retries on bad wifi cannot double-apply.

### 4.3 Auth

Two passcodes, no accounts: **view** (the projector laptop, read-only) and **director** (the panel).
Exchanged for a signed httpOnly cookie. Enforce the read-only role server-side. Rotate the director
passcode between conferences.

### 4.4 Offline

The design spec's acceptance criterion #4 — *runs with the network unplugged* — survives because the
board holds its state in memory and keeps rendering, rotating and animating with no network at all.
If wifi dies mid-session the projector keeps running on its last state and the director falls back
to keyboard controls on the board laptop itself.

### 4.5 Order

1. Board renders from a hardcoded state object. No server.
2. Gavel-in snapshot file + replay function, unit-tested.
3. Postgres, `POST /api/move`, `GET /api/state?since=`, board polls. *Now the projector moves.*
4. Panel: composite up/down at four tiers, recent list, undo.
5. Top switcher — targeting and board lock.
6. Firm controls and health selector.
7. Policy Board controls for the nine, plus credibility ratings (§2.3).
8. Passcodes.
9. Reason menu and headline pools.

Step 4 is already a usable system. Everything after it is widening the target set.

---

## 5. Decisions

| # | Question | Default |
|---|---|---|
| 1 | Who can use the panel? | Dais only. Delegates never touch it — paper notes stay paper (design spec §12). |
| 2 | Are director moves approved by anyone? | **No.** Direct action. The design spec §9.1 approval gate existed to guard *model-generated* rulings; with no model there is nothing to approve. |
| 3 | Are moves rate-limited? | **No.** A small trusted dais, and undo is one tap. |
| 4 | Multiple directors at once? | **Fine.** Moves are appended, never overwritten. Each row shows who. |
| 5 | Is scanning coming back later? | Out of scope. If it returns it slots in as a proposal queue feeding these same moves — nothing here blocks it. |

---

## 6. Acceptance criteria

Extends the design spec §13; none of those are replaced.

1. A director can move the market from their phone in under five seconds, with no typing.
2. Every move writes a headline to the crawl.
3. Any move can be undone in one tap.
4. The top switcher cuts the projector to any market and back to auto-rotation.
5. All fifteen delegates have something on the panel that moves their thing, and every one of them
   can be individually rewarded or punished — share price for the six, credibility for the nine.
6. With wifi off, the board keeps running (design spec AC#4).
7. Replaying moves from the gavel-in snapshot reproduces the board exactly (design spec AC#5).

---

## 7. What this changes in the design spec

| Design spec | Now |
|---|---|
| §11 LLM provider / prompt / API key | **Dropped for v1.** No model. Manual only. |
| §9.1 "Human approval is mandatory" | Moot — there is nothing generated to approve. Every move is a human pressing a button. |
| §12 "Authentication — none needed" | **Superseded** by §4.3: two passcodes, because the URL is public. |
| §12 "State schema — out of scope" | **Now specified:** §4.2, replay over the snapshot. |
| §9 Operator surface | Realized as this panel, reachable from any phone rather than a second laptop screen. |
| §3.8 Policy Board | **Adds a credibility rating per seat** (§2.3), rendered with the same segmented bar as firm health. |
| §5 Measures | **Adds credibility** as a fifth measure, and as a multiplier on how far that delegate's actions move the Composite. |

Everything else — the nine profiles, four tiers, delegate mapping, choreography, visual rules —
is untouched.
