import type { Config } from 'tailwindcss';

/**
 * Design tokens from `reference_files/web/i-Service Site.dc.html` (DEVELOPMENT_PLAN §6).
 * These are the ONLY colours components may use — no arbitrary hex in class names.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    // Phone-first. The design draws 390 px and 1440 px; md/lg are where the layout changes.
    screens: {
      sm: '600px',
      md: '834px',
      lg: '1200px',
    },
    extend: {
      colors: {
        ink: '#111418', // primary text, step-rail active, focus outline
        night: { DEFAULT: '#0B0D10', 2: '#14171D' }, // header, hero, footer · image placeholder
        brand: {
          DEFAULT: '#E3232B', // CTA, step numbers, hours strip
          hover: '#B8161E',
          tint: '#FFF3F3', // selected card background
          soft: '#FF6B6B', // eyebrow on black (contrast, §11.3)
        },
        body: { DEFAULT: '#344054', soft: '#475467' },
        muted: '#667085',
        faint: '#98A2B3',
        line: { DEFAULT: '#E4E7EC', strong: '#D0D5DD' },
        surface: { DEFAULT: '#F7F8FA', 2: '#EEF0F4', 3: '#F2F4F7' },
        success: { DEFAULT: '#15803D', bg: '#DCFCE7' },
        danger: { DEFAULT: '#B42318', bg: '#FEF2F2', border: '#FECACA' },
      },
      fontFamily: {
        display: ['var(--font-unbounded)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        control: '12px', // inputs, buttons
        card: '16px',
        hero: '18px',
      },
      boxShadow: {
        cta: '0 10px 30px rgba(227,35,43,.34)',
        toast: '0 12px 32px rgba(16,24,40,.18)',
      },
      keyframes: {
        // transform/opacity only — GPU-composited, never layout (§11.2).
        'sheet-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'sheet-in': 'sheet-in 180ms ease-out',
        'toast-in': 'toast-in 220ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
