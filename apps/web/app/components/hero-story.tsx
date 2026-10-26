"use client";

import { useEffect, useRef, useState } from "react";
import { CrmMock } from "./crm-mock";
import { Icon } from "./zb-icon";

// The homepage hero. Plays the win-back story on the CRM drawing in a loop.
// A regular goes quiet, ZentraBite texts them an offer, they order again.
// Stops when it's off screen or the tab is hidden, has a pause button, and
// shows the finished story without moving for people who've asked their
// device for less motion. Styles are .story* in globals.css.

const STAGE_MS = [1700, 1900, 1700, 2300, 3600];
const LAST = STAGE_MS.length - 1;

const CAPTIONS = [
  { from: 1, to: 1, text: "Spots a regular going quiet" },
  { from: 2, to: 3, text: "Texts them an offer" },
  { from: 4, to: 4, text: "Shows you who came back" },
];

export function HeroStory() {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  // Less motion: show the finished story and don't loop.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setStill(mq.matches);
      if (mq.matches) setStage(LAST);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Only run while it's on screen and the tab is showing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.25 });
    io.observe(el);
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (still || paused || !visible) return;
    const t = window.setTimeout(() => setStage((s) => (s >= LAST ? 0 : s + 1)), STAGE_MS[stage]);
    return () => window.clearTimeout(t);
  }, [stage, still, paused, visible]);

  const running = !still && !paused;

  return (
    <figure className="story" ref={ref}>
      <div
        className="story-stage"
        role="img"
        aria-label="The ZentraBite CRM. A regular called James goes quiet, ZentraBite texts him a $5 offer, and he orders again."
      >
        <CrmMock stage={stage} />

        <div className={`story-sms${stage >= 3 ? " show" : ""}`} aria-hidden>
          <div className="story-sms-from">
            <span className="story-sms-ico">
              <Icon name="sms" size={14} accent="currentColor" />
            </span>
            Nonna&apos;s Kitchen
            <span className="story-sms-time">now</span>
          </div>
          <p>Hi James, we haven&apos;t seen you in a while. Here&apos;s $5 off your next order. Use code BACK5 before Sunday.</p>
        </div>

        <div className={`story-toast${stage >= 4 ? " show" : ""}`} aria-hidden>
          <span className="story-toast-ico">
            <Icon name="orders" size={16} accent="currentColor" />
          </span>
          <span>
            <b>New order from James K.</b>
            <span>$42.50, used BACK5</span>
          </span>
        </div>
      </div>

      <figcaption className="story-steps">
        <ol>
          {CAPTIONS.map((c, i) => {
            const on = stage >= c.from && stage <= c.to;
            const done = stage > c.to;
            return (
              <li key={c.text} className={on ? "on" : done ? "done" : ""}>
                <span className="story-num">{i + 1}</span>
                {c.text}
              </li>
            );
          })}
        </ol>
        {!still && (
          <button
            type="button"
            className="story-pause"
            onClick={() => setPaused((p) => !p)}
            aria-label={running ? "Pause the animation" : "Play the animation"}
            title={running ? "Pause" : "Play"}
          >
            <Icon name={running ? "pause" : "play"} size={16} accent="currentColor" />
          </button>
        )}
      </figcaption>
    </figure>
  );
}
