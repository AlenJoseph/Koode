import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@koode/contracts'],
  // pnpm nests zod under contracts; keep a resolvable copy for Next vendor chunks.
  serverExternalPackages: ['zod'],
};

export default nextConfig;
