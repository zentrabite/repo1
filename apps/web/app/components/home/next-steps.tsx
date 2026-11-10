// 7. What happens next. Plain sentences in order, set as a staircase that
// steps down and across the page, so the order shows without numbers.

const STEPS = [
  "You tell us about your business.",
  "We reply to find a time for a 15-minute call.",
  "We set you up from your current website. You check it.",
  "Sign-ups aren't open yet. There'll be a 1-month free trial at launch.",
];

export function NextSteps() {
  return (
    <section className="hm-next" aria-labelledby="next-title" data-reveal>
      <div className="wrap">
        <h2 id="next-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
          Here&apos;s what happens next.
        </h2>
        <ol className="hm-stairs">
          {STEPS.map((s, i) => (
            <li key={s} data-r style={{ "--i": i + 1 } as React.CSSProperties}>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
