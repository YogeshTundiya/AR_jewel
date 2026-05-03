"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const collections = [
  {
    title: "Minimalist Elegance",
    subtitle: "Refined simplicity for the modern woman",
    image: "/images/necklace-gold.png",
    href: "/collections/minimalist",
  },
  {
    title: "Bridal Bliss",
    subtitle: "Timeless pieces for your perfect day",
    image: "/images/earrings-diamond.png",
    href: "/collections/bridal",
  },
  {
    title: "Bold Statements",
    subtitle: "Daring designs that command attention",
    image: "/images/bracelet-gold.png",
    href: "/collections/bold",
  },
];

export default function CollectionsSection() {
  return (
    <section id="collections" className="py-32 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-20"
      >
        <span className="text-xs tracking-[0.3em] uppercase text-white/40 block mb-4">
          Our Collections
        </span>
        <h2 className="text-4xl md:text-6xl font-light tracking-[-0.03em]">
          Signature Collections
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {collections.map((collection, i) => (
          <motion.div
            key={collection.title}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.8,
              delay: i * 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Link href={collection.href} className="group block">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-6 bg-[#f5f5f5]">
                <Image
                  src={collection.image}
                  alt={collection.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain p-8 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-light tracking-tight mb-1">
                {collection.title}
              </h3>
              <p className="text-sm text-white/50 font-light">
                {collection.subtitle}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
