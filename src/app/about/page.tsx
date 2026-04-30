"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import RevealFooter from "@/components/sections/RevealFooter";

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main className="bg-black min-h-screen">
        {/* Hero */}
        <section className="relative h-[70vh] flex items-end overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/hero-model.png"
              alt="House of Charmant"
              fill
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>
          <div className="relative z-10 px-6 pb-16 max-w-7xl mx-auto w-full">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs tracking-[0.3em] uppercase text-white/40 block mb-4"
            >
              About Us
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl font-light tracking-[-0.04em]"
            >
              House of Charmant
            </motion.h1>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-32 px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-xs tracking-[0.3em] uppercase text-white/30 block mb-8">
              Our Story
            </span>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight leading-[1.4] mb-8">
              Born from the belief that luxury should be experienced, not just purchased.
            </h2>
            <div className="space-y-6 text-white/50 font-light leading-relaxed">
              <p>
                Charmant was founded with a singular vision: to bridge the gap
                between the tactile world of fine jewelry and the boundless
                possibilities of digital experience. We believe every piece of
                jewelry tells a story — and that story deserves to be felt before
                it's owned.
              </p>
              <p>
                Our WebAR platform empowers jewelry retailers to offer their customers
                a virtual try-on experience that rivals the in-store encounter.
                Using cutting-edge AI-generated 3D models and open-source computer
                vision, we've made luxury accessible to every screen, every browser,
                every hand.
              </p>
              <p>
                We're not just building technology. We're crafting moments of
                wonder — that gasp when a ring catches the light on your finger
                for the first time, even through a screen.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Values */}
        <section id="craft" className="py-32 px-6 max-w-7xl mx-auto border-t border-white/5">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs tracking-[0.3em] uppercase text-white/30 block mb-16 text-center"
          >
            Our Values
          </motion.span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              {
                title: "Zero Compromise",
                desc: "We use HDRI studio lighting and PBR materials to ensure every 3D model sparkles with photorealistic fidelity.",
              },
              {
                title: "Open Innovation",
                desc: "Built on MindAR, MediaPipe, and Three.js — entirely open-source. No vendor lock-in, no hidden fees.",
              },
              {
                title: "Client-First Design",
                desc: "Every pixel is crafted for the end customer. From smooth scroll to glassmorphic surfaces, the experience is the product.",
              },
            ].map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="text-7xl font-light text-white/[0.06] block mb-4">
                  0{i + 1}
                </span>
                <h3 className="text-xl font-light tracking-tight mb-3">
                  {value.title}
                </h3>
                <p className="text-sm text-white/40 font-light leading-relaxed">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <RevealFooter />
    </>
  );
}
