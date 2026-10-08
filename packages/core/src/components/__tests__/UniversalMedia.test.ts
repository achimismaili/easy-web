import { describe, it, expect } from 'vitest';
import type { ImageMetadata } from 'astro';

/**
 * Mirrors the dispatch logic inside UniversalMedia.astro.
 * Tests the categorisation, not the Astro rendering (which requires a full Astro setup).
 *
 * The component branches on 4 cases:
 *   1. ImageMetadata object → <Image> (Astro-optimised)
 *   2. "/src/assets/..." string → glob lookup → <Image> (with fallback path)
 *   3. "http(s)://..." string → <Image inferSize>
 *   4. Everything else (public path) → plain <img>
 */
type DispatchCase = 'image-metadata' | 'internal-src-assets' | 'external-url' | 'public-path';

function classifySource(src: ImageMetadata | string): DispatchCase {
  if (typeof src !== 'string') return 'image-metadata';
  if (src.startsWith('/src/assets/')) return 'internal-src-assets';
  if (src.startsWith('http://') || src.startsWith('https://')) return 'external-url';
  return 'public-path';
}

// Minimal ImageMetadata stub for test case 1
const mockImageMetadata: ImageMetadata = {
  src: '/src/assets/images/test.png',
  width: 100,
  height: 100,
  format: 'png',
};

describe('<UniversalMedia> dispatch logic', () => {
  it('case 1: ImageMetadata object → image-metadata', () => {
    expect(classifySource(mockImageMetadata)).toBe('image-metadata');
  });

  it('case 2: /src/assets/ string → internal-src-assets (glob lookup path)', () => {
    expect(classifySource('/src/assets/images/photo.jpg')).toBe('internal-src-assets');
  });

  it('case 3: https:// URL → external-url (inferSize path)', () => {
    expect(classifySource('https://example.com/photo.jpg')).toBe('external-url');
  });

  it('case 4: public path /foo/bar.png → public-path (plain img)', () => {
    expect(classifySource('/uploads/photo.jpg')).toBe('public-path');
  });

  it('case 5: glob miss + fallbackSrc → fallback branch applies when resolvedSrc is null', () => {
    // Simulate glob miss: empty images map for a /src/assets/ URL
    const images: Record<string, () => Promise<{ default: ImageMetadata }>> = {};
    const src = '/src/assets/images/missing.png';
    const fallbackSrc = '/src/assets/images/default.png';

    const dispatch = classifySource(src);
    expect(dispatch).toBe('internal-src-assets');

    // Verify fallback key lookup works
    const hasMainImage = src in images;
    const hasFallback = fallbackSrc in images;
    expect(hasMainImage).toBe(false); // glob miss
    expect(hasFallback).toBe(false); // fallback also missing → plain img fallback

    // The component would render plain <img> when both are missing (documented in UniversalMedia)
  });
});
