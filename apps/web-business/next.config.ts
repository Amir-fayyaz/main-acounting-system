import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/web'],
  assetPrefix: '/business-static',
  experimental: {
    globalNotFound: true,
  },
};

export default nextConfig;
