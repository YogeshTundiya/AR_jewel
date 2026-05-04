import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore large assets during tracing for builds
  outputFileTracingExcludes: {
    '*': ['public/3D/**/*'],
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/public/3D/**',
          '**/node_modules/**',
          '**/.next/**'
        ],
      };
    }
    
    return config;
  },
  turbopack: {},
};

export default nextConfig;
