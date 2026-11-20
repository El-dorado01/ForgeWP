import type { NextConfig } from 'next';
// Research fixture: Next's static output is evidence, not a WordPress export.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
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
