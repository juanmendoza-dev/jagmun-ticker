# Prompt 01 — Claude Design: the JAG Composite board (prototype 1)

> **Scope of this prototype:** the full board frame — scrolling tape on top, scrolling
> headline crawl on the bottom, and the **JAG Composite** screen on the stage between them.
> One screen only. Eight other screens exist in the design but are explicitly out of scope here.

Paste everything below the line into Claude Design.

---

## What I need

Design and build a single, self-contained HTML page: a **live financial market display board**
projected on the wall of a conference room for eight hours.

It is not a website. Nobody scrolls it, clicks it, or uses it on a phone. It is a **fixed 16:9
screen** that runs unattended on a projector, and a person sitting thirty feet away must be able
to read the one number that matters without squinting.

## The context you don't have

This is for **JAGMUN III**, a high-school Model United Nations conference. One committee is
simulating the **2008 financial crisis**. Fifteen students each play a real person from that
crisis — CEOs of banks, the Fed chair, the Treasury Secretary, journalists. They sit around a
table, write proposals, and argue.

The board is the consequence. When the committee does something — bails out a bank, bans short
selling, lets a bank fail — the numbers on the board move, and everyone in the room sees it
happen. It is what makes the simulation feel real instead of like a debate exercise.

**Assume every one of the fifteen students knows nothing about finance.** They are beginners.
That constraint drives everything: no jargon, no balance sheets, no charts that need a legend.

The board has exactly one job: **make it obvious, from across the room, whether the committee
just made things better or worse.**

## The layout

Three horizontal bands. The top and bottom bands never stop moving. The middle is the stage.

```
┌───────────────────────────────────────────────────────────────┐
│ ▼WFC 24.18 -3.1%   ▼BAC 18.40 -6.2%   ▲MCO 31.02 +0.8%  ...  │  TAPE (always scrolling)
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                     [ ACTIVE PROFILE ]                        │  STAGE
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ BREAKING: TREASURY STALLS ON RESCUE PACKAGE                   │  CRAWL (always scrolling)
└───────────────────────────────────────────────────────────────┘
```

### The stage content for this prototype: THE JAG COMPOSITE

This is the default screen and the heart of the whole thing. Rough arrangement — improve on it,
but every element shown must be present:

```
            JAG COMPOSITE
               847.30
          ▼ -152.70  (-15.27%)

     ╱╲___                                  ← line chart of the session so far
           ╲____╱╲______

  JOBS          HOMES LOST      PUBLIC PANIC
  6.1% ▲        1.2M ▲          HIGH
  ──────────────────────────────────────────
  TAXPAYER BILL          $340,000,000,000
```

**The JAG Composite** is the single headline number — a stock index invented for this committee.
It opens at **1,000.00** at the start of the session, and everything is relative to that. This is
the only fact a student needs in order to read the board: *we started at a thousand, we're at
847, higher is better.*

Element by element:

- **The Composite value** — `847.30`. The largest thing on the screen by a wide margin.
- **The change** — `▼ -152.70 (-15.27%)`, measured from the 1,000.00 open, in red.
- **The session chart** — a simple line from the session open to now. Sparse, no gridlines, no
  axis labels, no legend. It exists to show shape, not to be read for values. A faint horizontal
  reference line at 1,000 (the open) is welcome.
- **Three gauges** — deliberately *not* financial metrics. "Credit availability" means nothing
  to a beginner; these mean something to everyone:
  - `JOBS` — `6.1% ▲` (unemployment; up is bad)
  - `HOMES LOST` — `1.2M ▲` (foreclosures; up is bad)
  - `PUBLIC PANIC` — `HIGH` (one of `LOW / ELEVATED / HIGH / SEVERE`; up is bad)
- **The Taxpayer Bill** — `$340,000,000,000`, in amber, on its own band under a rule. Write it
  out in full digits, not `$340B`. The full row of zeros is the point: it is the running tab for
  every rescue the committee has voted for, it only ever goes up, and it is the argument the
  entire committee is built around. Give it weight.

### The tape (top band)

Continuous right-to-left scroll, seamless loop. Seven entries, repeating:

```
▼ WFC  24.18  -3.1%     ▼ BAC  18.40  -6.2%     ▲ MCO  31.02  +0.8%
▼ NYT  12.64  -2.4%     ▼ WPO 388.50  -1.9%     ▼ GE   24.87  -4.5%
  LEH   0.00  HALTED
```

`LEH` is Lehman Brothers. It is permanently `0.00 / HALTED`, rendered in grey, never moving,
always in the tape. It sets the tone and is a standing reminder in the room of what failure
looks like. Do not give it an arrow or a color.

### The crawl (bottom band)

Continuous right-to-left scroll, most recent headline first, in broadcast business-news register
— all caps, terse, no attribution. Use these:

```
BREAKING: TREASURY STALLS ON RESCUE PACKAGE
MARKETS SLIDE AS CONGRESS DELAYS VOTE
MOODY'S PLACES BANK OF AMERICA ON REVIEW FOR DOWNGRADE
SEC WEIGHS EMERGENCY BAN ON SHORT SELLING OF FINANCIALS
FED EXTENDS EMERGENCY LENDING WINDOW
```

### Also on screen

- A **session clock / status chip** reading `IN SESSION` with a time, so the room knows the board
  is live rather than a stale slide.
- A small **`VALUES APPROXIMATE`** label, low-contrast, somewhere unobtrusive. The numbers above
  are historically plausible but unverified, and this is going on a projector in front of a
  faculty advisor. It must be visible but must not compete with anything.

## Hard visual rules — these are non-negotiable

1. **Dark ground, always.** This is a fixed dark product. No light theme, no theme toggle, no
   `prefers-color-scheme` handling. A light theme washes out on a cheap projector.
2. **The headline number is at least 120px.** Readable from the back row. Not 48px.
3. **Never color alone.** Every up/down value carries an arrow (`▲` / `▼`) *and* a sign (`+` /
   `-`), because some students are colorblind and the red/green convention is not universal
   worldwide. Color is a reinforcement, never the only signal.
4. **Tabular figures everywhere.** `font-variant-numeric: tabular-nums` on every number. Digits
   must not jitter when values animate.
5. **Color is reserved for meaning.** Green = up. Red = down. Amber = taxpayer money owed.
   Nothing else on the board gets a color — everything else is white, grey, or the background.
6. **The board never freezes.** Something is always moving, even when the committee is in a
   twenty-minute unmoderated caucus and nothing is being ruled on. The tape and crawl scroll
   continuously; the Composite drifts by small fractions of a percent when idle.

## Technical requirements

- **One self-contained HTML file.** Inline CSS and JS. No build step.
- **No backend, no `fetch`, no API calls, no keys.** All values are hard-coded mock data. This
  prototype is about how the board *looks and moves*, nothing else.
- **Fixed 16:9 viewport that never scrolls.** The three bands fill the screen exactly. Design for
  1920×1080; scale gracefully to other 16:9 sizes with viewport-relative units. It does not need
  to work on a phone — it will never be on one.
- **Motion is part of the deliverable, not a nice-to-have.** Tape and crawl scroll smoothly and
  loop seamlessly. Include a small demo hook: a key press or a timer that applies a `-3%` move to
  the Composite so I can see the number count down to its new value over about 1.5 seconds with
  the row flashing red. That transition is how the room learns something just happened.
- **Respect `prefers-reduced-motion`** for the continuous scrolling elements.
- Use a condensed or neutral grotesque for labels and something with strong tabular figures for
  numbers. Broadcast financial television is the reference — Bloomberg, CNBC's lower third — not
  a fintech dashboard and not a trading terminal. Authority and legibility, not density.

## Out of scope — please do not build these

- The operator's control panel (it runs on a separate laptop screen and no student ever sees it)
- The other eight screens (individual bank pages, policy board, main street, breaking-news
  takeover, final debrief)
- Any state management, data model, or persistence
- Any model/LLM integration
- Any light theme, settings panel, or responsive mobile layout

## How I'll judge it

- Can someone who has never taken an economics class look at this for five seconds and tell me
  whether things are going well or badly?
- Is the headline number the unmistakable first thing the eye lands on?
- Does it read as a live market, or as a slide?
- Would a student photograph this screen at the end of the day?
