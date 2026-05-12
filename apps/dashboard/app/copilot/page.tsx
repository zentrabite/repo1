"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, RotateCcw } from "lucide-react";

const C = {
  g: "#00B67A",
  o: "#FF6B35",
  st: "#6B7C93",
  cl: "#F8FAFB",
  mist: "rgba(226,232,240,.08)",
};

const SUGGESTIONS = [
  "How's my business doing today?",
  "Which customers are At Risk?",
  "What's my best-performing win-back rule?",
  "Anything low on stock?",
  "How can I improve direct-channel orders?",
];

type Msg = { role: "u" | "b"; html: string };

// Tiny safe markdown renderer (escape, then re-introduce limited tags)
function renderMarkdown(raw: string): string {
  let html = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(/`([^`\n]+)`/g, "<code style=\"background:rgba(0,182,122,.12);color:#00B67A;padding:1px 6px;border-radius:4px;font-size:12.5px\">$1</code>");
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, "• $1");
  html = html.replace(/\n/g, "<br>");
  return html;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "b",
      html:
        "Hi! I'm your AI copilot. I can see your live business data — orders, customers, win-back stats, stock, reviews — and answer questions about it.<br><br>What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text?: string) {
    if (busy) return;
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    setBusy(true);

    const history = [...messages, { role: "u" as const, html: q }].map((m) => ({
      role: m.role === "u" ? "user" : "assistant",
      content: m.html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
    }));

    setMessages((m) => [...m, { role: "u", html: q }]);
    setStreaming("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error ?? `Error ${res.status}`;
        setStreaming(null);
        setMessages((m) => [...m, { role: "b", html: `⚠️ ${errMsg}` }]);
        return;
      }

      if (!res.body) {
        setStreaming(null);
        setMessages((m) => [...m, { role: "b", html: "⚠️ No response stream." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }

      setStreaming(null);
      setMessages((m) => [...m, { role: "b", html: renderMarkdown(acc) }]);
    } catch (err: unknown) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        setStreaming(null);
        setMessages((m) => [
          ...m,
          { role: "b", html: "⚠️ Connection lost. Try again." },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setBusy(false);
    setStreaming(null);
    setMessages([
      {
        role: "b",
        html: "Cleared. What would you like to know?",
      },
    ]);
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "8px 24px 24px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 24, color: C.cl, margin: 0,
          }}>
            <Sparkles size={22} color={C.g} />
            AI Copilot
          </h1>
          <p style={{ fontSize: 13, color: C.st, margin: "4px 0 0 32px" }}>
            Ask anything about your business — I have access to your live data.
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8,
            background: "transparent", border: `1px solid ${C.mist}`,
            color: C.st, fontSize: 12.5, cursor: "pointer",
            fontFamily: "var(--font-outfit)", fontWeight: 500,
          }}
        >
          <RotateCcw size={13} /> New chat
        </button>
      </div>

      {/* ── Chat window ── */}
      <div style={{
        background: "rgba(15,28,47,.5)",
        border: `1px solid ${C.mist}`,
        borderRadius: 14,
        minHeight: 520,
        maxHeight: "calc(100vh - 280px)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: "auto",
            padding: "20px 22px",
            display: "flex", flexDirection: "column", gap: 14,
          }}
        >
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "u" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: m.role === "u" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "u" ? "rgba(0,182,122,.16)" : "rgba(226,232,240,.06)",
              border: m.role === "u" ? "1px solid rgba(0,182,122,.25)" : `1px solid ${C.mist}`,
              fontFamily: "var(--font-inter)", fontSize: 13.5, lineHeight: 1.55,
              color: m.role === "u" ? C.cl : C.cl,
              wordBreak: "break-word",
            }}
            dangerouslySetInnerHTML={{ __html: m.html }} />
          ))}

          {streaming !== null && (
            <div style={{
              alignSelf: "flex-start", maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: "14px 14px 14px 4px",
              background: "rgba(226,232,240,.06)",
              border: `1px solid ${C.mist}`,
              fontFamily: "var(--font-inter)", fontSize: 13.5, lineHeight: 1.55, color: C.cl,
              wordBreak: "break-word",
            }}
            dangerouslySetInnerHTML={{ __html: streaming === "" ? "<span style=\"color:#6B7C93\">Thinking…</span>" : renderMarkdown(streaming) }} />
          )}
        </div>

        {/* ── Suggestions (only when fresh) ── */}
        {messages.length === 1 && !busy && (
          <div style={{ padding: "0 22px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  padding: "8px 12px", borderRadius: 999,
                  background: "rgba(0,182,122,.08)",
                  border: "1px solid rgba(0,182,122,.2)",
                  color: C.g, fontSize: 12, cursor: "pointer",
                  fontFamily: "var(--font-outfit)", fontWeight: 500,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Composer ── */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          style={{
            display: "flex", gap: 10,
            padding: "14px 18px", borderTop: `1px solid ${C.mist}`,
            background: "rgba(15,28,47,.7)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={busy ? "Thinking…" : "Ask anything about your business…"}
            disabled={busy}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              background: "rgba(226,232,240,.04)",
              border: `1px solid ${C.mist}`,
              color: C.cl, fontSize: 13.5, outline: "none",
              fontFamily: "var(--font-inter)",
            }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 10,
              background: busy || !input.trim() ? "rgba(0,182,122,.2)" : C.g,
              border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: busy || !input.trim() ? "not-allowed" : "pointer",
              fontFamily: "var(--font-outfit)",
            }}
          >
            <Send size={14} /> Send
          </button>
        </form>
      </div>

      <p style={{ fontSize: 11, color: C.st, marginTop: 12, textAlign: "center" }}>
        Powered by Claude · Your data stays in your account. Limited to 30 questions/hour.
      </p>
    </div>
  );
}
