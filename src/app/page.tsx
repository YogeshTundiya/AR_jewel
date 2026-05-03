"use client";

import Navigation from "@/components/ui/Navigation";
import HeroSection from "@/components/sections/HeroSection";
import MarqueeBanner from "@/components/sections/MarqueeBanner";
import CollectionsSection from "@/components/sections/CollectionsSection";
import QuoteSection from "@/components/sections/QuoteSection";
import ProductGrid from "@/components/sections/ProductGrid";
import ARShowcase from "@/components/sections/ARShowcase";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import RevealFooter from "@/components/sections/RevealFooter";

export default function Home() {
  return (
    <>
      <Navigation />

      {/* Main content — solid bg covers the footer until you scroll past */}
      <main className="relative z-20 bg-black">
        <HeroSection />
        <MarqueeBanner />
        <CollectionsSection />
        <QuoteSection />
        <ProductGrid />
        <ARShowcase />
        <TestimonialsSection />
        <MarqueeBanner />
      </main>

      {/* Footer — flows naturally, revealed with stagger + parallax animations */}
      <RevealFooter />
    </>
  );
}
