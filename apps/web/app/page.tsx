import type { Metadata } from "next";
import { Nav } from "./components/nav";
import { Footer } from "./components/footer";
import { Hero } from "./components/home/hero";
import { BusinessTypeProvider } from "./components/home/business-type";
import { Tour } from "./components/home/tour";
import { KeepEarnings } from "./components/home/keep-earnings";
import { FeatureIndex } from "./components/home/feature-index";
import { SetUp } from "./components/home/set-up";
import { NextSteps } from "./components/home/next-steps";
import { Questions } from "./components/home/questions";
import { Closing } from "./components/home/closing";

// The homepage. Picked 11 Nov (round 3): D2's layout with D1's headline, in
// Plus Jakarta Sans, light only. One action, "Book a call", asked three times:
// in the hero, under "set up from the site you have" and at the close. The
// only other action is the live demo. Sections, each with one job:
//   1. Hero: what this is, and the real CRM running down into
//   2. the green band: four true things, then keep the order and the customer
//   3. Follow one order: "How do your customers buy?", then the real app in five clips
//   4. Switch on what you use: every part, each with its real screen
//   5. Set up from the site you have: we fill in your new site from your current one
//   6. What happens next
//   7. Questions, with every answer on show
//   8. The close, running into the navy footer
// "How do your customers buy?" (they order, book or ask for a quote) changes
// the words in 2 to 5. Proof is only what's true: the live demo, built in
// Adelaide, no commission on direct orders and you keep your customer list.
// Every screen is our demo restaurant with sample data, and says so.

// Title and description come from app/layout.tsx.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <BusinessTypeProvider>
          <Hero />
          <KeepEarnings />
          <Tour />
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
