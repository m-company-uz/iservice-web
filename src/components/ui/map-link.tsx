'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { detectPlatform, mapHref, webMapUrl, type MapTarget, type Platform } from '@/lib/maps';

/**
 * A link to a branch location that opens the visitor's own map app (see `lib/maps.ts`).
 * Server-rendered with the web link; the platform-specific href is swapped in after mount.
 */
export function MapLink({ target, className, children, ariaLabel }: {
  target: MapTarget;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
  }, []);

  // geo: and Apple Maps links hand off to an app; only the web map belongs in a new tab.
  const external = platform === 'other';
  return (
    <a
      href={platform === 'other' ? webMapUrl(target) : mapHref(target, platform)}
      className={className}
      aria-label={ariaLabel}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
