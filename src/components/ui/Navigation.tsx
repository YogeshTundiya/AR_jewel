"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Gem, Menu, X } from "lucide-react";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center transition-all duration-500 ${
          scrolled
            ? "bg-black/60 backdrop-blur-xl border-b border-white/5"
            : ""
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black">
            <Gem className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <span className="font-medium text-base tracking-[0.2em] uppercase">
            Charmant
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-white/60">
          <Link href="/collections" className="hover:text-white transition-colors">
            Collections
          </Link>
          <Link href="/ar-try-on" className="hover:text-white transition-colors">
            AR Experience
          </Link>
          <Link href="/about" className="hover:text-white transition-colors">
            House
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/ar-try-on"
            className="hidden md:inline-flex px-5 py-2.5 rounded-full bg-white text-black text-xs uppercase tracking-[0.15em] font-medium hover:bg-white/90 transition-colors"
          >
            Try On
          </Link>
          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
          >
            {[
              { label: "Collections", href: "/collections" },
              { label: "AR Experience", href: "/ar-try-on" },
              { label: "House", href: "/about" },
            ].map((link, i) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={link.href}
                  className="text-3xl font-light tracking-wide text-white/80 hover:text-white transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
