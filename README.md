# jagmun-ticker

Official ticker for the 2008 financial crisis committee at JAGMUN III.

One number on a projector, one admin panel on the directors' phones. Directors judge how the
committee is going — debate, backrooms, overall flow — and add points to the economy or take them
away. The board reacts: the number moves, the tape moves with it, a headline scrolls.

- **`/board`** — the projector. Fixed 16:9, dark, runs unattended all day.
- **`/panel`** — the directors' phones. Eight buttons behind a passcode.

## Deploying it (do this once)

1. Push this repo to GitHub, then **Import Project** at [vercel.com/new](https://vercel.com/new).
   Accept every default — it's a stock Next.js app.
2. In the project, go to **Storage → Create Database → Postgres**, and attach it. Vercel sets
   `POSTGRES_URL` for you. **This step is not optional** — without a database the app refuses to
   start in production, on purpose, because otherwise each phone would silently see a different
   market.
3. Go to **Settings → Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DIRECTOR_PASSCODE` | whatever you want the dais to type. Change it between conferences. |
   | `SESSION_SECRET` | any long random string — `openssl rand -hex 32` |

4. Redeploy, then open **`/api/health`** once. It should say:

   ```json
   { "ok": true, "store": "postgres", "moves": 0, "passcodeSet": true }
   ```

   If it says anything else, fix that before the conference — that endpoint is the one check
   that proves the database is attached and writable.
5. Open `/board` on the projector laptop and `/panel` on every director's phone.

The `moves` and `session` tables are created on the first request. There is nothing to migrate.

## Running it on your own machine

```
npm install
npm run dev     # http://localhost:3000
npm test        # the derivation and undo maths
```

With no database attached it keeps everything in memory, so you can try it immediately — the board
and the panel both say so in orange. That mode is refused in production.

Dev passcode is `jagmun` unless you set `DIRECTOR_PASSCODE`.

## Running the committee

**The panel.** Eight buttons: up or down at `SMALL` ±1%, `REAL` ±3%, `MAJOR` ±8%, `SYSTEMIC` ±20%.
Type a headline first if you want one on the crawl — `bailout passed` becomes
`BREAKING: BAILOUT PASSED`. Systemic asks twice before it fires. `UNDO LAST` reverses the last
move exactly, including one that hit the floor.

Set the session to `PRE-MARKET` before gavel-in — the board shows the how-to-read screen — then
`OPEN` when you gavel and `CLOSE` at the end.

**The board laptop.** Open `/panel` on it once and enter the passcode before you open `/board` —
the keys below are director actions and the server refuses them otherwise. If you forget, the board
says `LOCKED` in the corner rather than pretending the move landed.

Keys, once it's unlocked — this is your fallback if the wifi dies:

| Key | Does |
|---|---|
| `1` `2` `3` `4` | pick the size |
| `↑` `↓` | move the market by it |
| `H` | show / hide the how-to-read screen |

If the network goes down the board keeps rendering, scrolling and drifting on its last state, and
keyboard moves apply locally until it comes back — at which point it resyncs to whatever the dais
actually did on their phones, so the projector can't spend the afternoon quietly disagreeing with
the database.

## The spec

[`docs/specs/jag-composite-board-design-spec.md`](docs/specs/jag-composite-board-design-spec.md) —
the board, the panel, the derivation formulas, and what was deliberately cut.
