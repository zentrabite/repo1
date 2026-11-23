// A small stand-in for the Supabase client, for tests.
//
// Every query is recorded in db.calls, so a test can check what was written.
// Answers come from handlers keyed "table.operation" (for example
// "businesses.select" or "orders.insert"). A handler gets the recorded query
// and returns { data, error }. With no handler, a query returns no data.
// db.rpc(name, args) answers from a handler keyed "rpc.<name>", and
// link_signing_secret (migration 035) has a test secret by default.

export type Filter = [column: string, value: unknown];

export type Query = {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  payload?: unknown;
  filters: Filter[];
};

/** count is for select(..., { count: "exact", head: true }). */
type Result = { data: unknown; error: { code?: string; message: string } | null; count?: number | null };
type Handler = (q: Query) => Result | undefined;

export function fakeDb(handlers: Record<string, Handler> = {}) {
  const calls: Query[] = [];

  function run(q: Query): Result {
    const h = handlers[`${q.table}.${q.op}`];
    return h?.(q) ?? { data: null, error: null };
  }

  function from(table: string) {
    const q: Query = { table, op: "select", filters: [] };
    calls.push(q);
    const builder = {
      select(columns?: string) { if (q.op === "select") q.columns = columns; return builder; },
      insert(payload: unknown) { q.op = "insert"; q.payload = payload; return builder; },
      upsert(payload: unknown) { q.op = "upsert"; q.payload = payload; return builder; },
      update(payload: unknown) { q.op = "update"; q.payload = payload; return builder; },
      delete() { q.op = "delete"; return builder; },
      eq(column: string, value: unknown) { q.filters.push([column, value]); return builder; },
      in(column: string, value: unknown) { q.filters.push([column, value]); return builder; },
      // Recorded as "column not op", for example ["cleared_at not is", null].
      not(column: string, op: string, value: unknown) { q.filters.push([`${column} not ${op}`, value]); return builder; },
      // Recorded as "column ilike", for example ["email ilike", "sam@example.com"].
      ilike(column: string, value: unknown) { q.filters.push([`${column} ilike`, value]); return builder; },
      // Recorded as "column is", for example ["redeemed_at is", null].
      is(column: string, value: unknown) { q.filters.push([`${column} is`, value]); return builder; },
      // Range filters are recorded as "column>=" and so on.
      gte(column: string, value: unknown) { q.filters.push([`${column}>=`, value]); return builder; },
      gt(column: string, value: unknown) { q.filters.push([`${column}>`, value]); return builder; },
      lt(column: string, value: unknown) { q.filters.push([`${column}<`, value]); return builder; },
      lte(column: string, value: unknown) { q.filters.push([`${column}<=`, value]); return builder; },
      order() { return builder; },
      limit() { return builder; },
      // Recorded as "range" with [from, to].
      range(from: number, to: number) { q.filters.push(["range", [from, to]]); return builder; },
      single: async () => run(q),
      maybeSingle: async () => run(q),
      then(resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(run(q)).then(resolve, reject);
      },
    };
    return builder;
  }

  const rpcCalls: { name: string; args: unknown }[] = [];
  async function rpc(name: string, args?: unknown): Promise<Result> {
    rpcCalls.push({ name, args });
    const h = handlers[`rpc.${name}`];
    const out = h?.({ table: name, op: "select", filters: [], payload: args });
    if (out) return out;
    if (name === "link_signing_secret") return { data: "test-link-secret-".padEnd(64, "x"), error: null };
    return { data: null, error: null };
  }

  return { from, rpc, calls, rpcCalls };
}

/** The value a query filtered on, for example filterValue(q, "id"). */
export function filterValue(q: Query, column: string): unknown {
  return q.filters.find(([c]) => c === column)?.[1];
}
