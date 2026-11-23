// A fake Supabase for looking at logged-in CRM pages locally with sample
// data. Answers the auth user call and PostgREST reads from fixtures.json,
// logs every write, and saves nothing. Never pointed at anything real.
import http from "node:http";
import { readFileSync, appendFileSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 54321);
const fx = () => JSON.parse(readFileSync(dir + "fixtures.json", "utf8"));
const log = (line) => appendFileSync(dir + "writes.log", line + "\n");

function filterRows(rows, params) {
  return rows.filter(r => {
    for (const [k, v] of params) {
      if (["select", "order", "limit", "offset", "or", "and", "on_conflict", "columns"].includes(k)) continue;
      if (v === "not.is.null") { if (r[k] == null) return false; continue; }
      const m = /^(eq|neq|gt|gte|lt|lte|in|is)\.(.*)$/.exec(v);
      if (!m) continue;
      const [, op, raw] = m;
      const cell = r[k];
      if (op === "eq" && String(cell) !== raw) return false;
      if (op === "neq" && String(cell) === raw) return false;
      if (op === "in") {
        const list = raw.replace(/^\(|\)$/g, "").split(",").map(s => s.replace(/^"|"$/g, ""));
        if (!list.includes(String(cell))) return false;
      }
      if (op === "is" && raw === "null" && cell != null) return false;
      if (["gt", "gte", "lt", "lte"].includes(op) && cell != null) {
        const a = String(cell), b = raw;
        if (op === "gt" && !(a > b)) return false;
        if (op === "gte" && !(a >= b)) return false;
        if (op === "lt" && !(a < b)) return false;
        if (op === "lte" && !(a <= b)) return false;
      }
    }
    return true;
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cors = {
    "access-control-allow-origin": req.headers.origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
    "access-control-expose-headers": "content-range",
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  let body = "";
  req.on("data", c => (body += c));
  req.on("end", () => {
    const data = fx();
    const send = (status, json, extra = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...cors, ...extra });
      res.end(json === undefined ? "" : JSON.stringify(json));
    };
    // The fake token is "fake-<user id>" (login.mjs), so any login works.
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    const logins = [data.user, data.seller, data.staff, ...(data.auth_users ?? [])].filter(Boolean);
    const me = logins.find(u => token === `fake-${u.id}`) ?? data.user;
    if (url.pathname === "/auth/v1/user") return send(200, me);
    const admin = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(url.pathname);
    if (admin) {
      const u = logins.find(l => l.id === admin[1]);
      return u ? send(200, u) : send(404, { message: "User not found" });
    }
    // An invite or magic link. The link goes nowhere real.
    if (url.pathname === "/auth/v1/admin/generate_link") {
      const { type, email } = body ? JSON.parse(body) : {};
      log(`POST generate_link ${type} ${email}`);
      const known = logins.find(l => l.email === email);
      if (type === "invite" && known) return send(422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" });
      return send(200, { action_link: `http://localhost:3000/fake-${type}/${encodeURIComponent(email)}`, email_otp: "000000", hashed_token: "fake", redirect_to: "http://localhost:3000/login", verification_type: type, ...(known ?? { id: "66666666-6666-4666-8666-666666666666", email, invited_at: new Date().toISOString() }) });
    }
    // get_my_business_id() and get_my_role() the way migration 030 works them out.
    const rpc = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
    if (rpc) {
      const row = (data.tables.users ?? []).find(u => u.id === me.id);
      const member = row?.business_id ? null : (data.tables.business_members ?? [])
        .filter(m => m.email === String(me.email).toLowerCase() && me.invited_at && me.email_confirmed_at && !["removed", "revoked"].includes(m.status))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
      if (rpc[1] === "get_my_business_id") return send(200, row?.business_id ?? member?.business_id ?? null);
      if (rpc[1] === "get_my_role") return send(200, row?.business_id ? "Owner" : member?.role ?? null);
      return send(404, { message: "rpc not mocked" });
    }
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
    if (!m) { log(`${req.method} ${url.pathname} (not handled)`); return send(404, { message: "not mocked" }); }
    const table = m[1];
    if (req.method !== "GET" && req.method !== "HEAD") {
      log(`${req.method} ${table} ${url.search} ${body}`);
      return send(200, req.headers.prefer?.includes("return=representation") ? (body ? JSON.parse(body) : []) : undefined);
    }
    const rows = filterRows(data.tables[table] ?? [], url.searchParams);
    const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
    const range = { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` };
    if (req.method === "HEAD") return send(200, undefined, range);
    if (single) return rows[0] ? send(200, rows[0], range) : send(406, { code: "PGRST116", message: "no rows" });
    return send(200, rows, range);
  });
}).listen(PORT, () => console.log(`mock supabase on ${PORT}`));
