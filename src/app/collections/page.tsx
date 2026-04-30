"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import RevealFooter from "@/components/sections/RevealFooter";
import { ArrowUpRight } from "lucide-react";

const categories = ["All", "Necklaces", "Rings", "Earrings", "Bracelets"];

const allProducts = [
  {
    name: "Double Pendant Necklace",
    price: "$1,100",
    image: "/images/necklace-gold.png",
    category: "Necklaces",
  },
  {
    name: "Diamond Solitaire Ring",
    price: "$2,450",
    image: "/images/ring-diamond.png",
    category: "Rings",
  },
  {
    name: "Diamond Drop Earrings",
    price: "$1,800",
    image: "/images/earrings-diamond.png",
    category: "Earrings",
  },
  {
    name: "Charm Link Bracelet",
    price: "$850",
    image: "/images/bracelet-gold.png",
    category: "Bracelets",
  },
  {
    name: "Pearl Pendant Necklace",
    price: "$680",
    image: "/images/necklace-pearl.png",
    category: "Necklaces",
  },
  {
    name: "Sapphire Halo Ring",
    price: "$3,200",
    image: "/images/ring-sapphire.png",
    category: "Rings",
  },
  {
    name: "Gold Hoop Earrings",
    price: "$420",
    image: "/images/earrings-hoop.png",
    category: "Earrings",
  },
  {
    name: "Gold Double Pendant",
    price: "$1,250",
    image: "/images/necklace-gold.png",
    category: "Necklaces",
  },
];

export default function CollectionsPage() {
  const [active, setActive] = useState("All");

  const filtered =
    active === "All"
      ? allProducts
      : allProducts.filter((p) => p.category === active);

  return (
    <>
      <Navigation />
      <main className="bg-black min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16"
          >
            <span className="text-xs tracking-[0.3em] uppercase text-white/30 block mb-4">
              Browse
            </span>
            <h1 className="text-5xl md:text-7xl font-light tracking-[-0.04em]">
              All Collections
            </h1>
          </motion.div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-3 mb-16"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-6 py-3 rounded-full text-sm uppercase tracking-[0.12em] transition-all duration-300 ${
                  active === cat
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Product Grid */}
          <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((product, i) => (
                <motion.div
                  key={`${product.name}-${i}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-[#f5f5f5]">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <ArrowUpRight className="w-4 h-4 text-black" />
                    </div>
                  </div>
                  <h4 className="text-sm font-light tracking-tight mb-1">
                    {product.name}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/40 font-light">{product.price}</span>
                    <span className="text-[10px] tracking-[0.2em] uppercase text-white/25">
                      {product.category}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
      <RevealFooter />
    </>
  );
}
