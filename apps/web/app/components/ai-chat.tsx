"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./zb-icon";

// The website assistant. Streams answers from /api/ai-chat, which uses the
// system prompt in lib/zentrabite-context.ts.

const INITIAL_SUGS = [
  "Does it work for my type of business?",
  "How do win-back texts work?",
  "How is this different from Square?",
  "What's in the free trial?",
];

const FOLLOWUPS = [
  "Show me the demo",
  "Can I sign up now?",
  "How does pricing work?",
  "Does it work for my type of business?",
];

type Msg = { role: "u" | "b"; text: string };

// Small, safe Markdown for chat answers. Escapes all HTML first, then allows
// **bold**, _italic_, bullets and line breaks.
function renderMarkdown(raw: string): string {
  let html = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(/`([^`\n]+)`/g, "$1");
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, "• $1");
  // Turn our own page paths into links. Only these exact paths match.
  html = html.replace(
    /(^|[\s(])(\/(?:contact|pricing|how-it-works|demo(?:\/(?:live|merchant|app|super-admin))?))(?=[\s).,!?]|$)/gm,
    '$1<a href="$2" class="text-link">$2</a>',
  );
  html = html.replace(/\n/g, "<br>");
  return html;
}

export function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "b",
      text: "Hi. Ask me anything about ZentraBite. What it does, which businesses it suits, pricing or how it compares to what you use now.",
    },
  ]);
  const [sugs, setSugs] = useState<string[]>(INITIAL_SUGS);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text?: string) {
    if (busy) return;
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    setSugs([]);
    setBusy(true);

    const history = [...messages, { role: "u" as const, text: q }].map((m) => ({
      role: m.role === "u" ? "user" : "assistant",
      content: m.text,
    }));
    setMessages((m) => [...m, { role: "u", text: q }]);

    const controller = new AbortController();
    abortRef.current = controller;
    let received = "";
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
      setStreaming("");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        received += chunk;
        setStreaming(received);
      }
    } catch {
      if (controller.signal.aborted) return;
      received =
        received ||
        "Sorry, I couldn't answer that just now. Try again in a moment, or book a quick call at /contact and a person will answer.";
    } finally {
      setStreaming(null);
      setMessages((m) => [...m, { role: "b", text: received }]);
      setBusy(false);
      setSugs(FOLLOWUPS);
      abortRef.current = null;
    }
  }

  return (
    <div className="chat">
      <div className="chat-hdr">
        <div className="chat-av">
          <Icon name="ai" size={18} />
        </div>
        <div>
          <div className="chat-nm">ZentraBite assistant</div>
          <div className="chat-st">Answers questions about ZentraBite</div>
        </div>
      </div>
      <div className="chat-msgs" ref={scrollRef} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "b" ? (
              <div className="msg-bub" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
            ) : (
              <div className="msg-bub">{m.text}</div>
            )}
          </div>
        ))}
        {streaming !== null && streaming !== "" && (
          <div className="msg b">
            <div className="msg-bub" dangerouslySetInnerHTML={{ __html: renderMarkdown(streaming) }} />
          </div>
        )}
        {busy && !streaming && <div className="typing">Thinking…</div>}
      </div>
      {sugs.length > 0 && (
        <div className="chat-sugs">
          {sugs.map((s) => (
            <button key={s} type="button" className="sug" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="chat-in-row"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="ai-chat-input" className="sr-only">
          Ask a question about ZentraBite
        </label>
        <input
          id="ai-chat-input"
          className="input"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          autoComplete="off"
        />
        <button className="chat-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">
          <Icon name="send" size={18} accent="currentColor" />
        </button>
      </form>
    </div>
  );
}
