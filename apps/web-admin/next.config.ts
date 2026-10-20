import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/web'],
  assetPrefix: '/admin-static',
};

export default nextConfig;
