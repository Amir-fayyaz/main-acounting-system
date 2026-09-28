import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework version in responses.
  poweredByHeader: false,
  // The backend REST API is the only source of business truth; the client never
  // proxies or duplicates accounting logic (TECH-004).
};

export default nextConfig;
