"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import Modal from "@/components/modal";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getReviews, updateReview } from "@/lib/queries";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", am:"#F59E0B", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.08)" };

type Review = {
  id: string;
  customer_name?: string | null;
  platform?: string | null;
  rating: number;
  comment?: string | null;
  replied: boolean;
  reply_text?: string | null;
  created_at: string;
};

const PLATFORMS = ["All","Google","Uber Eats","DoorDash","Yelp","Direct","Other"];
const RATINGS   = ["All","5★","4★","3★","2★","1★"];

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize:13, letterSpacing:1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= rating ? C.am : "rgba(255,255,255,.15)" }}>★</span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [reviews,       setReviews]       = useState<Review[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [platform,      setPlatform]      = useState("All");
  const [ratingFilter,  setRatingFilter]  = useState("All");
  const [replied,       setReplied]       = useState<"all"|"replied"|"pending">("all");
  const [search,        setSearch]        = useState("");
  const [selected,      setSelected]      = useState<Review | null>(null);
  const [replyText,     setReplyText]     = useState("");
  const [replying,      setReplying]      = useState(false);

  useEffect(() => {
    if (!businessId) return;
    getReviews(businessId).then(d => {
      setReviews(d as Review[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [businessId]);

  const filtered = reviews
    .filter(r => platform === "All" || r.platform === platform)
    .filter(r => ratingFilter === "All" || r.rating === parseInt(ratingFilter))
    .filter(r => replied === "all" ? true : replied === "replied" ? r.replied : !r.replied)
    .filter(r => !search || (r.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.comment ?? "").toLowerCase().includes(search.toLowerCase()));

  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";
  const pendingCount = reviews.filter(r => !r.replied).length;

  const openReply = (r: Review) => {
    setSelected(r);
    setReplyText(r.reply_text ?? "");
  };
  const closeReply = () => { setSelected(null); setReplyText(""); };

  const saveReply = async () => {
    if (!selected) return;
    setReplying(true);
    try {
      const updated = await updateReview(selected.id, { replied: true, reply_text: replyText.trim() || null });
      setReviews(prev => prev.map(r => r.id === selected.id ? updated as Review : r));
      show("Reply saved ✓");
      closeReply();
    } catch { show("Save failed"); }
    finally { setReplying(false); }
  };

  const markNoReply = async (r: Review) => {
    try {
      const updated = await updateReview(r.id, { replied: true, reply_text: null });
      setReviews(prev => prev.map(x => x.id === r.id ? updated as Review : x));
      show("Marked as handled ✓");
    } catch { show("Update failed"); }
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Reviews</h2>
          <p style={{ color:C.st, fontSize:12 }}>{reviews.length} reviews · avg {avg} ★ · {pendingCount} pending reply</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"Total Reviews",    value: reviews.length,                  color:"#fff" },
          { label:"Average Rating",   value: avg + " ★",                      color:C.am  },
          { label:"5-Star Reviews",   value: reviews.filter(r=>r.rating===5).length, color:C.g },
          { label:"Pending Reply",    value: pendingCount,                    color: pendingCount > 0 ? C.o : C.g },
        ].map(s => (
          <div key={s.label} className="gc" style={{ padding:"14px 16px" }}>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.st, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or review…" style={{ width:200 }} />
        <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, padding:"6px 10px", color:"#fff", fontSize:13 }}>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, padding:"6px 10px", color:"#fff", fontSize:13 }}>
          {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(["all","pending","replied"] as const).map(f => (
          <button key={f} className={`bg-btn ${replied===f?"on":""}`} onClick={() => setReplied(f)} style={{ textTransform:"capitalize" }}>{f}</button>
        ))}
      </div>

      {/* ── Reviews list ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.length === 0 ? (
          <div className="gc" style={{ padding:32, textAlign:"center", color:C.st, fontSize:13 }}>
            {loading ? "Loading…" : reviews.length === 0 ? "No reviews yet — they'll appear here as customers leave feedback" : "No reviews match this filter"}
          </div>
        ) : filtered.map((r) => (
          <div key={r.id} className="gc" style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <span style={{ fontWeight:600, color:"#fff", fontSize:13 }}>{r.customer_name || "Anonymous"}</span>
                  <Stars rating={r.rating} />
                  {r.platform && <Badge type={r.platform}>{r.platform}</Badge>}
                  <span style={{ fontSize:11, color:C.st }}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && (
                  <p style={{ fontSize:13, color:C.cl, lineHeight:1.6, margin:"0 0 8px" }}>{r.comment}</p>
                )}
                {r.replied && r.reply_text && (
                  <div style={{ background:"rgba(0,182,122,.07)", border:"1px solid rgba(0,182,122,.15)", borderRadius:8, padding:"8px 12px", fontSize:12, color:C.g }}>
                    <strong>Your reply:</strong> {r.reply_text}
                  </div>
                )}
                {r.replied && !r.reply_text && (
                  <div style={{ fontSize:11, color:C.st, fontStyle:"italic" }}>Marked as handled — no reply text</div>
                )}
              </div>
              <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                {!r.replied ? (
                  <>
                    <button className="bp" style={{ padding:"5px 12px", fontSize:12 }} onClick={() => openReply(r)}>Reply</button>
                    <button className="bg-btn" style={{ padding:"5px 10px", fontSize:11 }} onClick={() => markNoReply(r)}>Mark Handled</button>
                  </>
                ) : (
                  <button className="bg-btn" style={{ padding:"5px 10px", fontSize:11 }} onClick={() => openReply(r)}>Edit Reply</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Reply Modal ── */}
      <Modal open={!!selected} onClose={closeReply} title={selected?.replied ? "Edit Reply" : `Reply to ${selected?.customer_name || "Review"}`}>
        {selected && (
          <>
            <div style={{ background:"rgba(255,255,255,.04)", borderRadius:8, padding:"10px 14px", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <Stars rating={selected.rating} />
                {selected.platform && <Badge type={selected.platform}>{selected.platform}</Badge>}
              </div>
              <p style={{ fontSize:13, color:C.cl, margin:0, lineHeight:1.5 }}>{selected.comment || <span style={{ color:C.st, fontStyle:"italic" }}>No comment</span>}</p>
            </div>
            <div style={{ marginBottom:16 }}>
              <label>Your Reply</label>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={4}
                placeholder="Write a thoughtful reply to this review…"
                style={{ width:"100%" }}
              />
            </div>
            <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
              <button className="bg-btn" onClick={closeReply}>Cancel</button>
              <button className="bp" onClick={saveReply} disabled={replying}>{replying ? "Saving…" : "Save Reply"}</button>
            </div>
          </>
        )}
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
