import Hero from "./components/hero";
import FeaturesGrid from "./components/features-grid";
import AIBrain from "./components/ai-brain";
import RevenueEngine from "./components/revenue-engine";
import Industries from "./components/industries";
import Showcase from "./components/showcase";
import PricingTeaser from "./components/pricing-teaser";
import FAQ from "./components/faq";
import CTABanner from "./components/cta-banner";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturesGrid />
      <AIBrain />
      <RevenueEngine />
      <Industries />
      <Showcase />
      <PricingTeaser />
      <FAQ />
      <CTABanner />
    </>
  );
}
