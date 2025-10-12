# GitHub Pages Deployment Guide

## Quick Setup

1. **Enable GitHub Pages in Repository Settings**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Select "GitHub Actions" as the source

2. **Deploy via GitHub Actions (Automatic)**
   - Push changes to main/master branch
   - GitHub Actions will automatically build and deploy
   - Visit: `https://SemperAdmin.github.io/marine-corps-directives-formatter/`

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Install dependencies
npm install

# Build and deploy
npm run deploy
```

## Configuration Details

### Next.js Configuration (`next.config.ts`)
- **basePath**: `/marine-corps-directives-formatter` (matches repository name)
- **assetPrefix**: Ensures assets load correctly on GitHub Pages
- **output**: `export` enables static site generation
- **images**: `unoptimized: true` for GitHub Pages compatibility

### Package.json Scripts
- `npm run build`: Creates optimized static build
- `npm run deploy`: Builds and deploys to GitHub Pages

## Important Notes

1. **Repository Name**: Update `repoName` in `next.config.ts` if repository name changes
2. **Base Path**: All internal links automatically use the correct base path
3. **Images**: Use embedded base64 images (like DoD seal) for best compatibility
4. **No Server Actions**: Static export doesn't support server-side features

## Troubleshooting

### Images Not Loading
- Ensure images are in `/public` folder
- Use embedded base64 for critical images
- Check browser console for 404 errors

### 404 Errors on Navigation
- Verify `basePath` matches repository name exactly
- Ensure trailing slashes in configuration

### Build Failures
- Check for server actions (`'use server'`)
- Remove dynamic imports that require server-side execution
- Verify all imports are client-compatible

## DoD Seal Fix

The DoD seal now uses embedded base64 SVG data, ensuring it works offline and in static deployments. The seal will appear properly in all generated documents.

## Live URL
Once deployed: `https://SemperAdmin.github.io/marine-corps-directives-formatter/`