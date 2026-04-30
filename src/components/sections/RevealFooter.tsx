"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Link from "next/link";
import { Gem, ArrowUpRight } from "lucide-react";

const footerLinks = {
  Collections: [
    { label: "Necklaces", href: "/collections/necklaces" },
    { label: "Rings", href: "/collections/rings" },
    { label: "Earrings", href: "/collections/earrings" },
    { label: "Bracelets", href: "/collections/bracelets" },
  ],
  House: [
    { label: "Our Story", href: "/about" },
    { label: "Craftsmanship", href: "/about#craft" },
    { label: "Sustainability", href: "/about#sustainability" },
    { label: "Press", href: "/press" },
  ],
  Experience: [
    { label: "AR Try-On", href: "/ar-try-on" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Book Consultation", href: "/consultation" },
    { label: "Gift Registry", href: "/gift" },
  ],
  Help: [
    { label: "FAQ", href: "/faq" },
    { label: "Shipping", href: "/shipping" },
    { label: "Returns", href: "/returns" },
    { label: "Contact", href: "/contact" },
  ],
};

const socialLinks = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "X (Twitter)",
    href: "https://x.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    href: "https://pinterest.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 0a12 12 0 0 0-4.373 23.178c-.07-.63-.134-1.596.028-2.283.146-.622.944-4.004.944-4.004s-.24-.482-.24-1.192c0-1.117.647-1.95 1.453-1.95.686 0 1.017.514 1.017 1.131 0 .69-.438 1.72-.665 2.676-.189.8.401 1.452 1.19 1.452 1.428 0 2.526-1.506 2.526-3.678 0-1.923-1.382-3.267-3.357-3.267-2.286 0-3.628 1.714-3.628 3.488 0 .69.266 1.432.598 1.834a.24.24 0 0 1 .056.23c-.061.254-.197.8-.224.912-.035.146-.116.177-.268.107-1-.466-1.624-1.928-1.624-3.102 0-2.524 1.834-4.841 5.286-4.841 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.81 0-1.573-.421-1.834-.92l-.499 1.902c-.181.696-.669 1.568-.995 2.1A12 12 0 1 0 12 0z" />
      </svg>
    ),
  },
];

/* ── Magnetic hover link: link text slides and glows on hover ── */
function MagneticLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative inline-block text-sm text-white/50 font-light overflow-hidden"
    >
      <span className="relative inline-block transition-transform duration-300 ease-out group-hover:-translate-y-full">
        {children}
      </span>
      <span className="absolute left-0 top-0 inline-block translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0 text-white">
        {children}
      </span>
    </Link>
  );
}

/* ── Stagger-reveal animation for link columns ── */
const columnVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.1,
      staggerChildren: 0.05,
      delayChildren: i * 0.1 + 0.1,
    },
  }),
};

const linkVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function RevealFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: "-80px" });
  const [emailFocused, setEmailFocused] = useState(false);

  // Parallax for the watermark — it slides up slowly as footer scrolls in
  const { scrollYProgress } = useScroll({
    target: watermarkRef,
    offset: ["start end", "end start"],
  });
  const watermarkY = useTransform(scrollYProgress, [0, 1], ["30%", "-20%"]);

  return (
    <footer
      ref={footerRef}
      className="relative z-10 bg-[#060606] overflow-hidden"
    >
      {/* ── Ambient glow at top edge ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-24 bg-white/[0.02] blur-3xl rounded-full" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-8">
        {/* ── Footer Links Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 sm:gap-12 mb-14 sm:mb-20">
          {Object.entries(footerLinks).map(([category, links], i) => (
            <motion.div
              key={category}
              custom={i}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={columnVariants}
            >
              <motion.h4
                variants={linkVariants}
                className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-white/25 mb-4 sm:mb-6"
              >
                {category}
              </motion.h4>
              <ul className="space-y-2.5 sm:space-y-3.5">
                {links.map((link) => (
                  <motion.li key={link.label} variants={linkVariants}>
                    <MagneticLink href={link.href}>{link.label}</MagneticLink>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ── Newsletter CTA with focus-glow effect ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative py-8 sm:py-10 border-t border-white/[0.08] mb-8 sm:mb-12"
        >
          {/* Focus glow behind input */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 w-80 h-40 rounded-full blur-[80px] transition-opacity duration-700 ${
              emailFocused
                ? "opacity-100 bg-amber-500/[0.06]"
                : "opacity-0 bg-transparent"
            }`}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-light mb-1">
                Stay in the loop
              </h3>
              <p className="text-xs sm:text-sm text-white/35 font-light">
                New collections and AR experiences, straight to you.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                className="flex-1 md:w-64 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-500"
              />
              <button className="group px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-black rounded-full text-xs sm:text-sm font-medium hover:bg-white/90 transition-all duration-300 flex items-center gap-2 flex-shrink-0 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                Subscribe
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Giant Watermark — parallax scroll, fully visible ── */}
        <div ref={watermarkRef} className="overflow-hidden -mx-5 sm:-mx-8 mb-6 sm:mb-8">
          <motion.div style={{ y: watermarkY }}>
            <h2
              className="text-[4.5rem] sm:text-[7rem] md:text-[10rem] lg:text-[14rem] xl:text-[17rem] font-extralight tracking-[-0.06em] leading-[0.85] text-center select-none pointer-events-none whitespace-nowrap"
              style={{
                color: "transparent",
                WebkitTextStroke: "1px rgba(255, 255, 255, 0.07)",
              }}
            >
              CHARMANT
            </h2>
          </motion.div>
        </div>

        {/* ── Bottom Bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/[0.05]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex items-center justify-center text-black">
              <Gem className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="text-xs sm:text-sm tracking-[0.15em] uppercase font-light text-white/80">
              Charmant
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-white/20 font-light order-3 sm:order-2">
            &copy; 2026 Charmant AR. All rights reserved.
          </p>
          <div className="flex gap-4 sm:gap-5 order-2 sm:order-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-white/25 hover:text-white hover:scale-110 transition-all duration-300"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
