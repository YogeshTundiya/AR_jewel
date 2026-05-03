"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya S.",
    role: "Bride, Mumbai",
    quote:
      "The AR try-on experience was magical. I could see exactly how the necklace would look before buying. It felt incredibly real.",
    rating: 5,
  },
  {
    name: "Ananya R.",
    role: "Fashion Blogger",
    quote:
      "Charmant has redefined how I shop for jewelry online. The virtual try-on is seamless and the quality is unmatched.",
    rating: 5,
  },
  {
    name: "Meera K.",
    role: "Anniversary Gift",
    quote:
      "I surprised my wife with earrings she tried on virtually. The fit and sparkle were exactly as shown. Truly incredible technology.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-20"
      >
        <span className="text-xs tracking-[0.3em] uppercase text-white/30 block mb-4">
          Testimonials
        </span>
        <h2 className="text-4xl md:text-6xl font-light tracking-[-0.03em]">
          Happy Clients
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.8,
              delay: i * 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors duration-300"
          >
            <div className="flex gap-1 mb-6">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star
                  key={j}
                  className="w-4 h-4 fill-white/80 text-white/80"
                />
              ))}
            </div>
            <p className="text-base text-white/70 font-light leading-relaxed mb-8">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-white/40 mt-0.5">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
