"use client";

import { motion } from "framer-motion";

export default function QuoteSection() {
  return (
    <section className="py-40 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="block text-xs tracking-[0.3em] uppercase text-white/30 mb-10">
            Our Philosophy
          </span>
          <blockquote className="text-2xl md:text-4xl lg:text-[2.75rem] font-light leading-[1.4] tracking-[-0.02em] text-white/90">
            &ldquo;At Charmant, we craft jewelry to be more than an accessory — it&apos;s a{" "}
            <span className="italic font-serif text-white">keepsake</span>, a story told through
            metal and stone, designed to be treasured across generations.&rdquo;
          </blockquote>
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="w-8 h-[1px] bg-white/20" />
            <span className="text-xs tracking-[0.2em] uppercase text-white/40">
              House of Charmant
            </span>
            <div className="w-8 h-[1px] bg-white/20" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
