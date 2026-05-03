"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Scan, Hand, Eye } from "lucide-react";

const features = [
  {
    icon: Scan,
    title: "Face Tracking",
    desc: "Google MediaPipe Vision detects 468 facial landmarks for precise earring and necklace placement.",
  },
  {
    icon: Hand,
    title: "Hand Tracking",
    desc: "MediaPipe tracks 21 hand landmarks per hand for accurate ring and bracelet try-on.",
  },
  {
    icon: Eye,
    title: "HDRI Lighting",
    desc: "Studio-grade environment maps simulate realistic sparkle and metallic reflections.",
  },
];

export default function ARShowcase() {
  return (
    <section id="ar-experience" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <span className="text-xs tracking-[0.3em] uppercase text-white/30 block mb-4">
            Technology
          </span>
          <h2 className="text-4xl md:text-6xl font-light tracking-[-0.03em] mb-6">
            The AR Experience
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto font-light">
            Powered by open-source computer vision. No app download required.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative p-8 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden group hover:border-white/20 transition-colors duration-300"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.02] rounded-full blur-3xl group-hover:bg-white/[0.05] transition-colors duration-500" />
              <f.icon className="w-8 h-8 text-white/60 mb-6 relative z-10" />
              <h3 className="text-lg font-light tracking-tight mb-2 relative z-10">
                {f.title}
              </h3>
              <p className="text-sm text-white/40 font-light leading-relaxed relative z-10">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <Link
            href="/ar-try-on"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-black rounded-full text-sm uppercase tracking-[0.15em] font-medium hover:scale-105 active:scale-95 transition-transform"
          >
            Launch AR Experience
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
