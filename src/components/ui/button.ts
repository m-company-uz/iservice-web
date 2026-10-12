import { cn } from '@/lib/cn';

/**
 * Button looks as class strings, so the same look works on <button>, <a> and <Link> without a
 * client component. Variants from the design: red primary, outline on light, dark-outline on night.
 */
export type ButtonVariant = 'primary' | 'outline' | 'dark';
export type ButtonSize = 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-cta hover:bg-brand-hover active:bg-brand-hover disabled:bg-line-strong disabled:text-white disabled:shadow-none',
  outline: 'border border-line-strong bg-white text-ink hover:border-ink',
  dark: 'border border-white/20 bg-transparent text-white hover:border-white/60',
};

const sizes: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-[14.5px]',
  lg: 'h-[52px] px-7 text-[16px]',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-colors duration-150 disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    extra,
  );
}
