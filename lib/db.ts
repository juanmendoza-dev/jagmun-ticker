import postgres from 'postgres';
import type { Move } from './derive.ts';
import type { SessionStatus } from './state.ts';

const URL_ENV =
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  null;

export type Store = {
  ephemeral: boolean;
  moves(): Promise<Move[]>;
  status(): Promise<SessionStatus>;
  setStatus(s: SessionStatus): Promise<void>;
  /** Returns false if this id was already recorded, so a retrying phone can't double-apply. */
  append(m: Move): Promise<boolean>;
};

/* ── postgres ──────────────────────────────────────────────────────── */

let sql: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

function client(): postgres.Sql {
  sql ??= postgres(URL_ENV!, { max: 2, idle_timeout: 20, prepare: false });
  return sql;
}

function migrate(): Promise<void> {
  ready ??= (async () => {
    const q = client();
    await q`create table if not exists moves (
      id text primary key,
      delta numeric(10,2) not null,
      tier text not null,
      dir smallint not null,
      headline text not null default '',
      author text not null default '',
      undoes text,
      at timestamptz not null default now(),
      seq bigserial
    )`;
    await q`create table if not exists session (
      id smallint primary key default 1,
      status text not null default 'PRE'
    )`;
    await q`insert into session (id, status) values (1, 'PRE') on conflict (id) do nothing`;
  })();
  return ready;
}

const pg: Store = {
  ephemeral: false,
  async moves() {
    await migrate();
    const rows = await client()`
      select id, delta, tier, dir, headline, author, undoes, at from moves order by seq asc`;
    return rows.map((r) => ({
      id: r.id as string,
      delta: Number(r.delta),
      tier: r.tier as Move['tier'],
      dir: Number(r.dir) as 1 | -1,
      headline: r.headline as string,
      author: r.author as string,
      undoes: (r.undoes as string | null) ?? null,
      at: new Date(r.at as string).toISOString(),
    }));
  },
  async status() {
    await migrate();
    const [row] = await client()`select status from session where id = 1`;
    return ((row?.status as SessionStatus) ?? 'PRE') satisfies SessionStatus;
  },
  async setStatus(s) {
    await migrate();
    await client()`update session set status = ${s} where id = 1`;
  },
  async append(m) {
    await migrate();
    const rows = await client()`
      insert into moves (id, delta, tier, dir, headline, author, undoes, at)
      values (${m.id}, ${m.delta}, ${m.tier}, ${m.dir}, ${m.headline}, ${m.author},
              ${m.undoes ?? null}, ${m.at})
      on conflict (id) do nothing
      returning id`;
    return rows.length > 0;
  },
};

/* ── in-memory, for `npm run dev` with no database attached ────────── */

const mem = { moves: [] as Move[], status: 'PRE' as SessionStatus };

const memory: Store = {
  ephemeral: true,
  moves: async () => [...mem.moves],
  status: async () => mem.status,
  setStatus: async (s) => void (mem.status = s),
  append: async (m) => {
    if (mem.moves.some((x) => x.id === m.id)) return false;
    mem.moves.push(m);
    return true;
  },
};

/**
 * On Vercel every invocation is its own module instance, so the memory store would
 * give the board and the panel different states and lose everything between requests
 * — while working perfectly in dev. It is therefore refused in production, and when it
 * is in use the board carries a banner saying so.
 */
export function store(): Store {
  if (URL_ENV) return pg;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'No POSTGRES_URL / DATABASE_URL set. Attach a Postgres database in the Vercel ' +
        'dashboard — the in-memory store cannot be used in production.',
    );
  }
  return memory;
}
