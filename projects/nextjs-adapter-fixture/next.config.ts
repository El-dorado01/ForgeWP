import type { NextConfig } from 'next';
import { withForgeWP } from '@forgewp/react/next';

// Deployment choice lives at the boundary: static export by default for native extraction,
// or full Next.js server when FORGEWP_DEPLOYMENT_MODE=decoupled.
const nextConfig: NextConfig = withForgeWP({});

export default nextConfig;
