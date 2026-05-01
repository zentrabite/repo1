"use client";

import { useMemo, useState } from "react";
import {
  reviews as seedReviews,
  reviewPlatformColor,
  type DemoReview,
  type ReviewPlatform,
  formatDateTime,
} from "../data";

const PLATFORMS: ("All" | ReviewPlatform)[] = ["All", "Google", "Uber Eats", "DoorDash", "Yelp", "Direct"];
const RATING_FILTERS = ["All", "5", "4", "3", "2", "1"] as const;
type ReplyFilter = "all" | "pending" | "replied";

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 13, letterSpacing: 1.5 }} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#F59E0B" : "rgba(255,255,255,0.18)" }}>★</span>
      ))}
    </span>
  );
}

export default function DemoReviewsPage() {
  const [list, setList] = useState<DemoReview[]>(seedReviews);
  const [platform, setPlatform] = useState<"All" | ReviewPlatform>("All");
  const [rating, setRating] = useState<(typeof RATING_FILTERS)[number]>("All");
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    return list.filter((r) => {
      if (platform !== "All" && r.platform !== platform) return false;
      if (rating !== "All" && r.rating !== Number(rating)) return false;
      if (replyFilter === "pending" && r.replied) return false;
      if (replyFilter === "replied" && !r.replied) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!r.customerName.toLowerCase().includes(q) && !r.comment.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [list, platform, rating, replyFilter, query]);

  const total = list.length;
  const avg = total > 0 ? (list.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "—";
  const fiveStars = list.filter((r) => r.rating === 5).length;
  const pending = list.filter((r) => !r.replied).length;

  const openReply = (r: DemoReview) => {
    setEditing(r.id);
    setDraft(r.replyText ?? "");
  };
  const cancelReply = () => {
    setEditing(null);
    setDraft("");
  };
  const saveReply = (id: string) => {
    setList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, replied: true, replyText: draft.trim() || undefined } : r)),
    );
    cancelReply();
  };
  const markHandled = (id: string) => {
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, replied: true, replyText: undefined } : r)));
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Customer feedback · Reputation</div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Reviews
        </h1>
        <div style={{ fontSize: 14, color: "var(--steel)", marginTop: 6 }}>
          {total} reviews · avg {avg} ★ · {pending} pending reply
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <StatCard label="Total reviews" value={String(total)} />
        <StatCard label="Average rating" value={`${avg} ★`} valueColor="#F59E0B" />
        <StatCard label="5-star reviews" value={String(fiveStars)} valueColor="var(--green)" />
        <StatCard
          label="Pending reply"
          value={String(pending)}
          valueColor={pending > 0 ? "#FF6B35" : "var(--green)"}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: 14,
          borderRadius: 12,
          background: "var(--navy-40)",
          border: "1px solid var(--mist-6)",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or comment..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--mist-9)",
            background: "rgba(15,25,42,0.55)",
            color: "var(--cloud)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as "All" | ReviewPlatform)}
          style={selectStyle}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p === "All" ? "All platforms" : p}
            </option>
          ))}
        </select>
        <select value={rating} onChange={(e) => setRating(e.target.value as (typeof RATING_FILTERS)[number])} style={selectStyle}>
          {RATING_FILTERS.map((r) => (
            <option key={r} value={r}>
              {r === "All" ? "All ratings" : `${r}★ only`}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "pending", "replied"] as ReplyFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setReplyFilter(f)}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: replyFilter === f ? "var(--green)" : "rgba(15,25,42,0.6)",
                color: replyFilter === f ? "var(--navy)" : "var(--steel)",
                border: replyFilter === f ? "1px solid var(--green)" : "1px solid var(--mist-9)",
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--steel)",
              fontSize: 13,
              borderRadius: 14,
              background: "var(--navy-40)",
              border: "1px solid var(--mist-6)",
            }}
          >
            No reviews match this filter.
          </div>
        ) : (
          filtered.map((r) => {
            const platformColor = reviewPlatformColor[r.platform];
            const isEditing = editing === r.id;
            return (
              <div
                key={r.id}
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "var(--navy-40)",
                  border: "1px solid var(--mist-6)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
                        {r.customerName}
                      </span>
                      <Stars rating={r.rating} />
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          color: platformColor.color,
                          background: platformColor.bg,
                        }}
                      >
                        {r.platform}
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--steel)" }}>{formatDateTime(r.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--cloud)", lineHeight: 1.6, margin: "0 0 10px" }}>{r.comment}</p>

                    {r.replied && r.replyText && !isEditing && (
                      <div
                        style={{
                          background: "rgba(0,182,122,0.07)",
                          border: "1px solid rgba(0,182,122,0.2)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          fontSize: 13,
                          color: "var(--cloud)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--green)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          Your reply
                        </div>
                        {r.replyText}
                      </div>
                    )}
                    {r.replied && !r.replyText && !isEditing && (
                      <div style={{ fontSize: 12, color: "var(--steel)", fontStyle: "italic" }}>
                        Marked as handled · no reply text
                      </div>
                    )}

                    {isEditing && (
                      <div style={{ display: "grid", gap: 8 }}>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={3}
                          placeholder="Write a thoughtful reply…"
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid var(--mist-9)",
                            background: "rgba(15,25,42,0.55)",
                            color: "var(--cloud)",
                            fontSize: 14,
                            fontFamily: "inherit",
                            outline: "none",
                            resize: "vertical",
                          }}
                          autoFocus
                        />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={cancelReply} style={btnGhost}>Cancel</button>
                          <button onClick={() => saveReply(r.id)} style={btnPrimary}>Save reply</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {!r.replied ? (
                        <>
                          <button onClick={() => openReply(r)} style={btnPrimary}>Reply</button>
                          <button onClick={() => markHandled(r.id)} style={btnGhost}>Mark handled</button>
                        </>
                      ) : (
                        <button onClick={() => openReply(r)} style={btnGhost}>Edit reply</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor = "var(--cloud)" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "var(--navy-40)",
        border: "1px solid var(--mist-6)",
      }}
    >
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: valueColor }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--mist-9)",
  background: "rgba(15,25,42,0.55)",
  color: "var(--cloud)",
  fontSize: 13,
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "1px solid var(--green)",
  background: "var(--green)",
  color: "var(--navy)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnGhost: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid var(--mist-9)",
  background: "rgba(15,25,42,0.55)",
  color: "var(--cloud)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
