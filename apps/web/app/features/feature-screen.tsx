import { AppScreen } from "../components/app-screen";
import type { FeatureVisual } from "./media";

// The real app on a feature page: a clip, a screenshot, or for the AI
// assistant (which isn't in the demo) one question and answer drawn in the
// app's own style from the demo's sample data. Always captioned as our demo.

const CAPTION = "Our demo restaurant, sample data.";

/** The AI assistant's question and answer, in the app's style. */
export function ChatPanel() {
  return (
    <div className="fp-chat" data-ui role="img" aria-label="The AI assistant answering who hasn't been in for a month, with a suggested win-back text.">
      <p className="fp-chat-q">Who hasn&apos;t been in for a month?</p>
      <div className="fp-chat-a">
        <p>Amelia Rossi hasn&apos;t ordered in 34 days. She&apos;s a Silver member with 9 orders and $486 spent.</p>
        <p>Want me to draft her a win-back text with 20% off?</p>
        <span className="fp-chat-btn">Draft the text</span>
      </div>
    </div>
  );
}

export function FeatureScreen({
  visual,
  priority = false,
  caption = true,
}: {
  visual: FeatureVisual;
  priority?: boolean;
  /** true for the usual caption, a string for a longer one, false for none. */
  caption?: boolean | string;
}) {
  const cap = caption === false ? null : <figcaption>{caption === true ? CAPTION : caption}</figcaption>;
  if (visual.kind === "chat") {
    return (
      <figure className="fp-shot">
        <ChatPanel />
        {cap}
      </figure>
    );
  }
  if (visual.kind === "clip") {
    return (
      <figure className={`fp-shot fp-shot-${visual.variant}`}>
        <div className="fp-shot-frame" data-ui>
          <AppScreen
            variant={visual.variant}
            poster={`/media/app/${visual.file}.webp`}
            sources={[
              { src: `/media/app/${visual.file}.mp4`, type: "video/mp4" },
              { src: `/media/app/${visual.file}.webm`, type: "video/webm" },
            ]}
            label={visual.label}
            priority={priority}
          />
        </div>
        {cap}
      </figure>
    );
  }
  return (
    <figure className={`fp-shot fp-shot-${visual.variant}`}>
      <div className="fp-shot-frame" data-ui>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.src}
          width={visual.width}
          height={visual.height}
          alt={visual.alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
        />
      </div>
      {cap}
    </figure>
  );
}
