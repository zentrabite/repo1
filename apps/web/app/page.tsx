import type { Metadata, Viewport } from "next";
import { Nav } from "./components/nav";
import { Footer } from "./components/footer";
import { Hero } from "./components/home/hero";
import { BusinessTypeProvider, BusinessTypeSwitch } from "./components/home/business-type";
import { Tour } from "./components/home/tour";
import { KeepEarnings } from "./components/home/keep-earnings";
import { FeatureIndex } from "./components/home/feature-index";
import { SetUp } from "./components/home/set-up";
import { NextSteps } from "./components/home/next-steps";
import { Questions } from "./components/home/questions";
import { Closing } from "./components/home/closing";

// The homepage. One action, "Book a call", asked three times: in the hero,
// under "set up from the site you have" and at the close. The only other action is the
// live demo. Sections, each with one job:
//   1. Hero: what this is, with the real CRM and ordering site (option B, 11 Nov)
//   2. What do you run? Changes the words in 3 to 6 for food, shops, salons and gyms, or trades
//   3. Follow one order: the real app in five clips
//   4. Keep what you earn: no commission, keep the delivery apps
//   5. Switch on what you use: every part, each with its real screen
//   6. Set up from the site you have: we fill in your new site from your current one
//   7. What happens next
//   8. Questions, with every answer on show
//   9. The close, running into the footer
// Proof is only what's true: the live demo, built in Adelaide, no commission
// on direct orders and you keep your customer list. Every screen is our demo
// restaurant with sample data, and says so.

// Title and description come from app/layout.tsx.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The page opens on the navy hero in both themes, so the phone's browser bar is navy too.
export const viewport: Viewport = {
  themeColor: "#0e192c",
};

export default function Home() {
  return (
    <>
      <Nav startNavy />
      <main>
        <Hero />
        <BusinessTypeProvider>
          <BusinessTypeSwitch />
          <Tour />
          <KeepEarnings />
          <FeatureIndex />
          <SetUp />
        </BusinessTypeProvider>
        <NextSteps />
        <Questions />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
