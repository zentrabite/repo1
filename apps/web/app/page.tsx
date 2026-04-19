import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { FeaturesGrid } from "./components/features-grid";
import { Showcase } from "./components/showcase";
import { Pricing } from "./components/pricing";
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
        <Showcase />
        <Pricing />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
