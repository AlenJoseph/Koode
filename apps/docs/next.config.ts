import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoDocs = path.resolve(appDir, '../../docs');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow reading monorepo docs/*.md from server components.
  outputFileTracingRoot: path.resolve(appDir, '../..'),
  experimental: {
    // Keep docs markdown available to the Node server at runtime.
    externalDir: true,
  },
  env: {
    KOODE_DOCS_ROOT: repoDocs,
  },
};

export default nextConfig;
