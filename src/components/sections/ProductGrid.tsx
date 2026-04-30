"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const products = [
  {
    name: "Double Pendant Necklace",
    price: "$1,100",
    image: "/images/necklace-gold.png",
    tag: "New",
  },
  {
    name: "Diamond Solitaire Ring",
    price: "$2,450",
    image: "/images/ring-diamond.png",
    tag: "Bestseller",
  },
  {
    name: "Charm Link Bracelet",
    price: "$850",
    image: "/images/bracelet-gold.png",
    tag: null,
  },
  {
    name: "Diamond Drop Earrings",
    price: "$1,800",
    image: "/images/earrings-diamond.png",
    tag: "Limited",
  },
  {
    name: "Pearl Pendant Necklace",
    price: "$680",
    image: "/images/necklace-pearl.png",
    tag: null,
  },
  {
    name: "Sapphire Halo Ring",
    price: "$3,200",
    image: "/images/ring-sapphire.png",
    tag: "Exclusive",
  },
  {
    name: "Gold Hoop Earrings",
    price: "$420",
    image: "/images/earrings-hoop.png",
    tag: null,
  },
  {
    name: "Charm Link Bracelet",
    price: "$850",
    image: "/images/bracelet-gold.png",
    tag: "AR Ready",
  },
];

export default function ProductGrid() {
  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-between items-end mb-16"
      >
        <div>
          <span className="text-xs tracking-[0.3em] uppercase text-white/40 block mb-4">
            Shop
          </span>
          <h2 className="text-4xl md:text-5xl font-light tracking-[-0.03em]">
            Featured Pieces
          </h2>
        </div>
        <Link
          href="/collections"
          className="hidden md:inline-flex text-sm tracking-[0.15em] uppercase text-white/50 hover:text-white transition-colors pb-1 border-b border-white/20 hover:border-white/50"
        >
          View All
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((product, i) => (
          <motion.div
            key={`${product.name}-${i}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{
              duration: 0.6,
              delay: (i % 4) * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="group cursor-pointer"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-[#f5f5f5]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              {product.tag && (
                <span className="absolute top-3 left-3 px-3 py-1 text-[10px] uppercase tracking-[0.15em] bg-black text-white rounded-full">
                  {product.tag}
                </span>
              )}
            </div>
            <h4 className="text-sm font-light tracking-tight mb-1 group-hover:text-white/80 transition-colors">
              {product.name}
            </h4>
            <span className="text-sm text-white/40 font-light">{product.price}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
