"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_SUGS = [
  "How does the AI co-pilot work?",
  "What does smart delivery routing do?",
  "How is this different from Square?",
  "What's included in the 1-month trial?",
];

const FOLLOWUPS_AFTER_REPLY = [
  "Show me the demo",
  "What's in the 1-month trial?",
  "Which integrations are supported?",
  "How do you compare to Toast?",
];

type Msg = { role: "u" | "b"; html: string };

// Tiny, safe-by-default Markdown → HTML for chat output:
//   - escapes any HTML in the source first
//   - then re-introduces a small whitelist: **bold**, _italic_, `code`,
//     - bullets, line breaks
// The AI is told (in the system prompt) to stick to simple Markdown.
function renderMarkdown(raw: string): string {
  let html = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, "• $1");
  html = html.replace(/\n/g, "<br>");
  return html;
}

export function V4AiChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "b",
      html:
        "👋 Hey! Ask me anything about ZentraBite — features, pricing, integrations, or how it compares to other tools. What would you like to know?",
    },
  ]);
  const [sugs, setSugs] = useState<string[]>(INITIAL_SUGS);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing, streaming]);

  // Cancel any in-flight stream when the component unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send(text?: string) {
    if (busy) return;
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    setSugs([]);
    setBusy(true);
    setTyping(true);

    // Snapshot the conversation we're sending — strips local-only fields.
    const history = [...messages, { role: "u" as const, html: q }].map((m) => ({
      role: m.role === "u" ? "user" : "assistant",
      content: m.html,
    }));

    setMessages((m) => [...m, { role: "u", html: q }]);

    const controller = new AbortController();
    abortRef.current = controller;

    let received = "";
    let firstToken = false;
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        if (!firstToken) {
          firstToken = true;
          setTyping(false);
          setStreaming("");
        }
        received += chunk;
        setStreaming(received);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg =
        err instanceof Error
          ? err.message
          : "Sorry — I hit an unexpected error. Try again in a moment.";
      received =
        received ||
        `**Couldn't reach the AI.** ${msg}\n\nIf this keeps happening, book a 15-min call at /contact and a human can answer.`;
    } finally {
      setTyping(false);
      setStreaming(null);
      setMessages((m) => [...m, { role: "b", html: received }]);
      setBusy(false);
      setSugs(FOLLOWUPS_AFTER_REPLY);
      abortRef.current = null;
    }
  }

  return (
    <section id="ai-chat">
      <div className="ai-inner">
        <div className="ai-left reveal">
          <div className="s-eyebrow" style={{ marginBottom: 16 }}>
            AI Co-pilot
          </div>
          <h2>
            Your business,
            <br />
            <span style={{ color: "var(--g)" }}>on autopilot.</span>
          </h2>
          <p>
            Ask anything about ZentraBite in plain English — features, pricing,
            integrations, comparisons. Inside a real account, the same co-pilot
            also reads your orders, customers, stock, and financials, and tells
            you exactly what to do next.
          </p>
          <div className="ai-bullets">
            <Bullet icon="📊">
              Daily brief with your top 5 actionable insights at 7 AM every
              morning
            </Bullet>
            <Bullet icon="🤖">
              AI voice calls lapsed customers and logs every conversation
              outcome
            </Bullet>
            <Bullet icon="📣">
              Campaign recommendations based on live churn risk and revenue gaps
            </Bullet>
            <Bullet icon="💡">
              Menu, stock, and staffing suggestions backed by your real sales
              data
            </Bullet>
            <Bullet icon="🔍">
              Revenue anomaly detection — flags dips and tells you the exact
              cause
            </Bullet>
          </div>
          <a href="#v4-cta" className="btn-lg p" style={{ width: "fit-content" }}>
            See it in your account →
          </a>
        </div>
        <div className="reveal d1">
          <div className="chat-ui">
            <div className="chat-hdr">
              <div className="chat-av">✨</div>
              <div>
                <div className="chat-nm">ZentraBite AI</div>
                <div className="chat-st">
                  <span className="chat-st-dot" />
                  Online · ready to answer
                </div>
              </div>
            </div>
            <div className="chat-msgs" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div
                    className="msg-bub"
                    dangerouslySetInnerHTML={{
                      __html: m.role === "b" ? renderMarkdown(m.html) : m.html.replace(/\n/g, "<br>"),
                    }}
                  />
                  <div className="msg-t">Just now</div>
                </div>
              ))}
              {typing && (
                <div className="msg b">
                  <div className="typ-bub">
                    <span className="typ-d" />
                    <span className="typ-d" />
                    <span className="typ-d" />
                  </div>
                </div>
              )}
              {streaming !== null && (
                <div className="msg b">
                  <div
                    className="msg-bub"
                    dangerouslySetInnerHTML={{
                      __html:
                        renderMarkdown(streaming) +
                        '<span style="display:inline-block;width:2px;height:11px;background:var(--g);animation:v4-blink .7s infinite;margin-left:1px;vertical-align:middle;border-radius:1px;"></span>',
                    }}
                  />
                </div>
              )}
            </div>
            <div className="chat-sugs">
              {sugs.map((s) => (
                <span key={s} className="sug" onClick={() => send(s)}>
                  {s}
                </span>
              ))}
            </div>
            <div className="chat-in-row">
              <input
                className="chat-inp"
                placeholder="Ask anything about ZentraBite…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button
                className="chat-send"
                onClick={() => send()}
                disabled={busy}
                aria-label="Send"
              >
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="ai-b">
      <div className="ai-b-ico">{icon}</div>
      <span>{children}</span>
    </div>
  );
}
