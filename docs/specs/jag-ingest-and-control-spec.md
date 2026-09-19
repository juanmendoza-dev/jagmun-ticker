# JAG Composite — Ingest & Control Spec v1

Companion to [`jag-composite-board-design-spec.md`](jag-composite-board-design-spec.md) ("the
design spec"). That document specifies **what the board shows**. This one specifies **how things
get onto it**: capturing directives and crisis notes with a phone camera, a manual control surface
the dais can drive from their own phones, and the hosting shape that makes both work on Vercel.

> **Audience:** coding agents building the system.
> **Amends the design spec** at §9.2, §11 and §12 — see [§11](#11-what-this-amends-in-the-design-spec).
> Everything in the design spec not listed there still holds, unchanged.

---

## 1. The constraint that shapes everything: the board is local-first

The design spec's acceptance criterion #4 is *"the board runs a full session with the network
unplugged, using manual tier buttons only."* Hosting on Vercel appears to break that. It does not,
if the split is drawn in the right place:

> **Vercel is the ingest and sync layer. It is not the board's runtime.**

- The **board** is a client app holding the complete session state in memory. Once loaded, it
  renders, rotates, animates and accepts manual tier input with **no network at all**.
- **Vercel** accepts captures, runs rulings, holds the durable event log, and pushes events to
  whoever is listening.
- If the network dies mid-session, the board keeps running on its last known state and the
  operator falls back to the on-board manual tier buttons the design spec §9 already requires.
  When the network returns, the board reconciles (see [§7.3](#73-reconnect-and-reconciliation)).

This is the one architectural decision in this document that everything else follows from. Build it
first. A board that renders *from* the server on every tick fails at the conference, not in testing.

Operating constraints inherited from the design spec, restated because they bind the pipeline:

- **One operator** running this while writing crisis updates. Anything requiring their attention
  competes with the committee.
- **Conference wifi is assumed hostile**: slow, captive-portal'd, and liable to drop.
- **Nothing reaches the projector unapproved** (design spec §9.1) — with one bounded exception
  defined in [§4](#4-surface-2-dais-nudge-staff-phones).

---

## 2. The spine: an append-only event log

There are now three writers — the capture pipeline, several dais phones, and the CD console — all
moving one Composite. Do **not** model this as "update the number."

> **Board state is derived by folding the event log over the gavel-in snapshot.**
> Nothing mutates state directly. Every change is an appended event.

```
snapshot (design spec §7.1, committed to the repo)
   +  event 1  ▸  event 2  ▸  event 3  ▸  …  ▸  event N
   =  current board state
```

This single choice pays for itself five times:

| Buys you | How |
|---|---|
| Reproducibility (design spec §7.1) | Replay the log from the snapshot. Restart is free. |
| Dedupe (design spec §11's warned failure) | The log *is* the history handed to the model. A directive already ruled on is visibly in it. |
| Undo, live, in the room | Append a compensating `correction` event. Never delete. |
| Three concurrent writers | Sequence numbers, not last-write-wins. Collisions are impossible by construction. |
| The final debrief screen (design spec §7) | The log is the session narrative, already ordered. |

### 2.1 Event shape

```jsonc
{
  "seq": 47,                        // server-assigned, monotonic, the sync cursor
  "id": "evt_01H…",                 // client-generated ULID, used for idempotency
  "ts": "2026-11-14T15:42:07Z",
  "actor": { "role": "cd" | "staff" | "system", "name": "Juan", "device": "dev_a1b2" },
  "kind": "ruling" | "nudge" | "manual" | "session" | "correction",
  "source": { "type": "capture", "captureId": "cap_…" },   // or { "type": "console" }
  "tier": 3,                                                // design spec §6
  "targets": [
    { "ref": "composite",      "delta": -8.0, "unit": "pct" },
    { "ref": "firm:WFC",       "delta": -12.0, "unit": "pct", "health": "FAILING" },
    { "ref": "gauge:panic",    "set": "HIGH" },
    { "ref": "policy:fed_funds", "set": 1.5 }
  ],
  "taxpayerBillDelta": 0,
  "headline": "MOODY'S CUTS WELLS FARGO AS RESCUE TALKS STALL",
  "reasoning": "Downgrade during an active liquidity scare. Tier 3 per rubric.",
  "approvedBy": "cd",               // required on kind:"ruling" — see §3.5
  "correctsSeq": null               // set on kind:"correction"
}
```

Rules:

- **`seq` is assigned by the server only.** Clients never invent one.
- **`id` is client-generated and unique-constrained.** A phone that retries an upload on a flaky
  connection must not double-apply. Idempotency is a wifi requirement, not a nicety.
- **Every event carries a `headline`.** The design spec §8 requires that every change at every tier
  writes to the crawl. An event without a headline is a bug, including nudges ([§4.2](#42-every-nudge-still-needs-a-headline)).
- Events are **immutable**. Mistakes are corrected by appending, which keeps the debrief honest.

---

## 3. Surface 1 — Capture (phone camera → ruling → queue)

The director's stated goal: photograph a directive, a backroom note or a crisis note, and have the
ticker respond.

### 3.1 Pipeline

```
 phone camera
     │  client-side downscale (long edge 1600px, JPEG q0.7, ≈200–400KB)
     ▼
 POST /api/capture  ──▶  Blob storage ──▶ capture row: status=queued
     │                                          │
     └──▶ 202 Accepted, returns captureId       │   phone is DONE here. It does not wait.
                                                ▼
                                   POST /api/capture/:id/rule  (async worker)
                                                │
                                   multimodal model call
                                   in:  image + full board state + recent log + §6 rubric
                                   out: { transcription, tier, targets, headline, reasoning,
                                          confidence, possibleDuplicateOf }
                                                ▼
                                   capture row: status=proposed
                                                ▼
                                   appears in the CD console note queue  (design spec §9)
                                                ▼
                                   CD edits / approves  ──▶  event appended  ──▶  board moves
```

### 3.2 Skip OCR. Go straight to the multimodal model.

Handwritten MUN directives, photographed at an angle in a dim committee room, defeat
text-extraction OCR. A dedicated OCR pass adds a failure mode and a second round-trip and buys
nothing. Send the image to the model and get transcription and ruling back in **one call**.

Two consequences that must be built, not assumed away:

- **The console shows the photo next to an editable transcript.** Design as if the transcription is
  wrong, because sometimes it will be. The CD reads the paper's photo, not the model's reading of it.
- **The capture is async.** The phone uploads and is released immediately. This is what keeps the
  design spec's hard 10-second rule intact — nobody is standing in front of the room watching a
  spinner, because the wait happens in the queue, off-stage.

### 3.3 Capture kinds

The uploader tags the photo before sending. One tap, three options, because the model should be
told what it is looking at:

| Kind | What it is | Ruling behavior |
|---|---|---|
| `directive` | A passed directive, signed sheet | Full ruling. Typically Tier 2–4. |
| `note` | A crisis note from one delegate | Full ruling, usually scoped to that delegate's firm or instrument. Typically Tier 1–2. |
| `backroom` | A private/backroom arrangement | Ruled, but **the headline must not name the mechanism** — backroom deals show up as market movement with a vague headline, which is the correct dramatic behavior and also protects the delegate. |

Optional free-text field: *"anything the photo doesn't show"* — one line, for the CD or staffer to
add context ("this failed 6–9", "third time they've tried this").

### 3.4 Duplicate detection is a first-class output

The design spec §11 names this as the most likely failure mode: the same directive ruled twice pays
twice. Two defenses, both required:

1. **The prompt carries the recent event log**, so the model can see it already ruled on this.
2. The model returns **`possibleDuplicateOf: <seq> | null`**, and the console renders that as a loud
   banner on the proposal — not a subtle flag. The CD approves in two seconds under pressure; the
   warning has to survive that.

### 3.5 Approval is mandatory and unchanged

A capture ruling lands in the queue as a **proposal**. It never auto-applies, at any tier, at any
confidence. `approvedBy` is a required field on `kind:"ruling"` and the server rejects the event
without it.

This is worth being blunt about, because "scan a directive and the ticker moves" naturally reads as
automatic: **it is not automatic, and making it automatic would violate the design spec's §9.1.**
The gap between the photo and the projector is one human click, and that click is the whole safety
model.

---

## 4. Surface 2 — Dais nudge (staff phones)

The second stated goal: the dais can push market performance up or down from their phones based on
how the committee is doing.

This is **not** a proposal queued for approval. It is direct, bounded action by trusted staff. The
CD is the person who would approve it and is also the person who is too busy to. Routing nudges
through the queue means they never land.

### 4.1 What a staff phone can do

A single screen, thumb-sized targets, works one-handed while standing:

```
┌──────────────────────────┐
│   JAG COMPOSITE  847.30  │   ← read-only, live
│                          │
│   WHY IS IT MOVING?      │
│  ┌────────────────────┐  │
│  │ Strong debate      │  │   ← pick a reason (required)
│  │ Real plan forming  │  │
│  │ Committee stalling │  │
│  │ Chaos / no progress│  │
│  │ Good caucus energy │  │
│  └────────────────────┘  │
│                          │
│    ▲ NUDGE UP            │
│    ▼ NUDGE DOWN          │
│                          │
│   next nudge in 0:42     │
└──────────────────────────┘
```

Bounds, all enforced **server-side**:

| Bound | Value | Why |
|---|---|---|
| Tier ceiling | **Tier 1–2 only** (±1%, ±3%) | Tier 3 force-cuts the board; Tier 4 is a full-screen takeover. Those are directorial beats, not ambience. |
| Rate limit | 1 nudge per **90s** per device | Stops a bored staffer from walking the index. |
| Session cap | 25 nudges total | Net drift stays bounded across a long session. |
| Reason | Required | See §4.2. |
| Reserved to CD | Tier 3–4, overnight gap, session open/close, the 400 floor, undo, kill switch | The dramatic moments stay with one person. |

Every nudge appears in a live feed on the CD console with the staffer's name, and the CD can undo
any of them with one tap (a `correction` event).

### 4.2 Every nudge still needs a headline

Design spec §8: every change writes to the crawl. A nudge with no headline would silently break
that. The reason menu exists precisely to solve this — each reason maps to a small rotating pool of
business-news-register headlines:

| Reason | Sample headline pool |
|---|---|
| Strong debate | `MARKETS FIRM AS LAWMAKERS SIGNAL CONSENSUS` · `SENTIMENT IMPROVES ON CAPITOL HILL PROGRESS` |
| Committee stalling | `MARKETS DRIFT LOWER AS TALKS PRODUCE NOTHING` · `INVESTORS LOSE PATIENCE WITH WASHINGTON` |
| Chaos / no progress | `SELLOFF DEEPENS AMID POLICY CONFUSION` |

Written once, committed to the repo, not generated. Fast, offline-safe, and free.

---

## 5. Surface 3 — CD console

The design spec §9 operator surface, now reachable from any device rather than only the laptop —
which matters, because the CD is frequently on their feet. Everything in design spec §9 still
applies. This section only adds what the pipeline introduces:

- **Capture queue**, newest first, each item showing **photo + editable transcript + proposed
  ruling + duplicate warning**. Approve, edit-then-approve, or discard.
- **Nudge feed** — who nudged, why, when, with per-item undo.
- **Event log view** with undo on any event. This is the live audit trail.
- **Kill switch** — freeze all ingest. One button. If something goes wrong in front of the room,
  the CD needs to stop the machine without closing a laptop lid.

---

## 6. Data and hosting

### 6.1 Decided stack

| Concern | Choice | Notes |
|---|---|---|
| Hosting | **Vercel** | Given. |
| App | **Next.js** (App Router) | Board, capture, nudge, console all in one deployment. |
| Event log + captures | **Vercel Postgres (Neon)** | Durable, queryable, replayable. A session is ~200 events; any tier works. Reproducibility is an acceptance criterion, so this must not be ephemeral. |
| Images | **Vercel Blob** | Direct client upload; keeps the 4.5MB serverless body cap out of the path. |
| Model | **Gemini** multimodal, per design spec §11 | Contract is provider-agnostic: image + state + rubric in, JSON out. |
| Realtime | **Polling** | See §6.3. |

Supabase is the reasonable alternative if you would rather have Postgres, storage, realtime and
auth in one product. Pick one and write it down; do not half-build both.

### 6.2 Auth: three passcodes, no accounts

Fifteen delegates, a handful of staff, one day. Accounts are the wrong weight.

| Role | Gets | Can |
|---|---|---|
| `board` | View passcode | Read state. Nothing else. Safe on the projector laptop. |
| `staff` | Staff passcode | Capture + nudge within §4 bounds. |
| `cd` | CD passcode | Everything. |

Passcode exchanges for a signed, httpOnly, role-scoped cookie with a 24-hour TTL. Rotate the staff
passcode between sessions. **Enforce every bound server-side** — a staffer with dev tools open is
not a threat model worth engineering against, but a staffer who bookmarks a URL is.

### 6.3 Sync: poll, don't stream

Vercel serverless functions do not hold websockets. SSE on Edge is possible; **polling is the right
call anyway.**

```
GET /api/events?since=47   ──▶   { events: [...], seq: 51, stateHash: "…" }
```

- **1.5s interval** on the board and console, 5s on staff phones.
- Reconnects are trivial — the cursor is just a number.
- This is a four-screen board, not a trading desk. Latency of a second and a half is invisible in a
  room where the operator takes two seconds to click approve.

### 6.4 Upload path

Client-side downscale to long-edge 1600px / JPEG q0.7 before upload. A modern phone photo is 3–8MB;
this lands at 200–400KB, which is the difference between an upload that completes on conference wifi
and one that does not. Upload direct to Blob with a short-lived token, then POST only the resulting
URL to `/api/capture`.

---

## 7. Failure modes

The design spec §9.2 covers the model hanging, no network, and total failure. The pipeline adds:

### 7.1 Upload fails or the phone loses signal

Queue locally (IndexedDB) and retry with backoff. The capture screen shows a pending count. Because
`id` is client-generated and unique-constrained, a retry that actually succeeded the first time is
harmless.

### 7.2 Model returns garbage, or times out

10-second hard timeout per design spec §9.2. On failure the capture lands in the queue as
`status: needs_manual` — **photo intact, no ruling** — and the CD rules on it with the manual tier
buttons. A failed model call must never lose the photograph.

### 7.3 Reconnect and reconciliation

The board is authoritative for nothing; the log is. On reconnect the board fetches everything since
its cursor and folds it in.

The interesting case is a board that ran offline on manual tier buttons. Those local events sit in
an outbox and are pushed on reconnect, appended after whatever arrived while it was dark. The board
briefly animates to the reconciled value. **Accept the jump.** Trying to reorder by wall-clock
timestamp across devices with unsynced clocks produces subtler wrongness than a visible correction.

### 7.4 A phone in the wrong hands

Rotate the staff passcode between sessions. The CD console shows every nudge with its device and
can undo any of them. Bounded blast radius by design: worst case is ±3% and a silly headline, which
is recoverable in one tap.

---

## 8. Build order

Each step ends with something demonstrable. The design spec's §7.1 snapshot must exist before any
of this, since everything folds over it.

1. **Event log + fold.** Postgres table, `POST /api/events`, `GET /api/events?since=`, pure
   `fold(snapshot, events) → state`. Unit-tested. No UI.
2. **Board reads the log.** The design spec board, hydrating from state, polling for events.
   *Demo: curl an event, the projector moves.*
3. **Local-first + offline.** State in memory, manual tier buttons work with wifi off, outbox
   reconciles on reconnect. *Demo: pull the wifi, keep running, plug back in.* This is acceptance
   criterion #4 and it must not be deferred.
4. **Auth.** Three passcodes, role cookies, server-side enforcement.
5. **Nudge surface.** Staff phone screen, bounds, reason→headline pools, CD feed with undo.
   *This is independently useful and ships before any model work.*
6. **Capture, no model.** Photo → Blob → queue → CD rules manually with tier buttons.
   *Already a working scan pipeline.*
7. **Model ruling.** Gemini multimodal, full state + recent log + §6 rubric in the prompt, duplicate
   detection, proposals into the queue.
8. **Session lifecycle.** Open/close, overnight gap, final debrief from the log.

Steps 1–6 produce a system that runs the committee with no model in the loop at all. That is the
correct fallback posture, and it means the model is an enhancement that can fail on the day without
taking the conference with it.

---

## 9. Decisions — defaults are set, director may override

| # | Question | Default (build this) |
|---|---|---|
| 1 | Board local-first, or server-rendered? | **Local-first.** Vercel is ingest + sync only. Preserves design spec AC#4. |
| 2 | Do scans auto-apply? | **No.** Always a proposal in the queue. Design spec §9.1 stands. |
| 3 | Do dais nudges need approval? | **No** — direct, but capped at Tier 2, rate-limited, reason-tagged, undoable. |
| 4 | Realtime transport? | **Polling at 1.5s.** No websockets on serverless; SSE not worth the complexity here. |
| 5 | Can delegates upload? | **No.** Staff and CD only. Design spec §12 keeps delegates out of the system; paper notes stay paper. |
| 6 | Is the photo shown on the projector? | **No.** Handwriting is unreadable at 30 feet and a photo of a delegate's note on screen is a bad surprise for them. Console only. |
| 7 | Is the transcription shown to delegates? | **No.** The generated headline is the public artifact. |
| 8 | Retention after the conference? | **Keep the event log, delete the images.** The log is the debrief; photos of delegates' handwriting have no reason to outlive the day. |

---

## 10. Acceptance criteria

These **extend** the design spec's §13 — none replace it. #1 and #2 below exist specifically to
protect its criteria #4 and #6.

1. With wifi off, the board runs a full session on manual tier buttons, and reconciles cleanly when
   the network returns. *(Protects design spec AC#4.)*
2. No capture-derived value reaches the projector without a CD click. *(Protects design spec AC#6.)*
3. A directive photographed on a phone appears as a ruled proposal in the console queue in under 30
   seconds, without the uploader waiting on the result.
4. The same directive photographed twice raises a duplicate warning the CD cannot miss.
5. A staffer can move the market from their phone in under five seconds, and the move carries a
   headline to the crawl like any other event.
6. The CD can undo any event — nudge, ruling or manual — in one tap.
7. Replaying the event log from the gavel-in snapshot reproduces the current board state exactly.
   *(Extends design spec AC#5 to the server.)*
8. A total model outage costs the system nothing but the automated rulings. Everything else
   continues.

---

## 11. What this amends in the design spec

| Design spec | Was | Now |
|---|---|---|
| §9.2 "No network" | Board runs locally, manual buttons only | Unchanged in effect — §1 here defines the local-first architecture that keeps it true under Vercel hosting. |
| §11 "API key lives server-side… a small local server" | Local server holds the key | Vercel serverless functions hold the key. Same principle, different host. Still never in client JS. |
| §12 "Authentication — none needed" | Single operator, local machine | **Superseded.** Public URLs need auth; [§6.2](#62-auth-three-passcodes-no-accounts) defines three passcodes. |
| §12 "State schema and persistence format — out of scope" | Deliberately unspecified | **Now specified:** [§2](#2-the-spine-an-append-only-event-log), append-only event log over the §7.1 snapshot. |
| §12 "Any delegate-facing input" | None | **Still none.** Capture is operated by staff, not delegates. |

Everything else in the design spec — the nine profiles, the four tiers, the fifteen-delegate
mapping, the choreography, the visual rules — is untouched.
