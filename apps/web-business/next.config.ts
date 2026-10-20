import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/web'],
  assetPrefix: '/business-static',
};

export default nextConfig;
