import type {NextConfig} from 'next';

// GitHub Pages configuration
const isProd = process.env.NODE_ENV === 'production';
const repoName = 'marine-corps-directives-formatter';

const nextConfig: NextConfig = {
  // GitHub Pages configuration
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',
  
  // Disable image optimization for GitHub Pages compatibility
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Enable static export
  output: 'export',
  
  // Disable server-side features for static export
  trailingSlash: true,
  
  // Ensure compatibility with GitHub Pages
  distDir: 'out',
};

export default nextConfig;
