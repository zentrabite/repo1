import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { FeaturesGrid } from "./components/features-grid";
import { AIBrain } from "./components/ai-brain";
import { RevenueEngine } from "./components/revenue-engine";
import { Industries } from "./components/industries";
import { Showcase } from "./components/showcase";
import { FAQ } from "./components/faq";
import { CTABanner } from "./components/cta-banner";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FeaturesGrid />
        <AIBrain />
        <RevenueEngine />
        <Industries />
        <Showcase />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
