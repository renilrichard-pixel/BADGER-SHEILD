import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [60, 65, 70, 75, 80, 85],
    localPatterns: [
      {
        pathname: '/assets/images/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'krcpnzxylqgtjbtyehoa.supabase.co',
      },
    ],
  },
};

export default nextConfig;
