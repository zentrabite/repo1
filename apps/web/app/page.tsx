import { Nav } from "./components/nav";
import { Footer } from "./components/footer";
import { FAQ } from "./components/faq";
import { FeaturesGrid } from "./components/features-grid";
import { AIBrain } from "./components/ai-brain";
import { RevenueEngine } from "./components/revenue-engine";
import { Industries } from "./components/industries";
import { Showcase } from "./components/showcase";
import { V4Background } from "./components/v4/v4-background";
import { V4Effects } from "./components/v4/v4-effects";
import { V4Hero } from "./components/v4/v4-hero";
import { V4Macbook } from "./components/v4/v4-macbook";
import { V4Statsbar } from "./components/v4/v4-statsbar";
import { V4Journey } from "./components/v4/v4-journey";
import { V4Modules } from "./components/v4/v4-modules";
import { V4Storytelling } from "./components/v4/v4-storytelling";
import { V4AiChat } from "./components/v4/v4-ai-chat";
import { V4Cta } from "./components/v4/v4-cta";

/**
 * Marketing home page — converted from docs/reference/zentrabite-3d-v4.html.
 *
 * Composition rules (see CLAUDE.md / task brief):
 *  - Keep the existing Nav + Footer (they have more links than the v4
 *    prototype's stripped-down versions).
 *  - Render the v4 sections inside a `.v4` wrapper so the prototype's local
 *    palette + ambient blobs only colour this page.
 *  - Preserve every section from the previous home page that the v4
 *    prototype doesn't cover (AIBrain daily-email, FeaturesGrid tiles,
 *    RevenueEngine pillars, Industries, Showcase, and especially FAQ).
 *  - V4Effects mounts client-only behaviour (scroll progress, reveal,
 *    count-up, storytelling scroll-spy, MacBook tilt, blob parallax).
 */
export default function Home() {
  return (
    <>
      <Nav />
      <div className="v4">
        <V4Background />
        <V4Effects />
        <main style={{ position: "relative", zIndex: 1 }}>
          <V4Hero />
          <V4Macbook />
          <V4Statsbar />
          <V4Journey />
          <V4Modules />
          <V4Storytelling />
          <V4AiChat />
          {/* Preserved from the previous marketing home: extra context the
              v4 prototype doesn't cover. */}
          <AIBrain />
          <FeaturesGrid />
          <RevenueEngine />
          <Industries />
          <Showcase />
          <FAQ />
          <V4Cta />
        </main>
      </div>
      <Footer />
    </>
  );
}
