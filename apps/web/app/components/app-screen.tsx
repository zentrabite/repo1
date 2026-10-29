"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Icon } from "./zb-icon";

// A recorded clip of the app, shown as a plain screen: the video (or a still)
// in a rounded rectangle on the site's surface colour, with a thin border and
// no hardware drawn around it.
//
//   variant="screen"  desktop clips, 16:10, small corner radius
//   variant="phone"   phone clips, 390:844, large corner radius
//
// The clips live in public/media/app/ and are listed in clips.json there. A
// clip plays muted and loops. It loads when it gets near the screen, plays only
// while it is on screen and the tab is showing, and has a pause button. People
// who have asked their device for less motion get the poster and no video.
//
// Example:
//   <AppScreen
//     variant="screen"
//     poster="/media/app/orders-desktop.webp"
//     sources={[
//       { src: "/media/app/orders-desktop.mp4", type: "video/mp4" },
//       { src: "/media/app/orders-desktop.webm", type: "video/webm" },
//     ]}
//     label="The ZentraBite orders board. A new order is opened and marked Cooking, then Ready."
//   />

export type AppScreenSource = { src: string; type: string };

export type AppScreenProps = {
  /** "screen" for desktop clips (16:10), "phone" for phone clips (390:844). */
  variant?: "screen" | "phone";
  /** Still image. Shown until the video plays, and instead of it for people who want less motion. */
  poster: string;
  /** Video files, in the order the browser should try them. Leave out to show only the poster. */
  sources?: AppScreenSource[];
  /** What the clip shows, read out by screen readers. */
  label: string;
  /** Load straight away instead of when it nears the screen. Use for a clip in the first screenful. */
  priority?: boolean;
  /** Show the pause button. On by default: a loop longer than 5 seconds needs a way to stop it. */
  pauseButton?: boolean;
  className?: string;
  style?: CSSProperties;
};

const SHAPES = {
  screen: { ratio: "16 / 10", radius: 12, inset: 12 },
  phone: { ratio: "390 / 844", radius: 36, inset: 18 },
} as const;

const FILL: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

export function AppScreen({
  variant = "screen",
  poster,
  sources = [],
  label,
  priority = false,
  pauseButton = true,
  className,
  style,
}: AppScreenProps) {
  const shape = SHAPES[variant];
  const hasVideo = sources.length > 0;
  const box = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);

  // Off until we know the visitor is fine with motion, so the first paint (and
  // the server render) is always the still.
  const [motionOk, setMotionOk] = useState(false);
  const [near, setNear] = useState(priority);
  const [inView, setInView] = useState(false);
  const [tabShown, setTabShown] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotionOk(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !hasVideo) return;
    const load = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNear(true);
          load.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    const view = new IntersectionObserver(([e]) => setInView(Boolean(e?.isIntersecting)), { threshold: 0.25 });
    load.observe(el);
    view.observe(el);
    const onVis = () => setTabShown(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      load.disconnect();
      view.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hasVideo]);

  const showVideo = hasVideo && motionOk && near;
  const shouldPlay = showVideo && inView && tabShown && !userPaused;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    // React sets `muted` as a property only, and browsers only autoplay muted video.
    v.muted = true;
    if (shouldPlay) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [shouldPlay, showVideo]);

  function toggle() {
    if (playing) {
      setUserPaused(true);
      return;
    }
    setUserPaused(false);
    video.current?.play().catch(() => setPlaying(false));
  }

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <div
        ref={box}
        role="img"
        aria-label={label}
        style={{
          position: "relative",
          aspectRatio: shape.ratio,
          borderRadius: shape.radius,
          overflow: "hidden",
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          draggable={false}
          style={FILL}
        />
        {showVideo && (
          <video
            ref={video}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
            tabIndex={-1}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            style={FILL}
          >
            {sources.map((s) => (
              <source key={s.src} src={s.src} type={s.type} />
            ))}
          </video>
        )}
      </div>

      {pauseButton && showVideo && (
        <button
          type="button"
          className="story-pause"
          onClick={toggle}
          aria-label={playing ? "Pause the clip" : "Play the clip"}
          title={playing ? "Pause" : "Play"}
          style={{ position: "absolute", right: shape.inset, bottom: shape.inset }}
        >
          <Icon name={playing ? "pause" : "play"} size={16} accent="currentColor" />
        </button>
      )}
    </div>
  );
}
