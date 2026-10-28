import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: 'http://localhost:3002/',
      },
      {
        source: '/admin/:path+',
        destination: 'http://localhost:3002/:path+',
      },
      {
        source: '/business',
        destination: 'http://localhost:3003/',
      },
      {
        source: '/business/:path+',
        destination: 'http://localhost:3003/:path+',
      },
      {
        source: '/admin-static/:path+',
        destination: 'http://localhost:3002/admin-static/:path+',
      },
      {
        source: '/business-static/:path+',
        destination: 'http://localhost:3003/business-static/:path+',
      },
    ];
  },
};

export default nextConfig;
