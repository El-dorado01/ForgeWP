import type { NextConfig } from 'next';
import { withForgeWP } from '@forgewp/react/next';

// Deployment mode lives at the boundary:
// - Default: static export (`output: 'export'`) for native WordPress theme export via `forgewp export`.
// - Decoupled: set `FORGEWP_DEPLOYMENT_MODE=decoupled` and `FORGEWP_WP_URL=https://your-wp-site`
//   to run as a live Next.js App Router server backed by WordPress REST.
const nextConfig: NextConfig = withForgeWP({});

export default nextConfig;
