// Note: This function is disabled for static export compatibility
// Use embedded base64 images instead for GitHub Pages deployment

export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  // For static export compatibility, we'll return a placeholder
  // In production, use embedded base64 images like in dod-seal.ts
  console.warn('fetchImageAsBase64 called but disabled for static export');
  throw new Error('fetchImageAsBase64 is disabled for static export. Use embedded base64 images instead.');
}
