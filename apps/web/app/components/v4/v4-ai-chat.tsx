"use client";

import { useEffect, useRef, useState } from "react";

const ANSWERS: Record<string, string> = {
  "who are my top customers":
    `Your <strong>top 5 by lifetime value</strong> this month:\n\n1. <strong>Priya S.</strong> — $482 · Gold · 11 orders · 2 days ago\n2. <strong>James K.</strong> — $371 · Silver · 9 orders · 4 days ago\n3. <strong>Olivia M.</strong> — $344 · Silver · 8 orders · today\n4. <strong>Nathan C.</strong> — $298 · Bronze · 7 orders · 6 days ago\n5. <strong>Aisha R.</strong> — $261 · Bronze · 6 orders · 3 days ago\n\n<strong>💡 Tip:</strong> Priya is 160pts from Platinum. A "you're almost there" SMS tonight could lock in her loyalty for Q2.`,
  "why is revenue down":
    `Revenue is <strong>down 14% vs. last week</strong> ($8,240 vs $9,580). Three root causes:\n\n📉 <strong>Thursday dropped 31%</strong> — storm + 3 driver no-shows\n🍔 <strong>Burger stock ran out</strong> Tuesday 7 PM — 90-min 86 of your #1 item\n📡 <strong>Uber Eats outage</strong> Wed 11 AM–2 PM — est. $320 lost\n\n<strong>💡 Actions:</strong> Raise burger par 40% Tue/Wed · Add backup Thursday drivers · Enable direct ordering fallback.`,
  "what should i promote":
    `Top 3 items by margin + opportunity:\n\n🥇 <strong>Wagyu Burger</strong> — $18.50 margin · 94% sell-through · only in 32% of orders. Banner = ~$460/wk extra.\n🥈 <strong>Garlic Prawn Pasta</strong> — $14.20 margin · 4.8★ · almost entirely dinner. A lunch promo opens a new slot.\n🥉 <strong>Mango Lassi</strong> — $9.80 margin · pairs with 60% of curry orders but only added 22% of the time. Checkout prompt = easy money.\n\n<strong>💡</strong> Want me to draft the SMS campaign now?`,
  "how do i reduce churn":
    `Your 30-day churn is <strong>18%</strong>, up from 13% last month. Here's the fix:\n\n🔄 <strong>42 customers</strong> 21+ days lapsed — AI win-back calls at 10 AM today\n📬 <strong>First-order retention is 44%</strong> — customers who got a post-order SMS were 2.3× more likely to return\n🎁 <strong>68 members</strong> have unredeemed rewards — a reminder SMS recovers ~22% within 7 days\n\n<strong>💡 Take all 3 actions:</strong> ZentraBite estimates ~$1,100 recovered this month.`,
};

const FOLLOWUPS: Record<string, string[]> = {
  "who are my top customers": [
    "Send Priya a tier upgrade SMS",
    "Who's at risk of churning?",
    "Show my Gold tier members",
  ],
  "why is revenue down": [
    "Fix my burger stock levels",
    "Set up driver backup",
    "Show week vs week comparison",
  ],
  "what should i promote": [
    "Draft the SMS campaign",
    "What's my highest margin item?",
    "Schedule a Tuesday promo",
  ],
  "how do i reduce churn": [
    "Start AI win-back calls now",
    "Set up post-order SMS",
    "Show the 42 at-risk customers",
  ],
};

const DEFAULT_FOLLOWUPS = [
  "What's my best day?",
  "Should I run a campaign?",
  "How are my rewards performing?",
];

const INITIAL_SUGS = [
  "Who are my top customers?",
  "Why is revenue down?",
  "What should I promote?",
  "How do I reduce churn?",
];

type Msg = { role: "u" | "b"; html: string };

export function V4AiChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "b",
      html: "👋 Hey! I'm your ZentraBite AI. I have access to your orders, customers, stock, and financials. What would you like to know?",
    },
  ]);
  const [sugs, setSugs] = useState<string[]>(INITIAL_SUGS);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing, streaming]);

  function send(text?: string) {
    if (busy) return;
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    setSugs([]);
    setBusy(true);
    setMessages((m) => [...m, { role: "u", html: q }]);
    const key = q.toLowerCase().replace(/[?!.]/g, "").trim();
    const answer =
      ANSWERS[key] ||
      `In a live ZentraBite account, I'd analyse your real orders, customers, and financials to answer: "<strong>${q}</strong>".\n\nI'd surface the top 2–3 actions ranked by revenue impact — specific to your data.\n\n<strong>Start your free trial</strong> to ask this with real, personalised answers.`;

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      // Stream the answer word-by-word into a streaming bubble.
      const words = answer.split(/(?<=\s)/);
      let i = 0;
      let built = "";
      setStreaming("");
      const next = () => {
        if (i < words.length) {
          built += words[i++];
          setStreaming(built);
          setTimeout(next, 14 + Math.random() * 16);
        } else {
          setStreaming(null);
          setMessages((m) => [...m, { role: "b", html: built }]);
          setBusy(false);
          setSugs(FOLLOWUPS[key] || DEFAULT_FOLLOWUPS);
        }
      };
      next();
    }, 850 + Math.random() * 500);
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
            Ask questions about your business in plain English. ZentraBite
            knows your orders, customers, stock, and financials — and tells you
            exactly what to do next.
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
                  Online · analysing your data
                </div>
              </div>
            </div>
            <div className="chat-msgs" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div
                    className="msg-bub"
                    dangerouslySetInnerHTML={{ __html: m.html.replace(/\n/g, "<br>") }}
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
                        streaming.replace(/\n/g, "<br>") +
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
                placeholder="Ask anything about your business…"
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
