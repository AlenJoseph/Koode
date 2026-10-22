import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@koode/contracts'],
};

export default nextConfig;
