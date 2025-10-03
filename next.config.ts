import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  transpilePackages: ['@uploadcare/react-uploader'],
};

export default nextConfig;
