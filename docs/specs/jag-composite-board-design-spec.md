# JAG Composite Board — Design Spec v1

Live market display for the **2008 Financial Stock Market Crash** crisis committee at JAGMUN III.
Crisis Director: Juan Mendoza.

> **Audience for this document:** coding agents (Claude Code, Codex) building the system.
> Scope of v1 is **display and behavior**. The backend, LLM prompt, and state schema are
> deliberately out of scope — see [§12](#12-out-of-scope-for-v1).

---

## 1. Purpose and hard constraints

The committee's background guide already promises delegates that "directives, crisis updates,
and the choices individual delegates make on behalf of their institutions will all be reflected
on the ticker." This system delivers that promise.

**Assume every delegate knows nothing about finance.** All fifteen are expected to be beginners.
The board has exactly one job: make it obvious, from thirty feet away, whether the committee just
made things better or worse.

Three rules govern every decision below:

1. **One scoreboard.** There is a single headline number. Committee performance and simulated
   economy are the *same* number. Two scoreboards would split the room's attention and confuse
   beginners about what they're trying to raise.
2. **Everyone has a lever.** No delegate should sit through a session watching a screen that
   never reflects them. This is why [§4](#4-delegate-roster-mapped) exists.
3. **The board never freezes.** Something is always moving, even during unmoderated caucus.

Operating constraints:

- **One operator** (the Crisis Director) runs this while simultaneously writing crisis updates
  and reading delegate notes. No design may require the operator to compute a number.
- **Projected** onto conference AV of unknown quality. Dark ground, huge type.
- **Must degrade.** If the network or the display dies, committee continues.

---

## 2. Anatomy

Two layers. The outer bands never stop moving; only the middle stage changes on profile switch.

```
┌───────────────────────────────────────────────────────────────┐
│ ▼WFC 24.18 -3.1%   ▼BAC 18.40 -6.2%   ▲MCO 31.02 +0.8%  ...  │  TAPE (always)
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                     [ ACTIVE PROFILE ]                        │  STAGE (switches)
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ BREAKING: TREASURY STALLS ON RESCUE PACKAGE                   │  CRAWL (always)
└───────────────────────────────────────────────────────────────┘
```

- **Tape** — all six firm tickers plus `LEH 0.00 HALTED`, scrolling continuously.
- **Crawl** — generated headlines, most recent first, scrolling continuously.
- Both are pure renderings of state that already exists. They cost nothing and keep the room
  feeling live while the operator is heads-down reading notes.

### 2.1 Visual rules (non-negotiable)

- **Dark ground, always.** The board is a fixed dark product. No light theme. A light theme
  washes out on cheap projectors.
- **Headline number ≥ 120px.** Readable from the back row. Not 48px.
- **Never color alone.** Every up/down value carries an arrow (`▲`/`▼`) *and* a sign, because
  some delegates are colorblind and the red/green convention is not universal.
- **Tabular figures everywhere** (`font-variant-numeric: tabular-nums`). Digits must not jitter
  as values animate.
- **Color is reserved for meaning:** green = up, red = down, amber = taxpayer money owed.
  Nothing else gets color.

---

## 3. Profiles (the screens)

Nine logical screens. Auto-advance every **20 seconds**. Arrow keys override. A lock key holds
the current screen.

### 3.1 The JAG Composite — default screen

```
            JAG COMPOSITE
               847.30
          ▼ -152.70  (-15.27%)

     ╱╲___                                  ← line chart since gavel-in
           ╲____╱╲______

  JOBS          HOMES LOST      PUBLIC PANIC
  6.1% ▲        1.2M ▲          HIGH
  ──────────────────────────────────────────
  TAXPAYER BILL          $340,000,000,000
```

Opens at **1,000**. Everything is relative to that. This is the only fact a delegate needs in
order to read the board: *we started at a thousand, we're at 847, higher is better.*

### 3.2–3.7 Firm screens (one per firm)

```
  WELLS FARGO                              24.18
  WFC · John Stumpf                       ▼ -3.1%

  HEALTH  ██████░░░░░░  SHAKY

  ── Fed emergency lending extended        ▲ +4%
  ── Moody's downgrade warning issued      ▼ -6%
  ── Bailout directive tabled by Congress  ▼ -2%
```

**The three-event receipt is the most important element on this screen.** For a beginner, seeing
*what happened to my company and what each thing cost* is the entire finance lesson, delivered
without a lecture. Do not cut it for space.

### 3.8 Policy Board — the nine government seats

```
  FED FUNDS  2.00%      SHORT SELLING  BANNED     TARP  FAILED HOUSE
  FDIC LIMIT $100,000   FED LENDING    $412B      PROBLEM BANKS  117
```

This is the screen that gives the nine non-firm delegates something to move. Styled like the
data band on a real business-news broadcast.

### 3.9 Main Street

```
  UNEMPLOYMENT    FORECLOSURES    BUSINESS LOANS    RETIREMENT SAVINGS
  6.1%            1.2M            BARELY            -31%
```

The emotionally loudest screen, and the one to cut to immediately after a bailout passes:
*the banks are fine now — look at this.*

### 3.10 Rotation

Six firm screens plus three others is a 180-second cycle. **Too long** — a delegate's firm would
be off screen for three minutes.

**Required fix:** the default rotation contains a single **Markets grid** showing all six firms
at once. Individual firm deep-dives are *not* in the default rotation; the board cuts to one only
when that firm actually moves (see [§8](#8-choreography)).

Default rotation: `Composite → Markets grid → Policy Board → Main Street` (~80s cycle).

---

## 4. Delegate roster, mapped

All fifteen positions from the background guide. Six run a company that was publicly traded in
2008. The other nine control an instrument that legitimately belongs on a financial screen.

### 4.1 Firms (6 delegates)

| # | Delegate | Company | Ticker | Moves |
|---|---|---|---|---|
| 4 | John Stumpf | Wells Fargo | `WFC` | Own price + health |
| 13 | Kenneth Lewis | Bank of America | `BAC` | Own price + health |
| 3 | Raymond McDaniel | Moody's Corporation | `MCO` | Own price; **ratings move other firms** |
| 5 | Bill Keller | The New York Times Company | `NYT` | Own price; coverage moves Panic |
| 14 | Jon Meacham | Newsweek → Washington Post Co. | `WPO` | Own price; coverage moves Panic |
| 15 | Maria Bartiromo | CNBC → NBCUniversal → General Electric | `GE` | Own price; coverage moves Panic |

Plus `LEH` — Lehman Brothers, permanently `0.00 / HALTED / COLLAPSED`, grey, flatlined, always
in the tape. Costs nothing, sets the tone, and is a standing reminder of what failure looks like.

Two notes worth understanding:

- **Bartiromo's parent company is GE.** GE Capital was genuinely in trouble in 2008. The anchor
  covering the crisis has a financial stake in it. That is a real conflict of interest, not an
  invented one.
- **Newsweek was a Washington Post Company property in 2008** (sold in 2010), and the
  New York Times Company was itself publicly traded. This is why the media seats get tickers.

### 4.2 Government and regulators (9 delegates)

| # | Delegate | Institution | Instrument |
|---|---|---|---|
| 6 | Ben Bernanke | Federal Reserve | **Fed Funds Rate** |
| 7 | Timothy Geithner | NY Federal Reserve | Emergency lending outstanding ($B) |
| 2 | Henry Paulson | Treasury | TARP size / Taxpayer Bill |
| 8 | Sheila Bair | FDIC | Deposit insurance limit; problem-bank count |
| 9 | Christopher Cox | SEC | **Short selling: ALLOWED / BANNED** |
| 10 | Nancy Pelosi | Speaker of the House | Bill status |
| 11 | Barney Frank | House Financial Services | Bill status |
| 12 | Christopher Dodd | Senate Banking | Bill status |
| 1 | Edward Lazear | Council of Economic Advisers | GDP growth; consumer confidence |

Bill status is a state machine: `IN COMMITTEE → PASSED HOUSE → FAILED → SIGNED INTO LAW`.

**Cox's short-selling toggle is the best beginner lever on the board** — binary, historically
real (the SEC did ban shorting financial stocks in September 2008), and instantly legible as
*people betting against banks: on or off.*

### 4.3 ⚠ Values must be verified before projection

Ticker symbols and ownership structures above are reliable. The **opening values** — the 2.00%
fed funds rate, all share prices, the $100,000 FDIC limit, the $412B lending figure — were
written from memory and have **not** been verified.

Any agent building this must either (a) confirm them against a source, or (b) render a
`VALUES APPROXIMATE` label on the board. Do not present unverified figures as historical fact on
a projector. Starting values barely matter for gameplay; direction of travel is the whole point.

---

## 5. Measures

### 5.1 The Composite

Single headline index. Opens at `1000.00`. This is the one number the room watches.

### 5.2 Firm health

Four states, rendered as a segmented bar:

```
HEALTHY  →  SHAKY  →  FAILING  →  COLLAPSED
```

Every delegate can already read a health bar, which is exactly why this beats a balance sheet.
When a firm reaches `COLLAPSED`, the Composite takes a **Tier 4** hit — this teaches the actual
lesson of 2008 (these institutions are connected) with zero explanation required.

`COLLAPSED` is terminal. A collapsed firm does not recover.

### 5.3 Gauges

| Gauge | Display | Direction |
|---|---|---|
| Jobs | `6.1%` unemployment | up is bad |
| Homes Lost | `1.2M` foreclosures | up is bad |
| Public Panic | `LOW / ELEVATED / HIGH / SEVERE` | up is bad |

Deliberately *not* financial metrics. "Credit availability" means nothing to a beginner;
"can businesses get loans? BARELY" means something to everyone.

### 5.4 The Taxpayer Bill

Bailouts **work** — the Composite rises, the firm's health recovers. But the bill climbs,
visibly, all session, and **it never goes down.**

This is the only piece of real nuance in the system and it earns its place, because it creates
the argument the background guide is built around: saving banks is easy, deciding who pays is
the debate. It directly serves the guide's Questions to Consider #2 and #5.

Mechanically: a high Taxpayer Bill dampens subsequent positive moves on the Composite. Bailing
out everyone must not be a dominant strategy, or the committee degenerates into that by hour two.

### 5.5 Panic

Moves directly on media action — intuitive without explanation: news makes people scared, scared
people make it worse. High Panic applies passive downward drag on the Composite each tick.

---

## 6. Impact tiers

**The operator never computes a number.** Every event is classified into one of four tiers.
This table also serves as the rubric handed to the model when it rules on a note.

| Tier | Name | Composite move | Triggers |
|---|---|---|---|
| 1 | Ripple | ±1% | Press statement, hearing announced, speech |
| 2 | Real | ±3% | A directive passes with actual teeth |
| 3 | Major | ±8% | Rate action, targeted bailout, ratings downgrade |
| 4 | Systemic | ±20% | A bank fails, or a TARP-scale rescue lands |

---

## 7. Session lifecycle

MUN runs in sessions with breaks. **The market opens and closes with committee.** This is free
drama and costs almost nothing to build.

| Phase | Behavior |
|---|---|
| **Gavel-in** | Opening bell. All values load from a written-down snapshot (§7.1) so the board is reproducible if it must be restarted mid-conference. |
| **In session** | Rulings apply; board animates per §8. |
| **Idle drift** | During unmoderated caucus, values wobble ±0.3% so the screen is never frozen while delegates negotiate. |
| **Closing bell** | Board freezes: `MARKET CLOSED — 847.30`. |
| **Overnight gap** | Next session **opens away from the last close**, based on what "happened overnight." |
| **Final screen** | Last five minutes: final Composite, full session chart, what the committee did. |

Two of these deserve emphasis:

- **The overnight gap is the single best feature in this spec.** Delegates return from lunch and
  the market is already down 40 points because of something that happened while they were gone.
  It restarts a room better than anything else available, it's a natural slot for a crisis
  update, and it's how 2008 actually felt.
- **The final screen is the debrief**, and it is what delegates will photograph. Build it.

### 7.1 Required: the gavel-in snapshot

Every starting value must live in a single committed config file — Composite, all seven firm
prices and health states, all three gauges, the Taxpayer Bill, and every policy-board
instrument. Restarting the app must reproduce minute zero exactly.

### 7.2 Required: the explainer screen

A **How to read this board** screen, left up while delegates file in, carrying this text:

> See the screen. Big number is the economy — starts at 1000, higher is better. Under it: jobs,
> families losing their homes, and how panicked the public is. On the right, the banks with
> health bars. When you pass a directive or take an action, the board updates and you see what
> you did. The bottom number is how much of this is getting charged to taxpayers. That's it.

If that paragraph is enough for a delegate to read the board, the design works. It is the
acceptance test for this whole project.

---

## 8. Choreography

Motion is the difference between a spreadsheet and a market.

| Tier | Behavior |
|---|---|
| 1–2 | Number counts to its new value over ~1.5s; the row flashes its direction color. |
| 3 | Board **force-cuts** to the affected profile and holds 30s, overriding rotation. |
| 4 | **Full-screen breaking-news takeover** — headline, the move, then a cut to the affected firm or to Main Street. A bank collapsing should stop conversation in the room. |

Every change, at every tier, also:
- writes a headline to the crawl, and
- appends a line to the affected firm's three-event receipt.

Respect `prefers-reduced-motion` for the continuous scrolling elements.

**Sound** is optional but high-value: opening bell, closing bell, and one klaxon reserved for
Tier 4. Nothing else, or it becomes noise.

---

## 9. Operator surface

A **second screen**, never mirrored to the projector. Nothing here is visible to delegates.

- **Note queue.** Crisis notes arrive in bunches from a beginner committee. The operator works
  through a queue in order — never a single input box that blocks while one request resolves.
- **Proposed ruling.** Tier, deltas, health changes, bill change, and a generated headline —
  previewed, individually adjustable, applied with one click.
- **Manual tier buttons.** The four tiers from §6 as direct controls, targetable at the
  Composite, any gauge, or any firm. This is both the network fallback *and* the "committee is
  dragging, inject some energy" lever the director asked for.
- **Profile control.** Jump to screen, lock, resume rotation.
- **Session control.** Open, close, set the overnight gap.

### 9.1 Human approval is mandatory

**Nothing reaches the projector unapproved.** The model proposes; the operator approves with one
click. This is not distrust of the model — it is that a bad ruling on a projector in front of
thirty delegates and a faculty advisor is unrecoverable, and the approval click costs two
seconds. In practice the operator will approve almost everything unchanged. The two times they
don't are the two times it mattered.

### 9.2 Failure modes to design for

- **Hanging request.** An API call that spins for 40 seconds with the room watching is worse than
  having no system. Hard **10-second timeout**, then fall back to manual tier buttons.
- **No network.** The board must run fully on manual tier buttons alone, with no model in the
  loop. This is why the button UI is a first-class feature, not a debug affordance.
- **Total failure.** Paper fallback: the Composite written on a whiteboard, updated at each
  crisis update. Projectors fail; the promise in the guide still gets kept.

---

## 10. Decisions — defaults are set, director may override

Agents should **build the default** and not block on these.

| # | Question | Default (build this) |
|---|---|---|
| 1 | Is there a floor / "game over" line? | **Yes, at 400** = Great Depression II, announced dramatically. Set low enough it can't be tripped in hour one by accident. |
| 2 | Can the Composite recover to 1,000? | **Yes, but slowly**, and only by fixing the gauges — not by rescuing banks alone. |
| 3 | Do delegate names appear on firm screens? | **Yes.** The positions are the substance. Note this puts a delegate's name on screen while their health bar drains in front of the room. |
| 4 | Is the model's one-line reasoning shown to delegates? | **Yes.** With a first-time committee the teaching value beats the mystique. |
| 5 | Does the board feed awards / scoring? | **No.** If it scores, delegates will litigate every tick and it needs an audit trail that can't be built in time. Consequence and atmosphere only. |

---

## 11. Technology decisions already made

- **LLM provider: Gemini.** Chosen on cost. Nothing in the design depends on the provider —
  the contract is "here is the board state + the note + the §6 rubric, return JSON."
- **API key lives server-side.** A small local server holds it; the browser renders the board.
  **Never put the key in client-side JS** on a laptop that is mirrored to a projector.
- **Model output must include a headline.** A generated headline in business-news register
  (`MARKETS SLIDE AS TREASURY STALLS ON RESCUE PACKAGE`) is the highest-value thing the model
  produces here — the numbers could be approximated by a rules table, the headlines could not.
  Treat it as a first-class output, not an afterthought.
- **The prompt must carry full board state and recent history**, not just the note. Without it:
  a delegate can pass the same directive twice and be paid twice, and "bail out Wells Fargo"
  can't be correctly valued (it should be worth a lot when WFC is `FAILING` and nearly nothing
  when it is already `HEALTHY`). **This is the most likely failure mode and it will not appear
  when testing one note at a time.**

---

## 12. Out of scope for v1

Not specified here; do not invent:

- State schema and persistence format
- The exact Gemini prompt text and JSON contract
- Authentication (single-operator, local machine — none needed)
- Any delegate-facing input. Delegates do not interact with this system; they write notes on
  paper as normal and the director rules on them.
- Historical price accuracy beyond §4.3

---

## 13. Acceptance criteria

1. The §7.2 explainer paragraph is sufficient for a finance-illiterate delegate to read the board.
2. Every one of the fifteen delegates can point to something on screen that they move.
3. The headline number is readable from the back of a committee room.
4. The board runs a full session with the network unplugged, using manual tier buttons only.
5. Restarting the app reproduces the gavel-in snapshot exactly.
6. No value reaches the projector without operator approval.
