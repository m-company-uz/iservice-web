import { Manrope, Unbounded } from 'next/font/google';

/**
 * Variable fonts, self-hosted at build time: one file per family per subset, no request to
 * Google at runtime, and size-adjusted fallbacks so the swap doesn't move text (§11.2).
 */
// Headings are preloaded: Unbounded is so wide that swapping it in late reflows the H1
// (measured CLS 0.038 on /uz without the preload).
export const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  display: 'swap',
  preload: true,
});

// Body text is not preloaded: on slow 4G it would compete with the hero photo (the LCP element).
// Its size-adjusted fallback keeps the swap from moving anything (CLS stays 0).
export const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
  preload: false,
});
