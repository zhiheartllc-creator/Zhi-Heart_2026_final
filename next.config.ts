process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";

import withSerwistInit from "@serwist/next";
import type { NextConfig } from 'next';

const isStaticExport = process.env.NEXT_OUTPUT === "export";
const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" } : {}),

  env: {
    NEXT_PUBLIC_APP_VERSION: Date.now().toString(),
    NEXT_PUBLIC_IS_STATIC: isStaticExport ? "true" : "false",
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i.imgur.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ibb.co', port: '', pathname: '/**' },
    ],
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isStaticExport || isDev,
});

export default withSerwist(nextConfig);
