"use client";

import { motion } from "framer-motion";

export default function MarqueeBanner() {
  const items = [
    "NECKLACES",
    "◆",
    "RINGS",
    "◆",
    "EARRINGS",
    "◆",
    "BRACELETS",
    "◆",
    "VIRTUAL TRY-ON",
    "◆",
    "NECKLACES",
    "◆",
    "RINGS",
    "◆",
    "EARRINGS",
    "◆",
    "BRACELETS",
    "◆",
    "VIRTUAL TRY-ON",
    "◆",
  ];

  return (
    <div className="py-8 border-y border-white/10 overflow-hidden">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className="flex gap-8 whitespace-nowrap"
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="text-sm tracking-[0.3em] uppercase text-white/30 flex-shrink-0"
          >
            {item}
          </span>
        ))}
        {items.map((item, i) => (
          <span
            key={`dup-${i}`}
            className="text-sm tracking-[0.3em] uppercase text-white/30 flex-shrink-0"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
