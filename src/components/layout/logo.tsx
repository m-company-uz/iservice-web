import Image from 'next/image';
import { cn } from '@/lib/cn';

/** The PNG logos from `reference_files/web/assets` (no SVG master exists yet — DEVELOPMENT_PLAN §6). */
export function Logo({ tone = 'light', gears = true, className, priority }: {
  tone?: 'light' | 'dark';
  gears?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const src = gears
    ? tone === 'light' ? '/images/brand/logo-gears-white.png' : '/images/brand/logo-gears.png'
    : '/images/brand/logo-plain-white.png';
  const [w, h] = gears ? [375, 108] : [369, 86];
  return (
    <Image
      src={src}
      alt="i-Service"
      width={w}
      height={h}
      unoptimized
      priority={priority}
      className={cn('w-auto', className)}
    />
  );
}
