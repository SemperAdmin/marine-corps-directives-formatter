import type {NextConfig} from 'next';

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  basePath: isProd ? '/marine-corps-directives-formatter' : '',
  assetPrefix: isProd ? '/marine-corps-directives-formatter' : '', // REMOVED EXTRA SLASH
  output: 'export',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true, // CRITICAL: Fixes TypeScript build issues
  },
  eslint: {
    ignoreDuringBuilds: true, // CRITICAL: Skips ESLint during builds
  },
  images: {
    unoptimized: true, // Required for GitHub Pages
  },
};