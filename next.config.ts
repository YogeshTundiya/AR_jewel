import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimise image delivery — support modern formats
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
};

export default nextConfig;
