import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: { styledComponents: true },
  transpilePackages: ['three'],
};

export default nextConfig;
