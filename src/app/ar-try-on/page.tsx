"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import {
  CATEGORIES,
  PRODUCTS,
  getProductsByCategory,
  getCategoryInfo,
  type JewelryCategory,
  type JewelryProduct,
} from "@/lib/jewelry-catalog";

/* ------------------------------------------------------------------ */
/*  Dynamic import — SSR-safe                                          */
/* ------------------------------------------------------------------ */
const ARViewport = dynamic(() => import("@/components/ar/ARViewport"), {
  ssr: false,
  loading: () => <ARLoadingPlaceholder />,
});

function ARLoadingPlaceholder() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/50 rounded-3xl">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 rounded-full border-2 border-t-white/60 animate-spin" />
      </div>
      <p className="text-white/40 text-sm tracking-[0.2em] uppercase">
        Initialising AR Engine…
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function ARTryOnPage() {
  const [activeCategory, setActiveCategory] = useState<JewelryCategory>("ring");
  const [selectedProduct, setSelectedProduct] = useState<JewelryProduct>(PRODUCTS[0]);

  const categoryInfo = useMemo(() => getCategoryInfo(activeCategory), [activeCategory]);
  const categoryProducts = useMemo(() => getProductsByCategory(activeCategory), [activeCategory]);

  // When category changes, auto-select the first product of that category
  const handleCategoryChange = (cat: JewelryCategory) => {
    setActiveCategory(cat);
    const firstProduct = getProductsByCategory(cat)[0];
    if (firstProduct) setSelectedProduct(firstProduct);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Navigation />

      <div className="pt-28 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs tracking-[0.2em] uppercase">Back to Home</span>
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ============================================================ */}
          {/*  LEFT SIDEBAR — Controls                                      */}
          {/* ============================================================ */}
          <div className="lg:w-[340px] flex-shrink-0 space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400/80" />
                <span className="text-xs tracking-[0.3em] uppercase text-white/30">
                  Augmented Reality
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.02em] mb-2">
                Virtual Try-On
              </h1>
              <p className="text-white/35 font-light text-sm leading-relaxed">
                Select any jewelry piece below to see it on you in real-time.
              </p>
            </div>

            {/* ---- Category pills ---- */}
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/20 pl-1">
                Category
              </p>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`relative flex flex-col items-center gap-1.5 py-3 rounded-2xl text-center transition-all duration-300 ${
                      activeCategory === cat.id
                        ? "bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.08)]"
                        : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] border border-white/[0.06]"
                    }`}
                  >
                    <span className="text-lg leading-none">{cat.emoji}</span>
                    <span className="text-[10px] tracking-wider uppercase font-medium">
                      {cat.label}
                    </span>

                    {/* Active indicator dot */}
                    {activeCategory === cat.id && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ---- Product grid ---- */}
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/20 pl-1">
                Select Jewelry — {categoryProducts.length} items
              </p>
              <div className="grid grid-cols-2 gap-2">
                {categoryProducts.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => setSelectedProduct(prod)}
                    className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
                      selectedProduct.id === prod.id
                        ? "ring-2 ring-white/60 shadow-[0_0_25px_rgba(255,255,255,0.1)]"
                        : "ring-1 ring-white/[0.06] hover:ring-white/20"
                    }`}
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-3">
                      <Image
                        src={prod.image}
                        alt={prod.name}
                        fill
                        sizes="160px"
                        className="object-contain p-2 group-hover:scale-110 transition-transform duration-500"
                      />

                      {/* Tag */}
                      {prod.tag && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 text-[8px] uppercase tracking-wider bg-white text-black rounded-full font-medium">
                          {prod.tag}
                        </span>
                      )}

                      {/* Selected checkmark */}
                      {selectedProduct.id === prod.id && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5 bg-black/40">
                      <p className="text-[11px] text-white/70 font-medium truncate leading-tight">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">{prod.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ---- How it works ---- */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/20">
                How it works
              </p>
              <div className="space-y-2">
                {categoryInfo.instructions.map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] text-white/30 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs text-white/30 font-light leading-relaxed">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy note */}
            <p className="text-[10px] text-white/10 leading-relaxed px-1">
              Powered by Google MediaPipe Vision. All processing runs on-device — 
              no images are sent to any server.
            </p>
          </div>

          {/* ============================================================ */}
          {/*  RIGHT — AR Viewport                                          */}
          {/* ============================================================ */}
          <div className="flex-1 h-[60vh] sm:h-[65vh] lg:h-[80vh] rounded-3xl overflow-hidden glass-panel relative">
            <ARViewport
              key={activeCategory}
              product={selectedProduct}
              categoryInfo={categoryInfo}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
