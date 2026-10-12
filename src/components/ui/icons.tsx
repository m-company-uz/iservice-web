import type { SVGProps } from 'react';

/** Inline icons: a handful of paths is lighter than an icon library (§11.2). */
type P = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const;
const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const ArrowUpRight = (p: P) => (
  <svg {...base} {...p}><path d="M7 17 17 7M8 7h9v9" {...stroke} /></svg>
);
export const ChevronLeft = (p: P) => (
  <svg {...base} {...p}><path d="m15 18-6-6 6-6" {...stroke} /></svg>
);
export const ChevronDown = (p: P) => (
  <svg {...base} {...p}><path d="m6 9 6 6 6-6" {...stroke} /></svg>
);
export const Check = (p: P) => (
  <svg {...base} {...p}><path d="M20 6 9 17l-5-5" {...stroke} strokeWidth={2.5} /></svg>
);
export const Close = (p: P) => (
  <svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" {...stroke} /></svg>
);
export const Menu = (p: P) => (
  <svg {...base} {...p}><path d="M4 8h16M4 16h16" {...stroke} /></svg>
);
export const Phone = (p: P) => (
  <svg {...base} {...p}>
    <path
      d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"
      {...stroke}
    />
  </svg>
);
export const Telegram = (p: P) => (
  <svg {...base} {...p}>
    <path d="m21.5 4.5-3.2 15.1c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.2-8.3c.4-.4-.1-.6-.6-.2L5.8 13.3 1 11.8c-1-.3-1-1 .2-1.5l18.8-7.2c.9-.3 1.6.2 1.5 1.4Z" fill="currentColor" />
  </svg>
);
/** The "!" that always accompanies an error, because error red is close to brand red (DEV 6). */
export const Alert = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M12 7v6" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
    <circle cx="12" cy="16.6" r="1.3" fill="#fff" />
  </svg>
);
export const Spinner = (p: P) => (
  <svg {...base} {...p} className={`animate-spin ${p.className ?? ''}`}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.3} strokeWidth={3} />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
  </svg>
);
