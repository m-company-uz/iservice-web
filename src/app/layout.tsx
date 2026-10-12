import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };

/** `<html>` lives in `[locale]/layout.tsx` so `lang` is right; this only passes through. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
