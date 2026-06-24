/**
 * Breakpoint values (Tailwind-compatible)
 *
 * These are raw pixel values, NOT CSS custom properties.
 * CSS custom properties cannot be used in @media queries directly.
 *
 * Usage:
 *   import { breakpoints } from '@itci/easy-web-theme-core';
 *   const isMobile = window.matchMedia(`(max-width: ${breakpoints.md}px)`).matches;
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;
