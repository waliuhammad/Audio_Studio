import { Navbar } from "@/components/navbar/Navbar";
import { Hero } from "@/components/hero/Hero";
import { IntroStrip } from "@/components/hero/IntroStrip";
import { ToolsSection } from "@/components/tools/ToolsSection";
import { HowItWorks } from "@/components/how-it-works/HowItWorks";
import { Pricing } from "@/components/pricing/Pricing";
import { FAQ } from "@/components/FAQ/FAQ";
import { Footer } from "@/components/Footer/Footer";
export default function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <IntroStrip />
        <ToolsSection />
<HowItWorks />
        <Pricing />
        <FAQ />
        <Footer />

        <div className="h-24" aria-hidden="true" />
      </main>
    </>
  );
}