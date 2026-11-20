import type { NextConfig } from 'next';
// Deployment choice lives at the boundary: static export by default for native extraction,
// or full Next.js server when FORGEWP_DEPLOYMENT_MODE=decoupled.
const isDecoupled = process.env.FORGEWP_DEPLOYMENT_MODE === 'decoupled';
const nextConfig: NextConfig = {
  ...(isDecoupled ? {} : { output: 'export' }),
  transpilePackages: ['@forgewp/react'],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};
export default nextConfig;
