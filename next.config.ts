import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'microlink.io',
      },
      {
        protocol: 'https',
        hostname: '**.microlink.io',
      },
      {
        protocol: 'https',
        hostname: 'ucarecdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.ucarecdn.com',
      },
    ],
  },
  transpilePackages: ['@uploadcare/react-uploader', '@blocknote/core', '@blocknote/react', '@blocknote/shadcn', '@deepgram/sdk'],
  webpack: (config, { isServer }) => {
    // Exclude Node.js-only modules from browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        'utf-8-validate': false,
        'bufferutil': false,
      };
    }
    return config;
  },
};

export default nextConfig;
