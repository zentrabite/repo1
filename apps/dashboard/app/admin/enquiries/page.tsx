"use client";

// ─── /admin/enquiries ───────────────────────────────────────────────────────
// Contact form enquiries from zentrabite.com/contact, newest first. Super
// admins mark each one contacted or closed. Data comes from
// /api/admin/enquiries (service role, checked with lib/admin-auth.ts).
//
// Wide screens get a table. When the content area is narrow (phones, or a
// small window next to the sidebar) each row becomes a card, the same way
// the demo super admin table does.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { iconComponent } from "@/components/zb-icon";
import { MODULE_LABELS, type EnquiryRow, type EnquiryStatus } from "@/lib/enquiries";

const C = { g: "#00B67A", r: "#FF4757", st: "#6B7C93", cl: "#F8FAFB", mist: "rgba(226,232,240,.09)" };

const STATUS_LABEL: Record<EnquiryStatus, string> = { new: "New", contacted: "Contacted", closed: "Closed" };
// Existing badge colours: blue for new, amber while we're talking, grey when done.
const STATUS_BADGE: Record<EnquiryStatus, string> = { new: "New_order", contacted: "Preparing", closed: "Delivered" };
const STATUS_ORDER: EnquiryStatus[] = ["new", "contacted", "closed"];

const SOURCE_NOTE: Record<string, string> = {
  preview: "Sent from a preview site",
  local: "Sent from local dev",
  other: "Sent from outside the website",
};

const MailIcon = iconComponent("email");

const dateFmt = new Intl.DateTimeFormat("en-AU", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

function mailtoHref(email: string): string {
  const at = email.lastIndexOf("@");
  const addr = `${encodeURIComponent(email.slice(0, at))}@${encodeURIComponent(email.slice(at + 1))}`;
  return `mailto:${addr}?subject=${encodeURIComponent("Your ZentraBite enquiry")}`;
}

/** tel: link from what they typed, or null if there are no digits to dial. */
function telHref(phone: string): string | null {
  const dial = phone.replace(/[^\d+]/g, "");
  return /\d{6,}/.test(dial) ? `tel:${dial}` : null;
}

function locationsLabel(v: string): string {
  return v === "1" ? "1 location" : `${v} locations`;
}

/** True when the message or "uses now" text gets cut short until opened. */
function needsShowAll(row: EnquiryRow): boolean {
  const m = row.message ?? "";
  return m.length > 220 || m.split("\n").length > 3 || (row.current_tools ?? "").length > 120;
}

type ListResponse = { enquiries: EnquiryRow[]; hasMore: boolean; newCount: number | null };

export default function AdminEnquiriesPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useBusiness();

  const [rows, setRows]           = useState<EnquiryRow[]>([]);
  const [hasMore, setHasMore]     = useState(false);
  const [newCount, setNewCount]   = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [saving, setSaving]       = useState<string | null>(null);
  const [rowError, setRowError]   = useState<{ id: string; text: string } | null>(null);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [toast, setToast]         = useState({ text: "", visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = useCallback(async (before?: string): Promise<ListResponse> => {
    const qs = before ? `?before=${encodeURIComponent(before)}` : "";
    const res = await fetch(`/api/admin/enquiries${qs}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }, []);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchPage();
      setRows(Array.isArray(data.enquiries) ? data.enquiries : []);
      setHasMore(Boolean(data.hasMore));
      setNewCount(typeof data.newCount === "number" ? data.newCount : null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    loadFirst();
  }, [authLoading, isSuperAdmin, router, loadFirst]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function showToast(text: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
  }

  async function loadMore() {
    const last = rows[rows.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const data = await fetchPage(last.created_at);
      const seen = new Set(rows.map(r => r.id));
      setRows(prev => [...prev, ...(data.enquiries ?? []).filter(r => !seen.has(r.id))]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  async function setStatus(row: EnquiryRow, status: EnquiryStatus) {
    if (saving) return;
    setSaving(row.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/enquiries/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, status } : r)));
      setNewCount(n => (n === null ? n : n + (status === "new" ? 1 : 0) - (row.status === "new" ? 1 : 0)));
      showToast(`Marked ${STATUS_LABEL[status].toLowerCase()}`);
    } catch {
      setRowError({ id: row.id, text: "Couldn't save that. Try again." });
    } finally {
      setSaving(null);
    }
  }

  function toggleMessage(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (authLoading || (isSuperAdmin && loading)) {
    return <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", padding: 80, fontFamily: "var(--font-inter)" }}>Loading enquiries…</div>;
  }
  if (!isSuperAdmin) return null;

  const subtitle =
    newCount === null ? "From the contact form on zentrabite.com. Newest first."
    : newCount === 0  ? "Nothing new. From the contact form on zentrabite.com, newest first."
    : `${newCount.toLocaleString("en-AU")} new. From the contact form on zentrabite.com, newest first.`;

  return (
    <div className="enq-page">
      <Link href="/admin" className="enq-back">← Back to Super Admin</Link>

      <PageHeader title="Enquiries" subtitle={subtitle} />

      {loadError ? (
        <div className="gc" role="alert" style={{ padding: 24, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: C.cl, fontSize: 14, fontFamily: "var(--font-inter)" }}>Couldn&apos;t load enquiries.</span>
          <button className="bp" onClick={loadFirst}>Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MailIcon}
          title="No enquiries yet"
          description="When someone sends the form at zentrabite.com/contact, it shows up here."
        />
      ) : (
        <div className="enq-wrap">
          <div className="gc enq-card">
            <table className="enq-table">
              <colgroup>
                <col style={{ width: 116 }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
                <col />
                <col style={{ width: 160 }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">Who</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Message</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const tel = row.phone ? telHref(row.phone) : null;
                  const open = expanded.has(row.id);
                  const long = needsShowAll(row);
                  const cut = long && !open;
                  const meta = [row.business_type, row.locations ? locationsLabel(row.locations) : null].filter(Boolean).join(" · ");
                  const modules = (row.modules ?? []).map(m => MODULE_LABELS[m] ?? m);
                  return (
                    <tr key={row.id}>
                      <td className="c-date">
                        <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
                        {SOURCE_NOTE[row.source] && <div className="enq-muted enq-small">{SOURCE_NOTE[row.source]}</div>}
                      </td>
                      <td className="c-who">
                        <div className="enq-name" dir="auto">{row.name}</div>
                        <div className="enq-biz" dir="auto">{row.business_name}</div>
                        {meta && <div className="enq-muted enq-small">{meta}</div>}
                      </td>
                      <td className="c-contact">
                        <a className="enq-link" href={mailtoHref(row.email)}>{row.email}</a>
                        {row.phone && (tel
                          ? <a className="enq-link" href={tel}>{row.phone}</a>
                          : <div>{row.phone}</div>)}
                      </td>
                      <td className="c-message" data-label="Message">
                        <div id={`msg-${row.id}`}>
                          {row.message
                            ? <p className={`enq-msg${cut ? " clamp" : ""}`} dir="auto">{row.message}</p>
                            : <span className="enq-muted">No message</span>}
                          {modules.length > 0 && (
                            <div className="enq-tools">
                              <span className="enq-caption">Interested in</span>
                              <div>{modules.join(", ")}</div>
                            </div>
                          )}
                          {row.current_tools && (
                            <div className="enq-tools">
                              <span className="enq-caption">Uses now</span>
                              <div className={cut ? "clamp2" : undefined} dir="auto">{row.current_tools}</div>
                            </div>
                          )}
                        </div>
                        {long && (
                          <button
                            type="button"
                            className="enq-more"
                            aria-expanded={open}
                            aria-controls={`msg-${row.id}`}
                            onClick={() => toggleMessage(row.id)}
                          >
                            {open ? "Show less" : "Show all"}
                          </button>
                        )}
                      </td>
                      <td className="c-status">
                        <div className="enq-status">
                          <Badge type={STATUS_BADGE[row.status] ?? "inactive"}>{STATUS_LABEL[row.status] ?? row.status}</Badge>
                          <div className="enq-actions">
                            {STATUS_ORDER.filter(s => s !== row.status).map(s => (
                              <button
                                key={s}
                                type="button"
                                className="bg-btn"
                                disabled={saving !== null}
                                onClick={() => setStatus(row, s)}
                              >
                                {saving === row.id ? "Saving…" : `Mark ${STATUS_LABEL[s].toLowerCase()}`}
                              </button>
                            ))}
                          </div>
                          {rowError?.id === row.id && <div role="alert" className="enq-error">{rowError.text}</div>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(hasMore || moreError) && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              <button type="button" className="bg-btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Show older enquiries"}
              </button>
              {moreError && <span role="alert" className="enq-error">Couldn&apos;t load more. Try again.</span>}
            </div>
          )}
        </div>
      )}

      <Toast message={toast.text} visible={toast.visible} />

      <style>{`
        .enq-back { display: inline-block; color: ${C.st}; font-size: 13px; margin-bottom: 16px; font-family: var(--font-inter); text-decoration: none; }
        .enq-back:hover { color: ${C.cl}; }
        .enq-wrap { container-type: inline-size; container-name: enq; }
        .enq-card { overflow: hidden; }
        .enq-card:hover { box-shadow: none; }
        .enq-table { table-layout: fixed; }
        .enq-table tbody tr { cursor: default; }
        .enq-table td { vertical-align: top; overflow-wrap: anywhere; font-size: 13.5px; line-height: 1.5; }
        .enq-name { font-weight: 600; color: ${C.cl}; }
        .enq-biz { color: #E2E8F0; }
        .enq-muted { color: ${C.st}; }
        .enq-small { font-size: 12px; margin-top: 3px; }
        .enq-link { display: block; color: ${C.g}; text-decoration: none; width: fit-content; max-width: 100%; }
        .enq-link:hover { text-decoration: underline; }
        .enq-link + .enq-link, .enq-link + div { margin-top: 4px; }
        .enq-msg { margin: 0; white-space: pre-wrap; color: #E2E8F0; }
        .enq-msg.clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
        .enq-tools .clamp2 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
        .enq-caption { display: block; color: ${C.st}; font-size: 12px; }
        .enq-more { margin-top: 4px; padding: 2px 0; background: none; border: 0; color: ${C.g}; font: 600 12.5px var(--font-inter); cursor: pointer; }
        .enq-more:hover { text-decoration: underline; }
        .enq-tools { margin-top: 10px; }
        .enq-status { display: grid; gap: 8px; justify-items: start; }
        .enq-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        .enq-actions .bg-btn { padding: 6px 10px; font-size: 12px; }
        .enq-actions .bg-btn:disabled { opacity: .55; cursor: wait; }
        .enq-error { color: ${C.r}; font-size: 12.5px; font-family: var(--font-inter); }
        .enq-table a:focus-visible, .enq-table button:focus-visible, .enq-back:focus-visible {
          outline: 2px solid rgba(0,182,122,.7); outline-offset: 2px; border-radius: 4px;
        }

        /* Narrow: every row becomes a card */
        @container enq (max-width: 780px) {
          .enq-table thead { display: none; }
          .enq-table, .enq-table tbody { display: block; }
          .enq-table tr { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 16px; border-bottom: 1px solid ${C.mist}; }
          .enq-table tbody tr:last-child { border-bottom: 0; }
          .enq-table tbody tr:hover { background: transparent; }
          .enq-table td { display: block; padding: 0; border: 0; font-size: 14px; }
          .enq-table td.c-who     { order: 1; font-size: 15px; }
          .enq-table td.c-date    { order: 2; }
          .enq-table td.c-contact { order: 3; }
          .enq-table td.c-message { order: 4; }
          .enq-table td.c-status  { order: 5; padding-top: 12px; border-top: 1px solid ${C.mist}; }
          .enq-table td.c-date    { color: ${C.st}; font-size: 12.5px; }
          .enq-table td[data-label]::before { content: attr(data-label); }
          .enq-table td[data-label]::before, .enq-caption {
            display: block; margin-bottom: 3px;
            font: 600 11px var(--font-outfit); letter-spacing: .6px; text-transform: uppercase; color: ${C.st};
          }
          .enq-link { padding: 4px 0; }
          .enq-actions .bg-btn { padding: 9px 14px; font-size: 13px; }
          .enq-more { padding: 6px 0; }
        }
      `}</style>
    </div>
  );
}
