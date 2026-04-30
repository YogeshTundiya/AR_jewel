"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[100dvh] flex items-center justify-center overflow-hidden"
    >
      {/* Parallax Background Image */}
      <motion.div
        style={{ scale: imageScale, opacity: imageOpacity }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/images/hero-model.png"
          alt="Luxury Jewelry Model wearing exquisite diamond earrings"
          fill
          sizes="100vw"
          className="object-cover object-top"
          priority
        />
      </motion.div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 z-[1] bg-black/40" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/30 to-black/10" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-transparent to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-[120px] z-[1]" />

      {/* Hero content */}
      <motion.div
        style={{ y: contentY }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto pt-24"
      >
        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-7xl md:text-[6rem] lg:text-[7rem] font-extralight tracking-[-0.04em] mb-6 leading-[0.95]"
        >
          <span className="block text-gradient">JEWELRY THAT</span>
          <span className="block italic font-serif font-light text-white/90 mt-2">
            Radiates Charm
          </span>
        </motion.h1>

        {/* Badge — below the heading, never overlaps nav */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-xl mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300/80" />
          <span className="text-[11px] text-white/70 tracking-[0.3em] uppercase font-light">
            WebAR Virtual Try-On
          </span>
        </motion.div>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg text-white/40 max-w-lg mx-auto font-light leading-relaxed mb-12"
        >
          Try on our exclusive collections from anywhere. No app required. Just
          pure, sparkling elegance in your browser.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/ar-try-on"
            className="group inline-flex items-center justify-center gap-3 px-10 py-4.5 bg-white text-black rounded-full text-sm uppercase tracking-[0.15em] font-medium hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-95 transition-all duration-300"
          >
            Try On Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#collections"
            className="inline-flex items-center justify-center gap-3 px-10 py-4.5 border border-white/15 rounded-full text-sm uppercase tracking-[0.15em] font-light hover:bg-white/[0.06] hover:border-white/25 transition-all duration-300"
          >
            View Collections
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10"
      >
        <span className="text-[10px] uppercase tracking-[0.35em] text-white/30 font-light">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            ease: "easeInOut",
          }}
          className="w-[1px] h-10 bg-gradient-to-b from-white/40 to-transparent"
        />
      </motion.div>

      {/* Edge vignette */}
      <div className="absolute inset-0 z-[2] pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.4)]" />
    </section>
  );
}
